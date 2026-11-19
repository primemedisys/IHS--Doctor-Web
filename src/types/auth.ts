import type { BaseEntity } from "./common";

export type UserRole = "admin" | "doctor" | "patient" | "staff";

/** Roles a visitor can pick for themselves (self-registration + Google signup). */
export type RegisterableRole = Extract<UserRole, "doctor" | "patient">;

/**
 * Payload for POST /auth/google. `credential` is the Google Identity ID token;
 * `role` is only required when the account is brand-new (a Google signup) and
 * is ignored by the backend for an existing account.
 */
export interface GoogleAuthInput {
  credential: string;
  role?: RegisterableRole;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
}

/** Token pair returned by login/refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Decoded JWT access-token claims we rely on. */
export interface JwtClaims {
  sub: string;
  email: string;
  name?: string;
  role: UserRole;
  /** Expiry, seconds since epoch. */
  exp: number;
  iat: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}
