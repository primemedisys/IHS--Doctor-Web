import type { Metadata } from "next";
import { ProductivityAnalyticsView, rangeFromParams, type SearchParamsRecord } from "@/features/analytics";

export const metadata: Metadata = { title: "Productivity analytics" };

/** Dashboard 2.0 Explore More. `?range=&from=&to=` carries the overview's period. */
export default async function ProductivityAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  return <ProductivityAnalyticsView initialRange={rangeFromParams(await searchParams)} />;
}
