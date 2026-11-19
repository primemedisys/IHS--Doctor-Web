import { z } from "zod";
import { requiredString } from "@/schemas/common.schema";

/**
 * One Zod schema per onboarding/editor step form, matching the backend Joi
 * validators (doctor.validator.js). Numeric fields are kept as STRINGS here
 * (RHF/MUI number inputs produce strings) and validated by refinement, so the
 * schema's input and output types stay identical — that keeps the shared
 * `FormContainer`/`RHFTextField` single-generic wiring type-clean. The service
 * layer converts to numbers before hitting the API.
 */

/** Required integer-in-range on a string field. */
const intField = (label: string, min: number, max: number) =>
  z.string().refine(
    (v) => {
      const n = Number(v);
      return v.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
    },
    `${label} must be a whole number between ${min} and ${max}`,
  );

/** Optional integer-in-range: empty string is allowed. */
const optionalIntField = (label: string, min: number, max: number) =>
  z
    .string()
    .refine(
      (v) => {
        if (v.trim() === "") return true;
        const n = Number(v);
        return Number.isInteger(n) && n >= min && n <= max;
      },
      `${label} must be a whole number between ${min} and ${max}`,
    )
    .optional();

export const professionalSchema = z.object({
  qualification: requiredString("Qualification").max(255),
  registrationNumber: requiredString("Registration number").max(100),
  experienceYears: intField("Experience", 0, 80),
  bio: z.string().max(5000).optional().or(z.literal("")),
  onlineFee: z
    .string()
    .refine((v) => v.trim() === "" || Number(v) >= 0, "Enter a valid fee")
    .optional(),
  // ── Portfolio v2 hero / about / contact (required core: headline + gender) ──
  headline: requiredString("Tagline").max(160),
  gender: z.enum(["male", "female", "other"]),
  practicePhilosophy: z.string().max(1000).optional().or(z.literal("")),
  publicPhone: z.string().max(20).optional().or(z.literal("")),
  publicEmail: z
    .string()
    .refine((v) => v.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email")
    .optional(),
  // ── About section extras (migration 049) ──
  shortIntro: z.string().max(500, "Keep the introduction under 500 characters").optional(),
  careerSummary: z.string().max(2000, "Keep the career summary under 2000 characters").optional(),
});
export type ProfessionalInput = z.infer<typeof professionalSchema>;

/** Optional free text (blank allowed). */
const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));

/** Optional http(s) link. */
const optionalUrl = () =>
  z
    .string()
    .max(300)
    .refine((v) => v.trim() === "" || /^https?:\/\/\S+$/.test(v.trim()), "Enter a link starting with https://")
    .optional();

/** Numeric year string → number, or null when blank. */
const yearOf = (v?: string) => (v && v.trim() !== "" ? Number(v) : null);

/**
 * "End can't be before start", attached to the end field. Mirrors the backend
 * validator's object-level check so the error shows next to the right input.
 */
function yearOrder<T extends Record<string, unknown>>(startKey: keyof T & string, endKey: keyof T & string, message: string) {
  return (value: T, ctx: z.RefinementCtx) => {
    const start = yearOf(value[startKey] as string | undefined);
    const end = yearOf(value[endKey] as string | undefined);
    if (start != null && end != null && end < start) ctx.addIssue({ code: "custom", path: [endKey], message });
  };
}

// ── Portfolio v2 section schemas (numbers kept as strings; service converts) ──
export const educationSchema = z
  .object({
    degree: requiredString("Degree").max(150),
    institution: requiredString("Institution").max(200),
    fieldOfStudy: z.string().max(150).optional().or(z.literal("")),
    location: optionalText(150),
    yearFrom: optionalIntField("Year", 1950, 2100),
    yearTo: optionalIntField("Year", 1950, 2100),
  })
  .superRefine(yearOrder("yearFrom", "yearTo", "Completion year can't be before the start year"));
export type EducationInput = z.infer<typeof educationSchema>;

