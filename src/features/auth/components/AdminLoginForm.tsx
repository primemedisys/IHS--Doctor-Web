"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useAdminLogin } from "../hooks/useAdminLogin";
import { loginSchema, type LoginInput } from "../schemas";

/**
 * Administrator sign-in. Hits the dedicated /auth/admin/login endpoint —
 * doctor/patient credentials are rejected there, and there is no signup:
 * the single admin account is seeded from the backend's .env.
 */
export function AdminLoginForm() {
  const login = useAdminLogin();
  const [showPassword, setShowPassword] = useState(false);

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false as boolean },
  });

  return (
    <FormContainer methods={methods} onSubmit={(values) => login.mutate(values)}>
      <Stack spacing={2.5}>
        <RHFTextField<LoginInput> name="email" label="Admin email" type="email" autoComplete="email" autoFocus />
        <RHFTextField<LoginInput>
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
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

        <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
          <Link component={NextLink} href={ROUTES.auth.forgotPassword} variant="body2">
            Forgot password?
          </Link>
        </Stack>

        <Button type="submit" size="large" variant="contained" loading={login.isPending} fullWidth>
          Sign in to admin panel
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          Not an administrator?{" "}
          <Link component={NextLink} href={ROUTES.auth.login}>
            Go to user sign in
          </Link>
        </Typography>
      </Stack>
    </FormContainer>
  );
}
