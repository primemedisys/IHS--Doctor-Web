import Cookies from "js-cookie";
import {
  ACCESS_TOKEN_MAX_AGE_DAYS,
  REFRESH_TOKEN_MAX_AGE_DAYS,
  STORAGE_KEYS,
} from "@/constants/storage";
import { env } from "@/config/env";
import type { AuthTokens } from "@/types/auth";

/**
 * Single gateway for auth tokens. Cookies (not localStorage) so Next.js
 * middleware / SSR can read the access token for route protection.
 * For hardened setups, issue the refresh token as an HttpOnly cookie from the
 * backend and drop it here.
 *
 * `domain` is set to the shared parent domain (NEXT_PUBLIC_COOKIE_DOMAIN) so
 * a session started on one of the 3 apps (patient/doctor/admin) is visible
 * to the others — that's what makes them feel like a single application.
 */
const cookieOptions: Cookies.CookieAttributes = {
  sameSite: "lax",
  secure: typeof window !== "undefined" && window.location.protocol === "https:",
  path: "/",
  domain: env.cookieDomain || undefined,
};

export const tokenStorage = {
  getAccessToken: (): string | undefined => Cookies.get(STORAGE_KEYS.accessToken),
  getRefreshToken: (): string | undefined => Cookies.get(STORAGE_KEYS.refreshToken),

  setTokens: ({ accessToken, refreshToken }: AuthTokens): void => {
    Cookies.set(STORAGE_KEYS.accessToken, accessToken, { ...cookieOptions, expires: ACCESS_TOKEN_MAX_AGE_DAYS });
    Cookies.set(STORAGE_KEYS.refreshToken, refreshToken, { ...cookieOptions, expires: REFRESH_TOKEN_MAX_AGE_DAYS });
  },

  clear: (): void => {
    Cookies.remove(STORAGE_KEYS.accessToken, { path: "/", domain: env.cookieDomain || undefined });
    Cookies.remove(STORAGE_KEYS.refreshToken, { path: "/", domain: env.cookieDomain || undefined });
  },
};
