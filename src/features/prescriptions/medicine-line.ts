/**
 * One prescription medicine line — the rules both editors share (the EMR
 * medication order and the prescription composer), so they can't drift apart.
 */
import type { MedicineHit } from "@/types/emr";
import type { Medicine } from "@/types/medicine";
import type { MedicineRoute, PrescriptionItem } from "@/types/prescription";

/** "tablet" → "Tablet". */
export const formLabel = (form: string | null | undefined) =>
  form ? form.charAt(0).toUpperCase() + form.slice(1).replace(/_/g, " ") : "";

/**
 * Dosage form → the line's administration route (the column the PDF and the
 * pharmacy already read). Unknown forms fall back to "other", never a guess.
 */
const FORM_ROUTE: Record<string, MedicineRoute> = {
  tablet: "oral",
  capsule: "oral",
  syrup: "oral",
  powder: "oral",
  injection: "injection",
  drops: "drops",
  cream: "topical",
  ointment: "topical",
  gel: "topical",
  inhaler: "inhaler",
  spray: "inhaler",
  other: "other",
};
export const routeForForm = (form: string | null | undefined): MedicineRoute | null =>
  form ? FORM_ROUTE[form] ?? "other" : null;

/** The printed label: "Pan 40" + "40 mg" → "Pan 40 40 mg". */
export const lineLabel = (name: string, strength: string | null | undefined) =>
  [name.trim(), strength?.trim()].filter(Boolean).join(" ");

/** The label without its strength suffix — to re-label after the strength is edited. */
export const baseName = (item: Pick<PrescriptionItem, "medicineName" | "strength">) => {
  const s = item.strength?.trim();
  const n = item.medicineName.trim();
  return s && n.toLowerCase().endsWith(` ${s.toLowerCase()}`) ? n.slice(0, -(s.length + 1)).trim() : n;
};

/**
 * Frequency suggestions. The stored value stays the abbreviation the project
 * has always used ("OD", "BD", …); the label only explains it. Doctors can
 * still type any other schedule.
 */
export const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "OD", label: "OD — Once daily" },
  { value: "BD", label: "BD — Twice daily" },
  { value: "TDS", label: "TDS — Three times daily" },
  { value: "QID", label: "QID — Four times daily" },
  { value: "HS", label: "HS — At bedtime" },
  { value: "SOS", label: "SOS — When required" },
  { value: "Once a week", label: "Once a week" },
  { value: "1-0-1", label: "1-0-1 — Morning & night" },
  { value: "1-1-1", label: "1-1-1 — Morning, noon & night" },
  { value: "0-0-1", label: "0-0-1 — Night only" },
];

/** Food direction labels for the existing timing values. */
export const TIMING_LABEL: Record<string, string> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  anytime: "Any time",
};

/**
 * What a picked medicine fills in: only what the chosen record actually holds —
 * name, strength, dosage form, its reference and, for the doctor's own saved
 * medicines, their DEFAULT frequency and food direction. Those defaults are
 * copied onto this line only (editing the line never changes My Medicines),
 * and only when saved; a medicine with no defaults leaves the line's own
 * values alone. Duration, dose and quantity are never filled — they are
 * decided per patient.
 */
export function fromHit(hit: MedicineHit, current: PrescriptionItem): Partial<PrescriptionItem> {
  const dosageForm = hit.dosageForm ?? null;
  const defaults: Partial<PrescriptionItem> = {};
  if (hit.source === "mine" && hit.defaultFrequency) defaults.frequency = hit.defaultFrequency;
  if (hit.source === "mine" && hit.defaultTiming) defaults.timing = hit.defaultTiming as PrescriptionItem["timing"];
  return {
    ...defaults,
    medicineName: lineLabel(hit.name, hit.strength),
    strength: hit.strength ?? null,
    dosageForm,
    route: routeForForm(dosageForm) ?? current.route,
    medicineId: hit.source === "mine" ? hit.medicineId : null,
    medicineMasterId: hit.source === "catalogue" ? hit.catalogueId : null,
    nameType: "trade",
  };
}

