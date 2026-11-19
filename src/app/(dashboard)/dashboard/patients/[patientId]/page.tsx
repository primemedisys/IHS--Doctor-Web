"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PatientProfileView } from "@/features/emr";
import { PatientHistoryView } from "@/features/timeline";

/**
 * One patient, reached from My Patients: the read-only profile (same data and
 * layout as the Workbench). `?view=timeline` keeps the month-by-month treatment
 * timeline that used to live here (§5.4).
 */
export default function MyPatientPage() {
  const params = useParams<{ patientId: string }>();
  const search = useSearchParams();
  const patientId = params?.patientId ?? "";
  if (search.get("view") === "timeline") {
    return <PatientHistoryView source={{ by: "patient", patientId }} />;
  }
  return <PatientProfileView patientId={patientId} />;
}
