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
import { useLogin } from "../hooks/useLogin";
import { doctorLoginSchema, parseLoginIdentifier, type DoctorLoginInput } from "../schemas";
import { AuthDivider } from "./AuthDivider";
import { GoogleAuthButton } from "./GoogleAuthButton";

/**
 * Sign in with the registered email OR 10-digit mobile + password. The backend
 * checks the role (audience "doctor"): a patient/vendor/admin account can never
 * get a doctor session from this form.
 */
export function LoginForm() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const methods = useForm<DoctorLoginInput>({
    resolver: zodResolver(doctorLoginSchema),
    defaultValues: { identifier: "", password: "", remember: false as boolean },
  });

  const submit = (values: DoctorLoginInput) => {
    // The schema already proved this parses; normalised to exactly one of email / phone.
    const id = parseLoginIdentifier(values.identifier);
    if (id) login.mutate({ ...id, password: values.password });
  };

  return (
    <FormContainer methods={methods} onSubmit={submit}>
      <Stack spacing={2.5}>
        <GoogleAuthButton role="doctor" text="signin_with" fallbackLabel="Sign in with Google" />
        <AuthDivider label="or sign in with email / mobile" />

        <RHFTextField<DoctorLoginInput>
          name="identifier"
          label="Email or mobile number"
          placeholder="doctor@example.com or 9876543210"
          autoComplete="username"
          autoFocus
        />
        <RHFTextField<DoctorLoginInput>
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
          Sign in
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          Don&apos;t have an account?{" "}
          <Link component={NextLink} href={ROUTES.auth.register}>
            Create one
          </Link>
        </Typography>
      </Stack>
    </FormContainer>
  );
}
