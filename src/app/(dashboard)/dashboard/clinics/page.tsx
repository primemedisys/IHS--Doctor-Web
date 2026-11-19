import type { Metadata } from "next";
import { ClinicsManager } from "@/features/doctor";

export const metadata: Metadata = { title: "My Clinics" };

export default function ClinicsPage() {
  return <ClinicsManager />;
}
