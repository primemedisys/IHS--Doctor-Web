import { redirect } from "next/navigation";
import { env } from "@/config/env";

/**
 * The healthcare map lives in the patient app, which reads the real backend. The copy that
 * used to be here showed counts from a bundled sample dataset, so it now sends visitors there instead.
 */
export default function HealthcareMapPage() {
  redirect(`${env.patientUrl}/map`);
}
