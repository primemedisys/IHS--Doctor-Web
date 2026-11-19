import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth";

export const metadata: Metadata = { title: "Sign Up" };

export default function RegisterPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Create your account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set up your profile and start seeing patients in minutes.
        </Typography>
      </Stack>
      <RegisterForm />
    </Stack>
  );
}
