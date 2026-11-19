import { jwtDecode } from "jwt-decode";
import type { JwtClaims } from "@/types/auth";

/** Safely decode a JWT's claims; returns null on malformed input. */
export function decodeToken(token: string): JwtClaims | null {
  try {
    return jwtDecode<JwtClaims>(token);
  } catch {
    return null;
  }
}

/** True if the token is missing, unparseable, or expires within `leewaySeconds`. */
export function isTokenExpired(token: string | undefined, leewaySeconds = 30): boolean {
  if (!token) return true;
  const claims = decodeToken(token);
  if (!claims?.exp) return true;
  return claims.exp - leewaySeconds <= Math.floor(Date.now() / 1000);
}
