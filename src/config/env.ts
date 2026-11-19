/**
 * Typed, validated access to public runtime configuration.
 *
 * Only `NEXT_PUBLIC_*` vars are readable in the browser. We validate once at
 * module load so a missing/typo'd var fails loudly at startup instead of
 * surfacing as a confusing runtime error deep in a request.
 */
import { z } from "zod";

const envSchema = z.object({
  // Sourced only from the .env file — no hardcoded fallback. A missing/invalid
  // value fails loudly at startup (see the safeParse check below).
  NEXT_PUBLIC_API_URL: z.string().url("NEXT_PUBLIC_API_URL must be set in .env to a valid URL"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Indian Health System"),
  NEXT_PUBLIC_ENV: z.enum(["development", "staging", "production"]).default("development"),
  // Optional: Google Identity client id. Blank = Google sign-in is hidden
  // (the backend also disables /auth/google until GOOGLE_CLIENT_ID is set).
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(""),
  // Google Maps JavaScript API key (public). Powers the interactive maps and
  // Places address search. Blank = maps fall back to a static placeholder.
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  // Shared parent domain for the auth cookies (e.g. ".indianhealthsystem.com"
  // in prod, "localhost" in dev) so a session set by one of the 3 apps
  // (patient/doctor/admin) is readable by the others. Blank = host-only
  // cookie, no cross-app SSO.
  NEXT_PUBLIC_COOKIE_DOMAIN: z.string().optional().default(""),
  // Base URLs of the other apps in the platform, for cross-app links.
  NEXT_PUBLIC_PATIENT_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DOCTOR_URL: z.string().url().default("http://doctor.localhost:3001"),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default("http://admin.localhost:3002"),
  // Public LiveKit SFU URL (wss://…) for video consultations — the SAME value as
  // the backend's LIVEKIT_URL. Blank = video calling is hidden/disabled.
  NEXT_PUBLIC_LIVEKIT_URL: z.string().optional().default(""),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  NEXT_PUBLIC_PATIENT_URL: process.env.NEXT_PUBLIC_PATIENT_URL,
  NEXT_PUBLIC_DOCTOR_URL: process.env.NEXT_PUBLIC_DOCTOR_URL,
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
});

if (!parsed.success) {
  // Surface exactly which vars are wrong, then stop.
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = {
  apiUrl: parsed.data.NEXT_PUBLIC_API_URL,
  appName: parsed.data.NEXT_PUBLIC_APP_NAME,
  environment: parsed.data.NEXT_PUBLIC_ENV,
  googleClientId: parsed.data.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  /** True when a Google client id is configured (drives whether the button renders). */
  isGoogleEnabled: parsed.data.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0,
  googleMapsApiKey: parsed.data.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  /** True when a Maps API key is configured (drives whether live maps render). */
  isMapsEnabled: parsed.data.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 0,
  isProduction: parsed.data.NEXT_PUBLIC_ENV === "production",
  isDevelopment: parsed.data.NEXT_PUBLIC_ENV === "development",
  cookieDomain: parsed.data.NEXT_PUBLIC_COOKIE_DOMAIN,
  patientUrl: parsed.data.NEXT_PUBLIC_PATIENT_URL,
  doctorUrl: parsed.data.NEXT_PUBLIC_DOCTOR_URL,
  adminUrl: parsed.data.NEXT_PUBLIC_ADMIN_URL,
  livekitUrl: parsed.data.NEXT_PUBLIC_LIVEKIT_URL,
  /** True when a LiveKit URL is configured (drives whether video calling renders). */
  isVideoEnabled: parsed.data.NEXT_PUBLIC_LIVEKIT_URL.length > 0,
} as const;
