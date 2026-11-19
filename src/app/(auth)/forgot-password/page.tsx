import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { ForgotPasswordPanel } from "@/features/auth";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Reset your password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your registered email or mobile number and we&apos;ll send you a 6-digit verification code.
        </Typography>
      </Stack>
      <ForgotPasswordPanel />
    </Stack>
  );
}
