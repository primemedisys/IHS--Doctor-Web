import type { Metadata } from "next";
import { PatientsAnalyticsView, rangeFromParams, type SearchParamsRecord } from "@/features/analytics";

export const metadata: Metadata = { title: "Patient analytics" };

/** Dashboard 2.0 Explore More. `?range=&from=&to=` carries the overview's period. */
export default async function PatientsAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  return <PatientsAnalyticsView initialRange={rangeFromParams(await searchParams)} />;
}