/** A My Medicines entry as a search hit (same shape the server returns for `source: "mine"`). */
export const hitFromMine = (m: Medicine): MedicineHit => ({
  source: "mine",
  medicineId: m.id,
  catalogueId: m.medicineMasterId ?? null,
  name: m.name,
  genericName: m.genericName ?? null,
  type: m.form,
  dosageForm: m.dosageForm ?? null,
  strength: m.strength,
  manufacturer: m.manufacturer ?? null,
  defaultFrequency: m.defaultFrequency ?? null,
  defaultTiming: m.defaultTiming ?? null,
});

/**
 * Own medicines are linked to a catalogue row, so the same medicine can come
 * back twice (once per source). Tell them apart by `source`, never by
 * `catalogueId`: a catalogue hit that duplicates an own hit is dropped; one
 * linked to an own medicine the search didn't return becomes that own
 * medicine (so its defaults apply). Own hits come first.
 */
export function mergeLinkedHits(hits: MedicineHit[], own: Medicine[] = []): MedicineHit[] {
  const mine = hits.filter((h) => h.source === "mine");
  const seen = new Set(mine.map((h) => h.medicineId));
  const linked = new Set(mine.map((h) => h.catalogueId).filter(Boolean));
  const ownByMaster = new Map(own.filter((m) => m.isActive && m.medicineMasterId).map((m) => [m.medicineMasterId as string, m]));
  const catalogue: MedicineHit[] = [];
  for (const h of hits) {
    if (h.source !== "catalogue") continue;
    if (h.catalogueId && linked.has(h.catalogueId)) continue;
    const ownMed = h.catalogueId ? ownByMaster.get(h.catalogueId) : undefined;
    if (ownMed) {
      if (!seen.has(ownMed.id)) {
        seen.add(ownMed.id);
        mine.push(hitFromMine(ownMed));
      }
      continue;
    }
    catalogue.push(h);
  }
  return [...mine, ...catalogue];
}

/** A row the doctor never started — nothing chosen or typed. */
export const isBlankLine = (it: PrescriptionItem) =>
  !it.medicineName.trim() && !it.frequency && !it.durationDays && !it.dosage && !it.notes && !it.quantity;

/** Same medicine on two lines (same catalogue / own-list row, or same label). */
export const sameMedicine = (a: PrescriptionItem, b: PrescriptionItem) =>
  Boolean(
    (a.medicineMasterId && a.medicineMasterId === b.medicineMasterId) ||
      (a.medicineId && a.medicineId === b.medicineId) ||
      (a.medicineName.trim() && a.medicineName.trim().toLowerCase() === b.medicineName.trim().toLowerCase()),
  );

export type LineField = "medicine" | "frequency" | "timing" | "duration" | "quantity";

/**
 * What still blocks a line from being saved/signed. `required` lists which of
 * frequency / food direction / duration the editor actually shows (the
 * composer's columns come from the letterhead template).
 */
export function lineProblems(
  it: PrescriptionItem,
  required: { frequency?: boolean; timing?: boolean; duration?: boolean } = { frequency: true, timing: true, duration: true },
): Partial<Record<LineField, string>> {
  const out: Partial<Record<LineField, string>> = {};
  if (!it.medicineName.trim()) out.medicine = "Choose a medicine";
  if (required.frequency && !it.frequency?.trim()) out.frequency = "Choose a frequency";
  if (required.timing && !it.timing) out.timing = "Choose before / after food";
  if (required.duration && it.durationDays == null) out.duration = "Enter the duration";
  else if (it.durationDays != null && (!Number.isInteger(it.durationDays) || it.durationDays < 1 || it.durationDays > 365)) {
    out.duration = "Duration must be 1–365";
  }
  if (it.quantity != null && (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 9999)) out.quantity = "Quantity 1–9999";
  return out;
}
