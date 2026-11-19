import type { Metadata } from "next";
import { FinancialAnalyticsView, rangeFromParams, type SearchParamsRecord } from "@/features/analytics";

export const metadata: Metadata = { title: "Financial analytics" };

/** Dashboard 2.0 Explore More. `?range=&from=&to=` carries the overview's period. */
export default async function FinancialAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  return <FinancialAnalyticsView initialRange={rangeFromParams(await searchParams)} />;
}
