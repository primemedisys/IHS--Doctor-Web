"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PatientWorkspace } from "@/features/emr";

/** One patient's medical workspace, optionally opened on a specific visit (?bookingId=). */
export default function EmrPatientPage() {
  const params = useParams<{ patientId: string }>();
  const search = useSearchParams();
  return <PatientWorkspace patientId={params?.patientId ?? ""} bookingId={search.get("bookingId")} />;
}
