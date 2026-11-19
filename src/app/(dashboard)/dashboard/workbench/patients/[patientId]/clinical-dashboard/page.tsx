"use client";

import { useParams } from "next/navigation";
import { ClinicalDashboardPage } from "@/features/emr/records";

/** Default clinical view: timeline, records and analytics — the patient comes from the route; the server re-authorises every request. */
export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <ClinicalDashboardPage patientId={params?.patientId ?? ""} />;
}
