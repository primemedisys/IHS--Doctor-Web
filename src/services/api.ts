import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { API_ENDPOINTS } from "@/constants/api";
import { tokenStorage } from "@/utils/auth-token";
import type { AuthTokens } from "@/types/auth";

/**
 * The one Axios instance every service imports. Responsibilities:
 *  1. Attach the bearer access token to each request.
 *  2. On a 401, transparently refresh the token once and replay the request.
 *  3. Serialize concurrent 401s so we only refresh a single time (queueing).
 *
 * UI/service code never touches tokens or retry logic — it just calls
 * `api.get/post/...` and receives data or a normalized error.
 */
/** File uploads need minutes, not seconds, on a mobile uplink. See the request
 *  interceptor below for why this is separate from the default timeout. */
const UPLOAD_TIMEOUT_MS = 180_000;

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

/** Bare client for the refresh call — must NOT run the 401 interceptor. */
const refreshClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
  // A hung refresh must not outlive the server's 30s rotation grace (that
  // would look like token reuse and revoke every session of the user).
  timeout: 15_000,
});

// ---- Request: attach access token -------------------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  // FormData (file uploads) must carry the browser's own multipart Content-Type
  // WITH its boundary. The instance defaults to application/json, which would
  // clobber that boundary and make the backend see no file — drop it here so
  // the browser sets `multipart/form-data; boundary=…` itself.
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
    /*
     * Uploads get their OWN timeout, and it is the single biggest cause of
     * "Cannot reach the server" on a phone.
     *
     * The 20s default is right for a JSON call and hopeless for a file: a 10 MB
     * report over a typical mobile uplink (~0.5–1 Mbps) needs 80–160 seconds.
     * axios aborts at 20s with ECONNABORTED, which surfaces as status 0 — the
     * same shape as an unreachable server — so a perfectly healthy upload was
     * reported to the user as a dead backend.
     */
    config.timeout = UPLOAD_TIMEOUT_MS;
  }
  return config;
});

// ---- Response: refresh-on-401 with single-flight queueing --------------------
type RetriableConfig = InternalAxiosRequestConfig & {
  /** Set once a 401 has already triggered a refresh for this request. */
  _retry?: boolean;
  /** How many times this request has been replayed after a transport failure. */
  _netRetry?: number;
};

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

/** Wake every queued request with the new token (or null on failure). */
function flushQueue(token: string | null): void {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await refreshClient.post<{ data: AuthTokens }>(
      API_ENDPOINTS.auth.refresh,
      { refreshToken },
    );
    tokenStorage.setTokens(data.data);
    return data.data.accessToken;
  } catch (err) {
    const status = (err as AxiosError)?.response?.status;

    // Another TAB may have refreshed while this call was in flight — tabs share
    // one refresh token, so the loser of that race fails with a token that is
    // already superseded. If storage now holds a different token, the session is
    // alive and well; use it instead of tearing everything down.
    const current = tokenStorage.getRefreshToken();
    if (current && current !== refreshToken) {
      return tokenStorage.getAccessToken() ?? null;
    }

    // Only a genuine auth rejection ends the session. A 429, a 5xx or a dropped
    // connection says nothing about whether the refresh token is still valid —
    // clearing on those logged people out mid-use for a rate limit or a blip,
    // and the reload then showed the sign-in screen with no explanation.
    if (status === 401 || status === 403) {
      tokenStorage.clear();
    }
    return null;
  }
}


/* ------------------------------------------------------------------ *
 * Retry — for flaky mobile networks, and ONLY where it is safe.
 * ------------------------------------------------------------------ */

/**
 * Which requests may be retried automatically.
 *
 * SAFE METHODS ONLY. This is not a tuning choice, it is a correctness one: a
 * network error means the request may or may not have reached the server, and
 * retrying a POST that DID arrive books a second appointment, files a second
 * prescription, or charges a card twice. GET/HEAD/OPTIONS are side-effect free;
 * PUT/DELETE are idempotent by contract in this API (replace-the-set writes),
 * so replaying them lands on the same state.
 *
 * A 4xx/5xx is never retried here either — the server answered, and repeating
 * the call will get the same answer.
 */
const RETRY_METHODS = new Set(["get", "head", "options", "put", "delete"]);
const MAX_RETRIES = 2;

/** 400ms, 800ms — plus jitter, so a flapping connection doesn't sync every tab. */
const backoffMs = (attempt: number) => 400 * 2 ** attempt + Math.random() * 200;

/** A transport failure: no response at all, or the request timed out. */
function isTransportError(error: AxiosError): boolean {
  if (error.response) return false; // the server answered — not a transport problem
  if (error.code === "ERR_CANCELED") return false; // we aborted it on purpose
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    /*
     * Transport failure on a safe method → back off and try again.
     *
     * A phone switching cell towers, or moving between wifi and data, drops
     * in-flight requests for a second or two. Without this the user sees a hard
     * error for a blip that has already healed by the time they read it.
     */
    if (original && isTransportError(error)) {
      const method = (original.method ?? "get").toLowerCase();
      const attempt = original._netRetry ?? 0;
      // Never retry while the device knows it is offline — burning the budget
      // in an airplane-mode tunnel just delays the honest message.
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (online && RETRY_METHODS.has(method) && attempt < MAX_RETRIES) {
        original._netRetry = attempt + 1;
        await sleep(backoffMs(attempt));
        return api(original);
      }
    }

    // Only handle a genuine, first-time 401 on a real request.
    const isRefreshCall = original?.url?.includes(API_ENDPOINTS.auth.refresh);
    if (status !== 401 || !original || original._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    original._retry = true;

    // A refresh is already in progress — wait for it, then replay.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original.headers.set("Authorization", `Bearer ${token}`);
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      flushQueue(newToken);
      if (!newToken) return Promise.reject(error);
      original.headers.set("Authorization", `Bearer ${newToken}`);
      return api(original);
    } finally {
      isRefreshing = false;
    }
  },
);

/** Unwraps `{ data }` envelopes for services that want the payload directly. */
export async function requestData<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}
