import type { Metadata } from "next";
import { Newsreader, Public_Sans, Spline_Sans_Mono } from "next/font/google";
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
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["400", "500", "600"] });
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const splineMono = Spline_Sans_Mono({ variable: "--font-spline-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

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
