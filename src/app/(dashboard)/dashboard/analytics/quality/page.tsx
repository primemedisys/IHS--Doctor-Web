import type { Metadata } from "next";
import { QualityAnalyticsView, rangeFromParams, type SearchParamsRecord } from "@/features/analytics";

export const metadata: Metadata = { title: "Quality analytics" };

/** Dashboard 2.0 Explore More. `?range=&from=&to=` carries the overview's period. */
export default async function QualityAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  return <QualityAnalyticsView initialRange={rangeFromParams(await searchParams)} />;
}