export const experienceSchema = z
  .object({
    organization: requiredString("Organization").max(200),
    roleTitle: requiredString("Role/title").max(150),
    location: optionalText(150),
    startYear: intField("Start year", 1950, 2100),
    endYear: optionalIntField("End year", 1950, 2100),
    isCurrent: z.boolean().optional(),
    description: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (!v.isCurrent) yearOrder<typeof v>("startYear", "endYear", "End year can't be before the start year")(v, ctx);
  });
export type ExperienceInput = z.infer<typeof experienceSchema>;

// ── Migration 049 sections ──
export const affiliationSchema = z
  .object({
    organization: requiredString("Hospital / institution").max(200),
    roleTitle: optionalText(150),
    department: optionalText(150),
    location: optionalText(255),
    startYear: optionalIntField("Start year", 1950, 2100),
    endYear: optionalIntField("End year", 1950, 2100),
    isCurrent: z.boolean(),
    website: optionalUrl(),
    phone: z
      .string()
      .refine((v) => v.trim() === "" || /^[0-9+()\-\s]{6,20}$/.test(v.trim()), "Enter a valid phone number")
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.isCurrent) yearOrder<typeof v>("startYear", "endYear", "End year can't be before the start year")(v, ctx);
  });
export type AffiliationInput = z.infer<typeof affiliationSchema>;

export const fellowshipSchema = z
  .object({
    title: requiredString("Fellowship / training title").max(200),
    institution: requiredString("Institution").max(200),
    specialtyArea: optionalText(150),
    location: optionalText(150),
    startYear: optionalIntField("Start year", 1950, 2100),
    endYear: optionalIntField("Completion year", 1950, 2100),
    description: optionalText(1000),
  })
  .superRefine(yearOrder("startYear", "endYear", "Completion year can't be before the start year"));
export type FellowshipInput = z.infer<typeof fellowshipSchema>;

export const expertiseSchema = z.object({
  category: z.enum(["clinical", "scientific", "area", "interest"]),
  name: z.string().trim().min(2, "Enter at least 2 characters").max(150),
  description: optionalText(300),
});
export type ExpertiseInput = z.infer<typeof expertiseSchema>;

