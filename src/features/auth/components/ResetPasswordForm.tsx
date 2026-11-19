"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { ROUTES } from "@/constants/routes";
import { useResetPassword } from "../hooks/useResetPassword";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";

/**
 * Sets a new password using the single-use token from the emailed link.
 * On success the backend also revokes every existing session for the account.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const reset = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);

  const methods = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="error" variant="outlined">
          This reset link is missing its token. Open the link from your email again, or
          request a new one.
        </Alert>
        <Button component={NextLink} href={ROUTES.auth.forgotPassword} size="large" variant="contained" fullWidth>
          Request a new link
        </Button>
      </Stack>
    );
  }

  return (
    <FormContainer methods={methods} onSubmit={(values) => reset.mutate(values)}>
      <Stack spacing={2.5}>
        <RHFTextField<ResetPasswordInput>
          name="password"
          label="New password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          autoFocus
          helperText="At least 8 characters, one uppercase and one number"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <RHFTextField<ResetPasswordInput>
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />

        <Button type="submit" size="large" variant="contained" loading={reset.isPending} fullWidth>
          Set new password
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          Link expired?{" "}
          <Link component={NextLink} href={ROUTES.auth.forgotPassword}>
            Request a new one
          </Link>
        </Typography>
      </Stack>
    </FormContainer>
  );
}
