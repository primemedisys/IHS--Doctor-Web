import { redirect } from "next/navigation";
import { env } from "@/config/env";

/**
 * The contact form lives in the patient app, which reads the real backend. The copy that
 * used to be here showed a form that never sent anything, so it now sends visitors there instead.
 */
export default function ContactPage() {
  redirect(`${env.patientUrl}/contact`);
}
