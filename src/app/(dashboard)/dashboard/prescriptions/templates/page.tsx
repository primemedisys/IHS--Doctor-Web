import type { Metadata } from "next";
import { TemplateList } from "@/features/prescriptions";

export const metadata: Metadata = { title: "Prescription letterheads" };

export default function PrescriptionTemplatesPage() {
  return <TemplateList />;
}
