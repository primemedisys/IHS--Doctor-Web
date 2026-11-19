import type { Metadata } from "next";
import { RxComposer } from "@/features/prescriptions";

export const metadata: Metadata = { title: "Prescription" };

/**
 * A draft renders the composer; a finalized one renders the locked record.
 * `RxComposer` branches on `status`, so the URL is stable across finalize.
 */
export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RxComposer prescriptionId={id} />;
}
