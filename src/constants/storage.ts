/**
 * Names for anything we persist client-side (cookies / storage).
 * Centralized so token handling and the middleware read identical keys.
 */
export const STORAGE_KEYS = {
  accessToken: "ihs_access_token",
  refreshToken: "ihs_refresh_token",
} as const;

/** Access-token cookie lifetime (days) — short; refresh handles longevity. */
export const ACCESS_TOKEN_MAX_AGE_DAYS = 1;
/** Refresh-token cookie lifetime (days). */
export const REFRESH_TOKEN_MAX_AGE_DAYS = 30;
