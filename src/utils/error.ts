import { AxiosError } from "axios";
import type { ApiError } from "@/types/common";

/**
 * Backend failure envelope (see backend middlewares/errorHandler.js):
 *   { error: { message, code?, details? } }
 * `details` maps field name → array of validation messages.
 */
interface BackendErrorBody {
  error?: {
    message?: string;
    code?: string;
    details?: Record<string, string[]>;
  };
  /** Legacy/loose payloads some proxies produce. */
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Collapse any thrown value into our normalized `ApiError`. Use this in
 * catch blocks and React Query `onError` so UI code deals with one shape.
 */
/**
 * What a status-0 failure actually was.
 *
 * axios reports "no response" for four different situations and they need four
 * different sentences — "Cannot reach the server" for all of them sent people
 * to check a backend that was fine. In particular a TIMEOUT on a slow upload
 * looked identical to a dead server.
 */
function transportMessage(error: AxiosError): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You're offline. Check your connection and try again.";
  }
  if (error.code === "ECONNABORTED" || /timeout/i.test(error.message)) {
    return "That took too long. Your connection may be slow — please try again.";
  }
  if (error.code === "ERR_CANCELED") return "Request cancelled.";
  return "Cannot reach the server. Please try again.";
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data as BackendErrorBody | undefined;
    const message =
      payload?.error?.message ??
      payload?.message ??
      (status === 0 ? transportMessage(error) : error.message) ??
      "Request failed";
    return {
      status,
      message,
      errors: payload?.error?.details ?? payload?.errors,
    };
  }

  if (error instanceof Error) {
    return { status: 0, message: error.message };
  }

  return { status: 0, message: "An unexpected error occurred" };
}

/** Convenience: the human-readable message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}
