import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in to manage your practice and appointments.
        </Typography>
      </Stack>
      <LoginForm />
    </Stack>
  );
}
