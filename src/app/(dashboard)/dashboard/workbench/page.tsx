import type { Metadata } from "next";
import { WorkbenchView } from "@/features/emr";

export const metadata: Metadata = { title: "Workbench" };

/** The doctor's working day: consultations, appointments and patients (EMR workbench). */
export default function WorkbenchPage() {
  return <WorkbenchView />;
}
