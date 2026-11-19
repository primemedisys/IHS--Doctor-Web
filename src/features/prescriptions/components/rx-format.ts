import type { DurationUnit } from "@/types/prescription";
import type {
  MedicineColumn,
  MedicineRoute,
  MedicineTiming,
  PatientFieldKey,
  Prescription,
  PrescriptionTemplate,
  TemplateSnapshot,
} from "@/types/prescription";

/** Column headers the medicine table renders, keyed by the template's picks. */
export const COLUMN_LABELS: Record<MedicineColumn, string> = {
  medicineName: "Medicine",
  dosage: "Dosage",
  route: "Route",
  frequency: "Frequency",
  timing: "Timing",
  durationDays: "Duration",
  notes: "Notes",
};

export const ROUTE_LABELS: Record<MedicineRoute, string> = {
  oral: "Oral",
  topical: "Topical",
  injection: "Injection",
  drops: "Drops",
  inhaler: "Inhaler",
  other: "Other",
};

export const TIMING_LABELS: Record<MedicineTiming, string> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  anytime: "Anytime",
};

/** Default labels offered when a field is re-enabled in the picker. */
export const PATIENT_FIELD_LABELS: Record<PatientFieldKey, string> = {
  name: "Name",
  age: "Age/Sex",
  sex: "Sex",
  phone: "Phone",
  address: "Address",
  bp: "BP",
  pulse: "Pulse",
  weight: "Wt",
  height: "Ht",
  temperature: "Temp",
  spo2: "SpO2",
  date: "Date",
};

export const fmtDate = (value?: string | Date | null): string =>
  !value
    ? ""
    : new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * The letterhead a prescription renders with. A finalized Rx uses its FROZEN
 * snapshot; a draft uses the live template. Never substitute one for the other.
 */
export function letterheadOf(rx: Prescription): TemplateSnapshot | PrescriptionTemplate | null {
  return rx.status === "finalized" ? rx.snapshot : rx.template;
}

/** The fake patient the template editor previews against (mirrors SAMPLE_RX server-side). */
export const SAMPLE_PATIENT: Record<PatientFieldKey, string> = {
  name: "Ramananda Pattnaik",
  age: "28 / M",
  sex: "M",
  phone: "90000 00000",
  address: "Bhubaneswar",
  bp: "130/85",
  pulse: "78",
  weight: "72",
  height: "171",
  temperature: "98.4",
  spo2: "98",
  date: new Date().toLocaleDateString("en-GB"),
};

export const SAMPLE_MEDICINES = [
  { medicineName: "Tab. Etoricoxib 90mg", dosage: "1 tab", route: "oral", frequency: "OD", timing: "after_food", durationDays: 5, durationUnit: "day", notes: null },
  { medicineName: "Cap. Pregabalin 75mg", dosage: "1 cap", route: "oral", frequency: "HS", timing: "after_food", durationDays: 10, durationUnit: "day", notes: null },
] as const;

/** Split a pasted block into trimmed, non-empty lines — the sidebar "Paste list" affordance. */
export const linesFrom = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** Duration unit → the word shown in the composer and on the PDF. */
export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  day: "Days",
  week: "Weeks",
  month: "Months",
};

/**
 * A medicine's duration as printed text: "5 days", "2 weeks", "3 months".
 * Every surface (composer preview, read-only view, PDF) goes through this,
 * so the unit can never be assumed to be days in one place and not another.
 */
export function durationText(
  count: number | null | undefined,
  unit: DurationUnit | null | undefined,
): string | null {
  if (!count) return null;
  const u = unit ?? "day";
  return `${count} ${u}${count > 1 ? "s" : ""}`;
}
