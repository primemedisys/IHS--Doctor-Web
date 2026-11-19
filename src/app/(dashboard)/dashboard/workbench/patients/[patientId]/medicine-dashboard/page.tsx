"use client";

import { useParams } from "next/navigation";
import { MedicineDashboardPage } from "@/features/emr/records";

/** Medicine timeline and current medication — the patient comes from the route; the server re-authorises every request. */
export default function Page() {
  const params = useParams<{ patientId: string }>();
  return <MedicineDashboardPage patientId={params?.patientId ?? ""} />;
}
