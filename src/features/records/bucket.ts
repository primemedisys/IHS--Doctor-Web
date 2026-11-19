import type { SnapshotRecord } from "@/types/appointment";

/**
 * The four kinds of paper a patient record holds.
 *
 * ONE definition, imported by both readers of it — the register's document
 * columns and the record reader's rail. Two copies would eventually disagree
 * about what an MRI is, and the column a document files under is the doctor's
 * whole means of finding it.
 *
 * `uploaded_records.file_type` stores all four (migration 021), so the patient
 * picks the real category at upload. Rows created before that migration fall
 * back to matching the label — hence the regex pass BEFORE the fileType check.
 */
export type DocBucket = "prescription" | "report" | "xray" | "mri";

export const BUCKETS: { key: DocBucket; label: string }[] = [
  { key: "prescription", label: "Prescription" },
  { key: "report", label: "Report" },
  { key: "xray", label: "X-ray" },
  { key: "mri", label: "MRI / CT" },
];

/** #, Time, Doctor, Place, Diagnosis, Treatment + one column per document kind. */
export const REGISTER_COLS = 6 + BUCKETS.length;

export const BUCKET_LABEL: Record<DocBucket, string> = {
  prescription: "Prescription",
  report: "Report",
  xray: "X-ray",
  mri: "MRI / CT",
};

export function bucketOf(r: SnapshotRecord): DocBucket {
  // The kind the patient picked at upload (migration 058) is the most precise
  // signal; older rows have none and fall through to the label/type rules.
  if (r.documentKind === "prescription") return "prescription";
  if (r.documentKind === "xray") return "xray";
  if (r.documentKind === "mri" || r.documentKind === "ct_scan") return "mri";
  if (r.documentKind) return "report";
  const tag = `${r.tag ?? ""}`.toLowerCase();
  if (/\bmri\b|magnetic resonance/.test(tag)) return "mri";
  if (/x-?ray|radiograph|\bxr\b/.test(tag)) return "xray";
  if (r.fileType === "prescription" || /^rx-/i.test(tag)) return "prescription";
  if (r.fileType === "xray") return "xray";
  if (r.fileType === "mri") return "mri";
  return "report";
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  prescription: "Prescription",
  lab_report: "Lab report",
  xray: "X-ray",
  mri: "MRI",
  other: "Document",
};

/** A document's own label, falling back to its type when it was never tagged. */
export const reportType = (t?: string | null): string =>
  t ? (REPORT_TYPE_LABELS[t] ?? t) : "Document";
