import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Reset Password" };

/** Landing page for the emailed reset link (/reset-password?token=…). */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Choose a new password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You&apos;ll be signed out everywhere once it&apos;s changed.
        </Typography>
      </Stack>
      <ResetPasswordForm token={token ?? ""} />
    </Stack>
  );
}
