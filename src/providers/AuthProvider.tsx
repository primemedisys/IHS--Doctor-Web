"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ROUTES } from "@/constants/routes";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/utils/auth-token";
import type { User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Signed in, but the server isn't answering yet (rate limit / outage) — retrying. */
  isReconnecting: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
/**
 * Whether a failed /auth/me means the session is really over. Only an auth
 * rejection does: a 403, or a 401 after the refresh interceptor has already
 * dropped the refresh token (it clears it only on a 401/403 from /auth/refresh).
 * A 429, a 5xx or a network error says nothing about the session — clearing on
 * those is what logged doctors out whenever the dev rate limit was hit.
 */
function sessionRejected(err: unknown): boolean {
  const e = err as { response?: { status?: number }; status?: number };
  const status = e?.response?.status ?? e?.status;
  if (status === 403) return true;
  return status === 401 && !tokenStorage.getRefreshToken();
}


/**
 * Holds the current user and bootstraps it from the access-token cookie.
 * Route protection is handled at the routing layer; this context drives UI
 * (greeting, avatar, role gates). JWT-ready but tolerant of a missing backend
 * during the dummy-data MVP.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      // A lone refresh token is enough: /auth/me will 401 and the axios
      // interceptor will rotate it into a fresh pair transparently.
      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        setIsLoading(false);
        return;
      }
      for (let attempt = 0; active; attempt++) {
        try {
          const me = await authService.me();
          if (active) setUser(me);
          break;
        } catch (err) {
          if (sessionRejected(err)) {
            tokenStorage.clear();
            break;
          }
          // 429 / 5xx / offline: the session is fine, the server just isn't
          // answering. Keep the cookies (they are shared with the other IHS apps)
          // and try again, backing off up to 30s.
          if (active) setIsReconnecting(true);
          await new Promise((r) => setTimeout(r, Math.min(30_000, 2_000 * 2 ** attempt)));
        }
      }
      if (active) {
        setIsReconnecting(false);
        setIsLoading(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    queryClient.clear();
    router.replace(ROUTES.auth.login);
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, isReconnecting, setUser, logout }),
    [user, isLoading, isReconnecting, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
