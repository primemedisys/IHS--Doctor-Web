"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useForm } from "react-hook-form";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { ROUTES } from "@/constants/routes";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";

/** Sends the reset link via POST /auth/forgot-password (no user enumeration). */
export function ForgotPasswordForm() {
  const forgot = useForgotPassword();

  const methods = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <FormContainer methods={methods} onSubmit={(values) => forgot.mutate(values)}>
      <Stack spacing={2.5}>
        {forgot.isSuccess && (
          <Alert severity="success" variant="outlined">
            If that email is registered, a reset link is on its way. Check your inbox
            (and spam folder) — the link expires in about 45 minutes.
          </Alert>
        )}

        <RHFTextField<ForgotPasswordInput>
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
        />

        <Button type="submit" size="large" variant="contained" loading={forgot.isPending} fullWidth>
          {forgot.isSuccess ? "Resend reset link" : "Send reset link"}
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          Remembered it?{" "}
          <Link component={NextLink} href={ROUTES.auth.login}>
            Back to sign in
          </Link>
        </Typography>
      </Stack>
    </FormContainer>
  );
}
