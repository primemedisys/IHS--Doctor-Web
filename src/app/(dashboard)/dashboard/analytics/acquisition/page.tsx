import type { Metadata } from "next";
import { AcquisitionAnalyticsView, rangeFromParams, type SearchParamsRecord } from "@/features/analytics";

export const metadata: Metadata = { title: "Patient acquisition" };

/** Dashboard 2.0 Explore More. `?range=&from=&to=` carries the overview's period. */
export default async function AcquisitionAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  return <AcquisitionAnalyticsView initialRange={rangeFromParams(await searchParams)} />;
}
