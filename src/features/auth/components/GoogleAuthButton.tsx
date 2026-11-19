"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useColorScheme } from "@mui/material/styles";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { env } from "@/config/env";
import type { RegisterableRole } from "@/types/auth";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

// Google's Identity button renders in an iframe and only accepts a fixed pixel
// width (max 400) — it can't be CSS-stretched to 100%. We measure the container
// and pass its width so the button lines up flush with the full-width fields.
const GOOGLE_BTN_MAX = 400;

export interface GoogleAuthButtonProps {
  /**
   * Persona to create the account as, when this is a brand-new Google signup.
   * Pass "doctor"/"patient" on the register screen; omit on the sign-in screen
   * (an existing account keeps its role; the backend ignores it there).
   */
  role?: RegisterableRole;
  /** Button label variant for the real Google button. */
  text?: "signin_with" | "signup_with" | "continue_with";
  /** Label for the placeholder button shown when Google isn't configured yet. */
  fallbackLabel?: string;
}

/**
 * Google Identity button.
 *
 * - When a client id is configured (env.isGoogleEnabled) it renders Google's
 *   real Identity button, which returns a `credential` we POST to /auth/google.
 * - When it isn't, it renders a styled placeholder that looks like the real
 *   thing but explains, on click, that Google sign-in needs a client id. This
 *   keeps the feature visible in the UI and upgrades to the live button the
 *   moment NEXT_PUBLIC_GOOGLE_CLIENT_ID (and the backend GOOGLE_CLIENT_ID) are set.
 */
export function GoogleAuthButton({ role, text = "continue_with", fallbackLabel = "Continue with Google" }: GoogleAuthButtonProps) {
  const googleAuth = useGoogleAuth();
  const { mode, systemMode } = useColorScheme();

  // Track the container width so Google's fixed-width button can match it.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [btnWidth, setBtnWidth] = useState(GOOGLE_BTN_MAX);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setBtnWidth(Math.min(GOOGLE_BTN_MAX, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!env.isGoogleEnabled) {
    return (
      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="inherit"
        startIcon={<FcGoogle size={20} />}
        onClick={() =>
          toast.info(
            "Google sign-in isn't configured yet. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID (frontend) and GOOGLE_CLIENT_ID (backend) to enable it.",
          )
        }
        sx={{ borderColor: "divider", color: "text.primary", fontWeight: 600, py: 1.1 }}
      >
        {fallbackLabel}
      </Button>
    );
  }

  const resolved = mode === "system" ? systemMode : mode;

  return (
    <Box ref={wrapRef} sx={{ width: "100%", display: "flex", justifyContent: "center", "& > div": { colorScheme: "light" } }}>
      <GoogleLogin
        onSuccess={(cred) => {
          if (!cred.credential) {
            toast.error("Google did not return a credential. Please try again.");
            return;
          }
          googleAuth.mutate({ credential: cred.credential, role });
        }}
        onError={() => toast.error("Google sign-in was cancelled or failed.")}
        theme={resolved === "dark" ? "filled_black" : "outline"}
        text={text}
        shape="rectangular"
        width={String(btnWidth)}
        useOneTap={false}
      />
    </Box>
  );
}
