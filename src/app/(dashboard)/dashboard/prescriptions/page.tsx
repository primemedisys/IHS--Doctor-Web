import type { Metadata } from "next";
import { PrescriptionHistory } from "@/features/prescriptions";

export const metadata: Metadata = { title: "Prescriptions" };

export default function PrescriptionsPage() {
  return <PrescriptionHistory />;
}
