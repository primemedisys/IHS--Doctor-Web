"use client";

import { useParams } from "next/navigation";
import { PatientHistoryView } from "@/features/timeline";

/**
 * The patient's treatment history for one appointment (docs/treatment-timeline
 * §5.3). Opened in a NEW TAB from the appointment page and from the live video
 * call, so the call is never torn down. Booking-keyed: the server derives the
 * patient, so this page can't be pointed at anyone else's records.
 */
export default function AppointmentHistoryPage() {
  const params = useParams<{ id: string }>();
  return <PatientHistoryView source={{ by: "booking", bookingId: params?.id ?? "" }} />;
}
