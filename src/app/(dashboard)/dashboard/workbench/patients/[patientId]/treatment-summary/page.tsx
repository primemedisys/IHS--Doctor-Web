"use client";

import { useParams } from "next/navigation";
import { TreatmentSummaryPage } from "@/features/emr/records";

/** Current and previous prescriptions — the patient comes from the route; the server re-authorises every request. */
export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <TreatmentSummaryPage patientId={params?.patientId ?? ""} />;
}
