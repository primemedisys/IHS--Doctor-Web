import type { Metadata } from "next";
import { AppointmentsBoard } from "@/features/appointments";

export const metadata: Metadata = { title: "Appointments" };

/**
 * `?appointment=<id>` auto-opens that appointment's detail modal — used after a
 * doctor finalizes a prescription, to land them back on the mark-complete flow.
 */
export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ appointment?: string }>;
}) {
  const sp = await searchParams;
  const initialAppointmentId = typeof sp.appointment === "string" ? sp.appointment : undefined;
  return <AppointmentsBoard initialAppointmentId={initialAppointmentId} />;
}
