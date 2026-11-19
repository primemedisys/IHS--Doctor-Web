"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useMutation } from "@tanstack/react-query";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { ROUTES } from "@/constants/routes";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error";
import {
  newPasswordSchema,
  otpCodeSchema,
  otpIdentifierSchema,
  parseLoginIdentifier,
  type NewPasswordInput,
  type OtpCodeInput,
  type OtpIdentifierInput,
  type OtpTarget,
} from "../schemas";

type Stage = "identify" | "code" | "password" | "done";
const STEPS: Stage[] = ["identify", "code", "password"];
/** Matches the backend's PASSWORD_OTP_RESEND_SECONDS default. */
const RESEND_SECONDS = 60;

/** Read the `{ error: { code } }` code off an axios error, if present. */
function errorCode(error: unknown): string | undefined {
  return (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
}

/** "******3210" / "d***@example.com" — enough to recognise, not to read off a screen. */
function maskTarget(t: OtpTarget | null): string {
  if (!t) return "";
  if (t.phone) return `******${t.phone.slice(-4)}`;
  const [local, domain] = (t.email ?? "").split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}

/**
 * Forgot password by OTP: registered email OR mobile → 6-digit code → new
 * password.
 *
 * Step 1 answers the same way whether or not the account exists (the backend
 * never says), so the copy says "if". The one honest exception is a channel
 * that isn't set up (SMS_UNAVAILABLE / EMAIL_UNAVAILABLE), shown as an error
 * instead of pretending a code is on its way. A verified code yields a
 * single-use reset token, spent on the existing reset endpoint, which also
 * signs the doctor out everywhere.
 */
export function OtpResetForm({ onUseLink }: { onUseLink: () => void }) {
  const [stage, setStage] = useState<Stage>("identify");
  const [target, setTarget] = useState<OtpTarget | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const idForm = useForm<OtpIdentifierInput>({ resolver: zodResolver(otpIdentifierSchema), defaultValues: { identifier: "" } });
  const codeForm = useForm<OtpCodeInput>({ resolver: zodResolver(otpCodeSchema), defaultValues: { otp: "" } });
  const passwordForm = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const requestCode = useMutation({
    mutationFn: (t: OtpTarget) => authService.requestPasswordOtp(t),
    onMutate: () => setChannelError(null),
    onSuccess: (_, t) => {
      setTarget(t);
      setStage("code");
      setCooldown(RESEND_SECONDS);
      codeForm.reset({ otp: "" });
    },
    onError: (error) => setChannelError(getErrorMessage(error)),
  });

  const verifyCode = useMutation({
    mutationFn: (otp: string) => {
      if (!target) throw new Error("Start again with your email or mobile number.");
      return authService.verifyPasswordOtp(target, otp);
    },
    onSuccess: ({ resetToken: token }) => {
      setResetToken(token);
      setStage("password");
    },
    onError: (error) => {
      codeForm.setError("otp", { message: getErrorMessage(error) });
      // A shared number can't pick one account — the message says to use email.
      if (errorCode(error) === "PHONE_SHARED") setChannelError(getErrorMessage(error));
    },
  });

  const resetPassword = useMutation({
    mutationFn: (values: NewPasswordInput) => authService.resetPassword({ token: resetToken, password: values.password }),
    onSuccess: () => setStage("done"),
    onError: (error) => passwordForm.setError("password", { message: getErrorMessage(error) }),
  });

  const byEmail = !!target?.email;

  if (stage === "done") {
    return (
      <Stack spacing={2}>
        <Alert severity="success" variant="outlined">
          Your password has been updated. For your security, you&apos;ve been signed out on every device.
        </Alert>
        <Button component={NextLink} href={ROUTES.auth.login} variant="contained" size="large" fullWidth>
          Sign in with your new password
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stepper activeStep={STEPS.indexOf(stage)} alternativeLabel sx={{ "& .MuiStepLabel-label": { fontSize: 12 } }}>
        <Step><StepLabel>Your account</StepLabel></Step>
        <Step><StepLabel>Verify code</StepLabel></Step>
        <Step><StepLabel>New password</StepLabel></Step>
      </Stepper>

      {channelError && (
        <Alert severity="error" variant="outlined">
          {channelError}
        </Alert>
      )}

      {stage === "identify" && (
        <FormContainer
          methods={idForm}
          onSubmit={(v) => {
            const t = parseLoginIdentifier(v.identifier);
            if (t) requestCode.mutate(t as OtpTarget);
          }}
        >
          <Stack spacing={2}>
            <RHFTextField<OtpIdentifierInput>
              name="identifier"
              label="Registered email or mobile number"
              placeholder="doctor@example.com or 9876543210"
              autoComplete="username"
              autoFocus
            />
            <Button type="submit" size="large" variant="contained" loading={requestCode.isPending} fullWidth>
              Send verification code
            </Button>
          </Stack>
        </FormContainer>
      )}

      {stage === "code" && (
        <FormContainer methods={codeForm} onSubmit={(v) => verifyCode.mutate(v.otp)}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              If {maskTarget(target)} belongs to a doctor account, we&apos;ve sent a 6-digit code {byEmail ? "by email" : "by SMS"}.
              The code expires in 10 minutes.
            </Typography>
            <RHFTextField<OtpCodeInput>
              name="otp"
              label="Verification code"
              placeholder="6-digit code"
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              slotProps={{ htmlInput: { maxLength: 6, style: { letterSpacing: "0.4em", fontWeight: 700 } } }}
            />
            <Button type="submit" size="large" variant="contained" loading={verifyCode.isPending} fullWidth>
              Verify code
            </Button>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Link component="button" type="button" variant="body2" onClick={() => setStage("identify")}>
                Change {byEmail ? "email" : "number"}
              </Link>
              <Button
                size="small"
                disabled={cooldown > 0 || requestCode.isPending || !target}
                onClick={() => target && requestCode.mutate(target)}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Button>
            </Stack>
          </Stack>
        </FormContainer>
      )}

      {stage === "password" && (
        <FormContainer methods={passwordForm} onSubmit={(v) => resetPassword.mutate(v)}>
          <Stack spacing={2}>
            <RHFTextField<NewPasswordInput>
              name="password"
              label="New password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              helperText="At least 8 characters, with an uppercase letter and a number."
              autoFocus
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <RHFTextField<NewPasswordInput>
              name="confirmPassword"
              label="Confirm new password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
            />
            <Button type="submit" size="large" variant="contained" loading={resetPassword.isPending} fullWidth>
              Update password
            </Button>
          </Stack>
        </FormContainer>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
        <Link component="button" type="button" onClick={onUseLink}>
          Email me a reset link instead
        </Link>
        {" · "}
        <Link component={NextLink} href={ROUTES.auth.login}>
          Back to sign in
        </Link>
      </Typography>
    </Stack>
  );
}
