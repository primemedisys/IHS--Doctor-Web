"use client";

import { useParams } from "next/navigation";
import { ClinicalDashboardPage } from "@/features/emr/records";

export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <ClinicalDashboardPage patientId={params?.patientId ?? ""} page="doctor-comparison" />;
}
