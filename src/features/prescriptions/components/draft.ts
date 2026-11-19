import type { Prescription, PrescriptionItem, Vitals } from "@/types/prescription";

/**
 * The mutable part of a draft. `items` is replace-the-set on the wire.
 *
 * Lives in its own module because BOTH writing surfaces edit it — the field
 * form and the letterhead pad — and neither should have to import the other
 * just to name its own state.
 */
export interface Draft {
  vitals: Vitals;
  chiefComplaint: string;
  diagnosis: string;
  notes: string;
  advice: string;
  adviceSelected: string[];
  followUpDate: string;
  items: PrescriptionItem[];
}

export const draftFrom = (rx: Prescription): Draft => ({
  vitals: rx.vitals,
  chiefComplaint: rx.chiefComplaint ?? "",
  diagnosis: rx.diagnosis ?? "",
  notes: rx.notes ?? "",
  advice: rx.advice ?? "",
  adviceSelected: rx.adviceSelected,
  followUpDate: rx.followUpDate ?? "",
  items: rx.items,
});

/** Any vital present (non-null, non-blank)? */
export const hasVitals = (v?: Vitals | null): boolean =>
  !!v && Object.values(v).some((x) => x !== null && x !== undefined && String(x).trim() !== "");

/** Which `Vitals` key a letterhead patient-field writes to, if any. */
export const VITAL_FOR_FIELD = {
  bp: "bloodPressure",
  pulse: "pulseRateBpm",
  weight: "weightKg",
  height: "heightCm",
  temperature: "temperatureF",
  spo2: "spo2Percent",
} as const satisfies Partial<Record<string, keyof Vitals>>;

/** `bloodPressure` is free text ("130/85"); every other vital is numeric. */
export function vitalValue(key: keyof Vitals, raw: string): string | number | null {
  if (raw === "") return null;
  if (key === "bloodPressure") return raw;
  return Number.isNaN(Number(raw)) ? null : Number(raw);
}
