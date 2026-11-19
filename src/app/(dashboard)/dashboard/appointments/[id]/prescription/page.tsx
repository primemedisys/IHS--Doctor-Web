import type { Metadata } from "next";
import { PrescriptionGate } from "@/features/prescriptions";

export const metadata: Metadata = { title: "Write prescription" };

/**
 * Entered from an appointment. Finds the booking's prescription (or creates the
 * draft) and redirects to `/dashboard/prescriptions/:id`, which is the stable
 * home of the document.
 */
export default async function WritePrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrescriptionGate bookingId={id} />;
}
