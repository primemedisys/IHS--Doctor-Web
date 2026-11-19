import type { Metadata } from "next";
import { AppointmentsAnalyticsView, rangeFromParams, type SearchParamsRecord } from "@/features/analytics";

export const metadata: Metadata = { title: "Appointment analytics" };

/** Dashboard 2.0 Explore More. `?range=&from=&to=` carries the overview's period. */
export default async function AppointmentsAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  return <AppointmentsAnalyticsView initialRange={rangeFromParams(await searchParams)} />;
}
