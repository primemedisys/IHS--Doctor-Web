"use client";

import { useParams } from "next/navigation";
import { ReconciliationPage } from "@/features/emr/records";

export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <ReconciliationPage patientId={params?.patientId ?? ""} />;
}
