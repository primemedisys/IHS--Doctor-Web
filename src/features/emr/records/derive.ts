/**
 * Pure derivations for the four patient record pages. Everything is computed
 * from rows the server already authorised (history + documents); nothing is
 * stored, guessed or invented. Where the record does not say, the answer is
 * "unknown" — never a made-up status.
 */
import { addInterval, istToday } from "../format";
import type { ClinicalEntry, EmrVisit, HistoryConsultation, HistoryRx, MedicalHistory, VisitRxItem } from "@/types/emr";

export const rxDay = (rx: HistoryRx): string | null => rx.visitDate ?? rx.finalizedAt?.slice(0, 10) ?? rx.createdAt?.slice(0, 10) ?? null;

/**
 * Where a medicine stands, judged ONLY by its prescribed duration:
 *   active    — start + duration is today or later (still inside the prescribed course)
 *   completed — the prescribed course has ended
 *   unknown   — no duration was written (cannot tell; never called "active")
 * It says nothing about whether the patient actually took or stopped it.
 */
export type CourseStatus = "active" | "completed" | "unknown";

export interface Course {
  status: CourseStatus;
  start: string | null;
  end: string | null;
}

export function courseOf(rx: HistoryRx, item: VisitRxItem, today = istToday()): Course {
  const start = rxDay(rx);
  if (!start || !item.durationDays) return { status: "unknown", start, end: null };
  const unit = item.durationUnit === "week" || item.durationUnit === "month" ? item.durationUnit : "day";
  // The first dose is on the start day, so a 5-day course ends on start + 4.
  const end = addInterval(addInterval(start, item.durationDays, unit), -1, "day");
  return { status: end >= today ? "active" : "completed", start, end };
}

/** Finalized (signed) prescriptions only — a draft is never treatment history. */
export const signedRx = (h: MedicalHistory) => h.prescriptions.filter((rx) => rx.status === "finalized");

export function currentMedicines(h: MedicalHistory, today = istToday()) {
  return signedRx(h).flatMap((rx) => rx.items.map((item) => ({ rx, item, course: courseOf(rx, item, today) })).filter((m) => m.course.status === "active"));
}

export const medicineKey = (i: VisitRxItem) => `${i.medicineName.trim().toLowerCase()}|${(i.strength ?? "").replace(/\s+/g, "").toLowerCase()}`;

// ── Lookups ─────────────────────────────────────────────────────────────────
export const visitOf = (h: MedicalHistory, bookingId: string | null | undefined): EmrVisit | null =>
  bookingId ? h.consultations.find((c) => c.visit.bookingId === bookingId)?.visit ?? null : null;

export const consultationOf = (h: MedicalHistory, bookingId: string | null | undefined): HistoryConsultation | null =>
  bookingId ? h.consultations.find((c) => c.visit.bookingId === bookingId) ?? null : null;

export const specialtyOf = (v: EmrVisit | null) => v?.doctor?.specializations ?? [];

// ── Diagnoses: structured entries + diagnoses written on older prescriptions ──
export interface DiagnosisRow {
  key: string;
  name: string;
  code: string | null;
  codeSystem: string | null;
  codeDescription: string | null;
  /** As the doctor recorded it: provisional | final | differential | "from prescription". */
  type: string;
  date: string | null;
  doctor: { id: string | null; name: string };
  specialties: string[];
  bookingId: string | null;
  source: "entry" | "prescription";
  entry: ClinicalEntry | null;
  prescriptionId: string | null;
}

export function diagnosisRows(h: MedicalHistory): DiagnosisRow[] {
  const rows: DiagnosisRow[] = [
    ...h.diagnoses.map((d): DiagnosisRow => {
      const v = visitOf(h, d.bookingId);
      return {
        key: `e${d.id}`,
        name: d.title ?? "Diagnosis",
        code: d.code,
        codeSystem: d.codeSystem ?? null,
        codeDescription: d.codeDescription ?? null,
        type: d.category ?? "unspecified",
        date: d.visitDate ?? d.recordedOn ?? d.createdAt?.slice(0, 10) ?? null,
        doctor: { id: d.author?.id ?? v?.doctor?.id ?? null, name: d.author?.name ?? v?.doctor?.name ?? "Unknown doctor" },
        specialties: specialtyOf(v),
        bookingId: d.bookingId,
        source: "entry",
        entry: d,
        prescriptionId: null,
      };
    }),
    ...h.prescriptionDiagnoses.map((d): DiagnosisRow => {
      const v = visitOf(h, d.bookingId);
      return {
        key: `r${d.prescriptionId}`,
        name: d.diagnosis,
        code: null,
        codeSystem: null,
        codeDescription: null,
        type: "from prescription",
        date: d.visitDate ?? d.date?.slice(0, 10) ?? null,
        doctor: { id: d.doctor?.id ?? null, name: d.doctor?.name ?? "Unknown doctor" },
        specialties: specialtyOf(v),
        bookingId: d.bookingId,
        source: "prescription",
        entry: null,
        prescriptionId: d.prescriptionId,
      };
    }),
  ];
  return rows.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")) || b.key.localeCompare(a.key));
}

/** The same condition recorded more than once: same ICD code, else same name. */
export const conditionKey = (r: DiagnosisRow) => (r.code ? `code:${r.code.toUpperCase()}` : `name:${r.name.trim().toLowerCase()}`);

/** What supported a diagnosis: findings and tests recorded in the SAME consultation (joined on booking id, never by date). */
export function evidenceOf(h: MedicalHistory, bookingId: string | null) {
  const c = consultationOf(h, bookingId);
  if (!c) return { findings: [] as string[], investigations: [] as string[] };
  return {
    findings: [...c.complaints, ...c.examinations].map((e) => e.title).filter((t): t is string => Boolean(t)),
    investigations: (c.investigations ?? []).map((e) => e.title).filter((t): t is string => Boolean(t)),
  };
}

export const doctorsIn = (h: MedicalHistory) =>
  new Map(h.consultations.filter((c) => c.visit.doctor).map((c) => [c.visit.doctor!.id, c.visit.doctor!.name ?? "Doctor"]));

export const diagnosisTypeLabel = (t: string) =>
  t === "provisional" ? "Provisional (suspected)" : t === "final" ? "Final" : t === "differential" ? "Differential" : t === "from prescription" ? "From prescription" : "Type not recorded";
