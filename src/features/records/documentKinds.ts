/**
 * Patient document vocabulary as the doctor portal reads it — the same kinds
 * and groups the patient picks from in Medical History → Medical Documents
 * (frontend-patient features/medical-record/documents.ts; backend
 * constants.DOCUMENT_KIND_FILE_TYPE). Identity / insurance documents never
 * reach a doctor, so they are not listed here.
 */
export type DocGroup = "prescriptions" | "investigations" | "other";

export const DOC_GROUP_LABEL: Record<DocGroup, string> = {
  prescriptions: "Prescriptions",
  investigations: "Lab reports & imaging",
  other: "Other medical documents",
};

const KIND_LABEL: Record<string, { label: string; group: DocGroup }> = {
  prescription: { label: "Prescription", group: "prescriptions" },
  blood_test: { label: "Blood test report", group: "investigations" },
  lab_report: { label: "Laboratory report", group: "investigations" },
  xray: { label: "X-ray", group: "investigations" },
  mri: { label: "MRI", group: "investigations" },
  ct_scan: { label: "CT scan", group: "investigations" },
  ultrasound: { label: "Ultrasound", group: "investigations" },
  ecg: { label: "ECG", group: "investigations" },
  diagnostic_other: { label: "Diagnostic report", group: "investigations" },
  discharge_summary: { label: "Discharge summary", group: "other" },
  hospital_report: { label: "Hospital record", group: "other" },
  treatment_record: { label: "Previous treatment record", group: "other" },
  referral_letter: { label: "Referral letter", group: "other" },
  consultation_report: { label: "Previous consultation report", group: "other" },
  medical_certificate: { label: "Medical certificate", group: "other" },
  other_medical: { label: "Other medical document", group: "other" },
};

const FILE_TYPE_LABEL: Record<string, string> = {
  prescription: "Prescription",
  lab_report: "Lab report",
  xray: "X-ray",
  mri: "MRI",
  other: "Document",
};

interface DocLike {
  documentKind?: string | null;
  fileType?: string | null;
  source?: string | null;
}

/** "CT scan", "Discharge summary" … — older rows fall back to their file type. */
export function documentKindLabel(d: DocLike): string {
  return (d.documentKind && KIND_LABEL[d.documentKind]?.label) || FILE_TYPE_LABEL[d.fileType ?? ""] || "Document";
}

/** Which documents section a row belongs to. */
export function documentGroupOf(d: DocLike): DocGroup {
  const kind = d.documentKind ? KIND_LABEL[d.documentKind] : null;
  if (kind) return kind.group;
  if (d.fileType === "prescription") return "prescriptions";
  if (d.fileType === "lab_report" || d.fileType === "xray" || d.fileType === "mri") return "investigations";
  // A lab files its report as "other" when no closer type fits — still a test.
  if (d.source === "diagnostic_lab") return "investigations";
  return "other";
}

/** "PDF", "JPG" … from the stored MIME type or file name. */
export function fileTypeLabel(d: { mimeType?: string | null; originalName?: string | null; fileUrl?: string | null }): string | null {
  const fromName = (d.originalName ?? d.fileUrl ?? "").split("?")[0].split(".").pop();
  if (fromName && fromName.length <= 5 && !fromName.includes("/")) return fromName.toUpperCase();
  if (d.mimeType === "application/pdf") return "PDF";
  if (d.mimeType?.startsWith("image/")) return d.mimeType.slice(6).toUpperCase();
  return null;
}
