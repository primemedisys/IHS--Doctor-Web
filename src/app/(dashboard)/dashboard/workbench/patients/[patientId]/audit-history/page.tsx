"use client";

import { useParams } from "next/navigation";
import { AuditHistoryPage } from "@/features/emr/records";

export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <AuditHistoryPage patientId={params?.patientId ?? ""} />;
}
