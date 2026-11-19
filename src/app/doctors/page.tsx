import { redirect } from "next/navigation";
import { env } from "@/config/env";

/**
 * The public doctor directory lives in the patient app, which reads the real backend. The copy that
 * used to be here showed a bundled sample dataset instead of real doctors, so it now sends visitors there instead.
 */
export default function FindDoctorPage() {
  redirect(`${env.patientUrl}/doctors`);
}
