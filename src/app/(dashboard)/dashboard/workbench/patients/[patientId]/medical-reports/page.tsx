"use client";

import { useParams } from "next/navigation";
import { MedicalReportsPage } from "@/features/emr/records";

/** Reports and documents by test date — the patient comes from the route; the server re-authorises every request. */
export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <MedicalReportsPage patientId={params?.patientId ?? ""} />;
}
