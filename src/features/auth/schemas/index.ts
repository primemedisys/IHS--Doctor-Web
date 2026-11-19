import { z } from "zod";
import { emailSchema, passwordSchema, phoneSchema, requiredString } from "@/schemas/common.schema";

/** Roles a visitor can self-register as (backend SELF_REGISTERABLE_ROLES). */
export const signupRoles = ["patient", "doctor"] as const;
export type SignupRole = (typeof signupRoles)[number];

/**
 * Sign-in contract. No persona here — the account's role comes back from the
 * backend and decides which dashboard the user lands on. `remember` is always
 * supplied via defaultValues so it stays a plain boolean (a zod default would
 * split input/output types and fight React Hook Form's single generic).
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString("Password"),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Doctor sign-in: ONE field that takes the registered email OR 10-digit mobile.
 * (The admin form keeps the email-only `loginSchema` above.)
 */
export const doctorLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or mobile number")
    .refine((v) => parseLoginIdentifier(v) !== null, {
      message: "Enter a valid email or 10-digit mobile number",
    }),
  password: requiredString("Password"),
  remember: z.boolean(),
});
export type DoctorLoginInput = z.infer<typeof doctorLoginSchema>;

/** What the backend's POST /auth/login takes: exactly one of email / phone. */
export type LoginCredentials = ({ email: string; phone?: never } | { phone: string; email?: never }) & {
  password: string;
};

/**
 * Indian mobile → its 10 digits, or null. Accepts "98765 43210", "98765-43210",
 * "+91 9876543210", "09876543210"; the backend normalises the same way and
 * compares against the stored number's last 10 digits (same as the patient app).
 */
export function normalizeMobile(raw: string): string | null {
  let d = raw.replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) {
    if (!d.startsWith("+91")) return null;
    d = d.slice(3);
  } else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** Anything with "@" is an email (validated as one); anything else must be a mobile number. */
export function parseLoginIdentifier(raw: string): { email: string } | { phone: string } | null {
  const v = raw.trim();
  if (v.includes("@")) {
    return emailSchema.safeParse(v).success ? { email: v.toLowerCase() } : null;
  }
  const phone = normalizeMobile(v);
  return phone ? { phone } : null;
}

/** Where a reset code goes: exactly one of the registered email / mobile. */
export type OtpTarget = { email: string; phone?: never } | { phone: string; email?: never };

/** Forgot password by OTP, step 1: the registered email OR 10-digit mobile. */
export const otpIdentifierSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your registered email or mobile number")
    .refine((v) => parseLoginIdentifier(v) !== null, {
      message: "Enter a valid email or 10-digit mobile number",
    }),
});
export type OtpIdentifierInput = z.infer<typeof otpIdentifierSchema>;

/** Step 2: the 6-digit code. */
export const otpCodeSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type OtpCodeInput = z.infer<typeof otpCodeSchema>;

/** Step 3: the new password (same strength policy as signup). */
export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: requiredString("Confirm password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/**
 * Registration contract — the ONE place we ask for the persona. It maps 1:1
 * to `POST /auth/register` ({ name, email, phone?, password, role });
 * doctor professional details (specialty, registration number, clinics…) are
 * completed later from the dashboard, per PRD 4.4's multi-step onboarding.
 */
export const registerSchema = z
  .object({
    role: z.enum(signupRoles),
    name: requiredString("Full name").min(2, "Name is too short"),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: requiredString("Confirm password"),
    acceptTerms: z.boolean().refine((v) => v, { message: "Please accept the terms to continue" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Forgot-password: just the account email. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Reset-password: the token arrives via the emailed link (?token=…). */
export const resetPasswordSchema = z
  .object({
    token: requiredString("Reset token"),
    password: passwordSchema,
    confirmPassword: requiredString("Confirm password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Own-profile update (PATCH /auth/profile). */
export const updateProfileSchema = z.object({
  name: requiredString("Full name").min(2, "Name is too short"),
  phone: phoneSchema.optional().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
