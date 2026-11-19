"use client";

import { useParams } from "next/navigation";
import { DiagnosisRecordsPage } from "@/features/emr/records";

/** Diagnosis history, evolution and comparison — the patient comes from the route; the server re-authorises every request. */
export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <DiagnosisRecordsPage patientId={params?.patientId ?? ""} />;
}
