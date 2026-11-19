"use client";

import { useParams } from "next/navigation";
import { ClinicalRecordsPage } from "@/features/emr/records";

/** Full clinical consultation history — the patient comes from the route; the server re-authorises every request. */
export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <ClinicalRecordsPage patientId={params?.patientId ?? ""} />;
}