/** Clinical-gallery picture metadata (upload + edit). */
export const galleryMetaSchema = z.object({
  title: optionalText(150),
  caption: optionalText(255),
  category: z.enum(["", "clinic", "facilities", "equipment", "events", "activities", "other"]),
  altText: optionalText(255),
  takenOn: z
    .string()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00`) <= new Date()), "Pick a date that isn't in the future"),
});
export type GalleryMetaInput = z.infer<typeof galleryMetaSchema>;

export const serviceSchema = z.object({
  name: requiredString("Service name").max(150),
  description: z.string().max(500).optional().or(z.literal("")),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const publicationSchema = z.object({
  title: requiredString("Title").max(300),
  authors: optionalText(500),
  publisher: z.string().max(200).optional().or(z.literal("")),
  year: optionalIntField("Year", 1950, 2100),
  url: z
    .string()
    .refine((v) => v.trim() === "" || /^https?:\/\//.test(v), "Enter a valid URL")
    .optional()
    .or(z.literal("")),
  doi: z
    .string()
    .refine((v) => v.trim() === "" || /^10\.\d{4,9}\/\S+$/.test(v.trim()), "Enter a DOI like 10.1000/xyz123 (without https://doi.org/)")
    .optional(),
  abstract: optionalText(2000),
  category: optionalText(100),
});
export type PublicationInput = z.infer<typeof publicationSchema>;

export const membershipSchema = z
  .object({
    organization: requiredString("Organization").max(200),
    roleTitle: z.string().max(150).optional().or(z.literal("")),
    sinceYear: optionalIntField("Year", 1950, 2100),
    // ── Migration 049 ──
    membershipNumber: optionalText(100),
    showMembershipNumber: z.boolean().optional(),
    validUntilYear: optionalIntField("Year", 1950, 2100),
    description: optionalText(500),
  })
  .superRefine(yearOrder("sinceYear", "validUntilYear", "Expiry year can't be before the joining year"));
export type MembershipInput = z.infer<typeof membershipSchema>;

export const faqSchema = z.object({
  question: requiredString("Question").max(300),
  answer: requiredString("Answer").max(1000),
});
export type FaqInput = z.infer<typeof faqSchema>;

export const awardSchema = z.object({
  title: requiredString("Title").max(255),
  issuer: z.string().max(255).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  awardYear: optionalIntField("Year", 1950, 2100),
});
export type AwardInput = z.infer<typeof awardSchema>;

/** Doctor-managed testimonial (matches backend doctor.validator createTestimonial). */
export const testimonialSchema = z.object({
  patientName: z.string().trim().min(2, "Enter the name to display (at least 2 characters)").max(120),
  reviewText: z.string().trim().min(10, "Write at least 10 characters").max(1500),
  rating: z.number().int().min(1, "Choose a rating from 1 to 5").max(5),
  reviewDate: z
    .string()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v) <= new Date()), "Pick a date that isn't in the future"),
  isVisible: z.boolean(),
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;

export const linkSchema = z.object({
  linkType: z.enum(["website", "linkedin", "instagram", "youtube", "other"]),
  url: z.string().url("Enter a valid URL").max(300),
});
export type LinkInput = z.infer<typeof linkSchema>;

export const keywordSchema = z.object({
  keyword: requiredString("Keyword").max(150),
  weight: intField("Weight", 1, 5),
});
export type KeywordInput = z.infer<typeof keywordSchema>;

/**
 * Clinic create/edit form (matches backend clinic.validator.js createClinic).
 * Numeric fields (lat/lng/offlineFee) stay STRINGS here — MUI number inputs
 * produce strings — validated by refinement; the service converts to numbers.
 * An empty value is allowed (the field is optional).
 */
const optionalNumberField = (label: string, min: number, max: number) =>
  z.string().refine((v) => {
    if (v.trim() === "") return true;
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max;
  }, `${label} must be between ${min} and ${max}`);

/**
 * Coordinates are OPTIONAL — a clinic saves with a typed address alone, so a
 * missing or failing Google Maps key never blocks it. A pin is all-or-nothing.
 */
export const clinicSchema = z
  .object({
    name: requiredString("Clinic name").max(150),
    addressLine: requiredString("Address").max(255),
    city: z.string().max(100).optional().or(z.literal("")),
    state: z.string().max(100).optional().or(z.literal("")),
    pincode: z.string().max(20).optional().or(z.literal("")),
    lat: optionalNumberField("Latitude", -90, 90),
    lng: optionalNumberField("Longitude", -180, 180),
    phone: z.string().max(20).optional().or(z.literal("")),
    offlineFee: z
      .string()
      .refine((v) => v.trim() !== "" && Number(v) >= 0, "Enter a valid fee"),
  })
  .superRefine((v, ctx) => {
    const hasLat = v.lat.trim() !== "";
    const hasLng = v.lng.trim() !== "";
    if (hasLat && !hasLng) ctx.addIssue({ code: "custom", path: ["lng"], message: "Add the longitude too, or clear the latitude" });
    if (hasLng && !hasLat) ctx.addIssue({ code: "custom", path: ["lat"], message: "Add the latitude too, or clear the longitude" });
  });
export type ClinicFormInput = z.infer<typeof clinicSchema>;

/**
 * Consultation payment QR text fields (matches backend paymentQr.validator.js
 * updatePaymentQr). Both are optional — an empty field is sent as null, which
 * clears it. Values are trimmed before the check, as Joi's `.trim()` does.
 */
export const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

export const paymentQrSchema = z.object({
  upiId: z
    .string()
    .refine((v) => v.trim() === "" || UPI_ID_PATTERN.test(v.trim()), "Enter a valid UPI ID, e.g. name@okbank"),
  payeeName: z.string().refine((v) => {
    const t = v.trim();
    return t === "" || (t.length >= 2 && t.length <= 150);
  }, "Payee name must be 2–150 characters"),
  isActive: z.boolean(),
});
export type PaymentQrInput = z.infer<typeof paymentQrSchema>;
