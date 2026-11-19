"use client";

import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { OtpResetForm } from "./OtpResetForm";

/**
 * Forgot password. Default: a 6-digit code to the doctor's registered email OR
 * mobile (one field, either value). Fallback: the existing emailed reset link.
 * Both end at the same backend reset endpoint.
 */
export function ForgotPasswordPanel() {
  const [mode, setMode] = useState<"code" | "link">("code");
  if (mode === "code") return <OtpResetForm onUseLink={() => setMode("link")} />;
  return (
    <Stack spacing={2.5}>
      <ForgotPasswordForm />
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
        <Link component="button" type="button" onClick={() => setMode("code")}>
          Use a verification code instead
        </Link>
      </Typography>
    </Stack>
  );
}
