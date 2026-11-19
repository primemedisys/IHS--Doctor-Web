"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { CustomCursor } from "@/components/common/CustomCursor";
import { OfflineBanner } from "@/components/feedback";
import { env } from "@/config/env";
import { AppThemeProvider } from "@/theme/ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { QueryProvider } from "./QueryProvider";

/**
 * Wraps children in GoogleOAuthProvider only when a client id is configured, so
 * the Google Identity script is never loaded on servers where sign-in is off.
 */
function GoogleProvider({ children }: { children: ReactNode }) {
  if (!env.isGoogleEnabled) return <>{children}</>;
  return <GoogleOAuthProvider clientId={env.googleClientId}>{children}</GoogleOAuthProvider>;
}

/**
 * The single client provider stack for the whole app. Order matters:
 *   QueryProvider    -> server-state cache (AuthProvider reads it)
 *   AppThemeProvider -> MUI theme + CssBaseline + global styles
 *   AuthProvider     -> current-user context
 *   GoogleProvider   -> Google Identity (only when configured)
 * Sonner's <Toaster> lives here so any component can `toast(...)`.
 * MotionConfig makes every framer-motion animation honour the OS
 * "reduce motion" setting app-wide; CustomCursor is the desktop-only cursor.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AppThemeProvider>
        <MotionConfig reducedMotion="user">
        <AuthProvider>
          <GoogleProvider>{children}</GoogleProvider>
          <CustomCursor />
          <Toaster richColors closeButton position="top-right" theme="system" />
          {/* One per app, beside the Toaster: being offline is a STATE,
              not an event, so it needs a bar that persists rather than a
              toast that expires while the condition is still true. */}
          <OfflineBanner />
        </AuthProvider>
        </MotionConfig>
      </AppThemeProvider>
    </QueryProvider>
  );
}
