import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { PatientDescriptionView } from "@/features/appointments";
import { Loading } from "@/components/feedback";

/**
 * The record's own type: a serif for display, a workhorse sans, and a monospace
 * for every number that has to line up in a column.
 *
 * Loaded HERE rather than in the root layout so only this route pays for them —
 * `next/font` preloads what a layout declares, and three faces used on one page
 * would then be preloaded on every page in the app.
 */
// Self-hosted variable fonts (latin) — keeps the production build off Google's
// font CDN. Files live in src/assets/fonts.
const newsreader = localFont({
  src: "../../../../../../assets/fonts/Newsreader.woff2",
  variable: "--font-newsreader",
  weight: "400 600",
  display: "swap",
});
const publicSans = localFont({
  src: "../../../../../../assets/fonts/PublicSans.woff2",
  variable: "--font-public-sans",
  weight: "400 800",
  display: "swap",
});
const splineMono = localFont({
  src: "../../../../../../assets/fonts/SplineSansMono.woff2",
  variable: "--font-spline-mono",
  weight: "400 600",
  display: "swap",
});

export const metadata: Metadata = { title: "Patient record" };

/**
 * The full patient record, opened through an appointment the doctor owns: the
 * allergy band, the patient banner, vitals at a glance, and the whole record on
 * one time spine (gated backend-side to the doctor's own confirmed booking).
 *
 * The Suspense boundary is load-bearing, not cosmetic: the view reads
 * `useSearchParams()` (`?from=history` puts prescriptions in read-only mode),
 * and Next fails the PRODUCTION build on an unwrapped `useSearchParams` in a
 * statically-rendered subtree. Dev never complains, so without this the failure
 * would surface at deploy time.
 */
export default async function PatientDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className={`${newsreader.variable} ${publicSans.variable} ${splineMono.variable}`}>
      <Suspense fallback={<Loading label="Loading patient details…" />}>
        <PatientDescriptionView bookingId={id} />
      </Suspense>
    </div>
  );
}
