import type { Metadata } from "next";
import { TemplateEditor } from "@/features/prescriptions";

export const metadata: Metadata = { title: "Edit letterhead" };

export default async function PrescriptionTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateEditor templateId={id} />;
}
