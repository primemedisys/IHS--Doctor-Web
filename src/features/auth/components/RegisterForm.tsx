"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useForm, useWatch } from "react-hook-form";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { ROUTES } from "@/constants/routes";
import { useRegister } from "../hooks/useRegister";
import { registerSchema, type RegisterInput, type SignupRole } from "../schemas";
import { AuthDivider } from "./AuthDivider";
import { GoogleAuthButton } from "./GoogleAuthButton";

/**
 * Doctor signup. This is the practitioner portal, so the persona is fixed to
 * `doctor` — no patient path here. Only the account basics are collected; the
 * professional profile (specialty, registration number, clinics) is completed
 * later from the dashboard onboarding.
 */
export function RegisterForm() {
  const register = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /** The eye show/hide toggle rendered inside a password field (matches LoginForm). */
  const revealAdornment = (shown: boolean, toggle: () => void) => ({
    input: {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            aria-label={shown ? "Hide password" : "Show password"}
            onClick={toggle}
            edge="end"
          >
            {shown ? <FiEyeOff /> : <FiEye />}
          </IconButton>
        </InputAdornment>
      ),
    },
  });

  const methods = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "doctor",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as boolean,
    },
  });

  const acceptTerms = useWatch({ control: methods.control, name: "acceptTerms" });
  const termsError = methods.formState.errors.acceptTerms?.message;

  return (
    <FormContainer methods={methods} onSubmit={(values) => register.mutate(values)}>
      <Stack spacing={2.5}>
        <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
          After signing up you&apos;ll add your specialty, registration number and clinics
          from your dashboard — then our team verifies your profile.
        </Alert>

        <GoogleAuthButton role="doctor" text="signup_with" fallbackLabel="Sign up with Google" />
        <AuthDivider label="or sign up with email" />

        <RHFTextField<RegisterInput> name="name" label="Full name" autoComplete="name" />
        <RHFTextField<RegisterInput> name="email" label="Email" type="email" autoComplete="email" />
        <RHFTextField<RegisterInput>
          name="phone"
          label="Mobile number (optional)"
          type="tel"
          autoComplete="tel"
        />

        <RHFTextField<RegisterInput>
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          helperText="At least 8 characters, one uppercase and one number"
          slotProps={revealAdornment(showPassword, () => setShowPassword((v) => !v))}
        />
        <RHFTextField<RegisterInput>
          name="confirmPassword"
          label="Confirm password"
          type={showConfirm ? "text" : "password"}
          autoComplete="new-password"
          slotProps={revealAdornment(showConfirm, () => setShowConfirm((v) => !v))}
        />

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => methods.setValue("acceptTerms", e.target.checked, { shouldValidate: true })}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                I agree to the Terms of Service and Privacy Policy
              </Typography>
            }
          />
          {termsError && <FormHelperText error>{termsError}</FormHelperText>}
        </Box>

        <Button type="submit" size="large" variant="contained" loading={register.isPending} fullWidth>
          Create doctor account
        </Button>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          Already have an account?{" "}
          <Link component={NextLink} href={ROUTES.auth.login}>
            Sign in
          </Link>
        </Typography>
      </Stack>
    </FormContainer>
  );
}

export type { SignupRole };
