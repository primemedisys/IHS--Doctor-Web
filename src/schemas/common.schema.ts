import { z } from "zod";

/**
 * Reusable Zod primitives composed by feature schemas — one definition of
 * "what a valid email/password/phone looks like" across every form.
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

/** Indian mobile number (10 digits, optional +91). */
export const phoneSchema = z
  .string()
  .regex(/^(\+91[-\s]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const requiredString = (label: string) =>
  z.string().min(1, `${label} is required`);

/** Shared pagination/sort params for list requests. */
export const listParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
