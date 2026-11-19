/**
 * Pure derivations for the doctor-comparison view of the Clinical Dashboard
 * (the reference "Doctor Comparison Timeline"). Doctors run horizontally —
 * one column per doctor who actually recorded something — and clinical events
 * run vertically, one fixed row each. Everything is built from rows the server
 * already authorised (structured history + documents); nothing is stored,
 * guessed or invented:
 *
 *   • every record keeps the doctor who recorded it (joined by doctor user id,
 *     or by name only when the record carries no id) — one doctor's diagnosis
 *     is never copied into another doctor's column;
 *   • a diagnosis counts as "confirmed" only when the doctor recorded it as
 *     final — confirmation is never inferred from a later record;
 *   • "conflicting" is never guessed: different diagnoses by different doctors
 *     are shown side by side and only counted as matching/separate;
 *   • reconciliation records do not exist in the backend, so that row stays
 *     empty and the summary says so instead of inventing a status.
 */
import { conditionKey, diagnosisRows, diagnosisTypeLabel, rxDay, signedRx, visitOf, type DiagnosisRow } from "./derive";
import { isMedicalReport, medicineLabel, pastVisits, type DashFilters, type EvKind } from "./dashboard";
import { VISIT_STATUS } from "../format";
import { documentKindLabel } from "@/features/records/documentKinds";
import type { MedicalHistory, PatientDocument } from "@/types/emr";

// ── The eight clinical-event rows (reference layout) ─────────────────────────

export type CompRowKey =
  | "initial" | "diagnosis" | "confirmation" | "status"
  | "investigation" | "treatment" | "followup" | "reconciliation";

export const COMP_ROWS: { key: CompRowKey; label: string; icon: string; color: string; bg: string }[] = [
  { key: "initial", label: "Initial Assessment", icon: "FiClipboard", color: "#0756B5", bg: "#E5F0FF" },
  { key: "diagnosis", label: "Diagnosis", icon: "FiSearch", color: "#6D3FB8", bg: "#F0E8FF" },
  { key: "confirmation", label: "Confirmation", icon: "FiCheckCircle", color: "#16834A", bg: "#E2F5EC" },
  { key: "status", label: "Status Change", icon: "FiRepeat", color: "#B25E09", bg: "#FFF0DC" },
  { key: "investigation", label: "Investigation", icon: "FiDroplet", color: "#0E7D8C", bg: "#E0F4F7" },
  { key: "treatment", label: "Treatment", icon: "FiActivity", color: "#2F5FA8", bg: "#E6EEFB" },
  { key: "followup", label: "Follow-up", icon: "FiCalendar", color: "#C2255C", bg: "#FCE7F0" },
  { key: "reconciliation", label: "Reconciliation", icon: "FiGitMerge", color: "#596579", bg: "#F3F4F6" },
];

/** How the existing event-type filter maps onto the comparison rows. */
const KIND_ROWS: Record<EvKind, CompRowKey[]> = {
  consultation: ["initial"],
  diagnosis: ["diagnosis", "confirmation", "status"],
  prescription: ["treatment"],
  report: ["investigation"],
  investigation: ["investigation"],
  vitals: [],
  treatment: ["treatment"],
  follow_up: ["followup"],
};

// ── Colour cycle — one tone per doctor, reused across column, pills and card ──

export interface CompTone { fg: string; bg: string; border: string }
/** Light blue / light green / light purple / light orange first, then extras. */
export const COMP_TONES: CompTone[] = [
  { fg: "#0B4DA2", bg: "#E5F0FF", border: "#B9D4F7" },
  { fg: "#116149", bg: "#E2F5EC", border: "#B0E0C8" },
  { fg: "#5B3BA8", bg: "#F0E8FF", border: "#D5C5F5" },
  { fg: "#9A5B0D", bg: "#FFF0DC", border: "#F2D8AE" },
  { fg: "#0B6E75", bg: "#E0F4F7", border: "#B5E0E5" },
  { fg: "#A61E4D", bg: "#FCE7F0", border: "#F0C3D2" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompDoctor {
  /** Stable key: the doctor's user id when the record carries one, else the name. */
  key: string;
  id: string | null;
  name: string;
  photoUrl: string | null;
  specialties: string[];
  clinic: string | null;
  /** Records this doctor contributed (after the filters in view). */
  eventCount: number;
  /** Index into COMP_TONES — the same tone colours this doctor everywhere on the page. */
  tone: number;
}

/** One real record placed in one (event row × doctor column) cell. */
export interface CompRecord {
  key: string;
  row: CompRowKey;
  date: string | null;
  title: string;
  detail: string | null;
  /** The visit's status label, as the timeline shows it (for the status filter). */
  status: string | null;
  doctorKey: string;
  bookingId: string | null;
  /** The diagnosis name this record IS, when the record is a diagnosis. */
  dxName?: string;
  /** Key into the full diagnosis-rows list — opens the existing DiagnosisDetail. */
  dxKey?: string;
  /** Document records carry their file for the existing viewer. */
  doc?: PatientDocument;
}

export interface CompSummary {
  doctors: number;
  diagnoses: number;
  matching: { count: number; names: string[] };
  separate: number;
  consultations: number;
  reports: number;
}

export interface CompInsight { key: string; icon: string; color: string; text: string }

export interface Comparison {
  doctors: CompDoctor[];
  records: CompRecord[];
  /** Every diagnosis (structured + from-prescription) with its doctor key attached. */
  dxRows: (DiagnosisRow & { doctorKey: string })[];
  /** Booking ids that carry an advised investigation (links diagnoses to tests). */
  invBookingIds: Set<string>;
  summary: CompSummary;
  insights: CompInsight[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stable identity: doctor user id when present, else the lower-cased name. */
const keyOf = (d: { id: string | null; name: string } | null | undefined): string | null =>
  d ? (d.id ? `id:${d.id}` : `n:${d.name.trim().toLowerCase()}`) : null;

const clinicLabel = (c: { name: string; city: string | null } | null) => (c ? `${c.name}${c.city ? `, ${c.city}` : ""}` : null);

/** The diagnosis entry's own recorded laterality, if any. */
const lateralityOf = (d: DiagnosisRow): string | null => {
  const v = d.entry?.details;
  for (const k of ["laterality", "side"]) {
    const x = v?.[k];
    if (x !== undefined && x !== null && String(x).trim()) return String(x).trim();
  }
  return null;
};

/** A diagnosis entry that was really edited after it was created (same rule as DiagnosisDetail). */
const editedOn = (r: DiagnosisRow): string | null => {
  if (!r.entry || Date.parse(r.entry.updatedAt) - Date.parse(r.entry.createdAt) <= 60_000) return null;
  return r.entry.updatedAt.slice(0, 10);
};

// ── Build ─────────────────────────────────────────────────────────────────────

export function buildComparison(h: MedicalHistory, docs: PatientDocument[]): Comparison {
  const dxRows: (DiagnosisRow & { doctorKey: string })[] =
    diagnosisRows(h).map((d) => ({ ...d, doctorKey: keyOf(d.doctor) ?? "n:unknown doctor" }));
  const rxs = signedRx(h);

  // Doctor registry — every doctor who actually recorded something, enriched
  // with the photo / specialty / clinic of their visits.
  const registry = new Map<string, { key: string; id: string | null; name: string; photoUrl: string | null; specialties: Set<string>; clinic: string | null; clinicDate: string | null }>();
  const register = (d: { id: string | null; name: string } | null | undefined, extra?: { photoUrl?: string | null; specialties?: string[]; clinic?: string | null; clinicDate?: string | null }): string | null => {
    const key = keyOf(d);
    if (!key || !d) return null;
    const cur = registry.get(key);
    if (!cur) {
      registry.set(key, { key, id: d.id, name: d.name, photoUrl: extra?.photoUrl ?? null, specialties: new Set(extra?.specialties ?? []), clinic: extra?.clinic ?? null, clinicDate: extra?.clinicDate ?? null });
    } else if (extra) {
      if (!cur.photoUrl && extra.photoUrl) cur.photoUrl = extra.photoUrl;
      for (const s of extra.specialties ?? []) cur.specialties.add(s);
      if (extra.clinic && (!cur.clinicDate || (extra.clinicDate ?? "") >= cur.clinicDate)) {
        cur.clinic = extra.clinic;
        cur.clinicDate = extra.clinicDate ?? "";
      }
    }
    return key;
  };

  // Visits that already happened (or already hold records) — the timeline's rule.
  const past = new Set(pastVisits(h));
  const rxBookings = new Set(rxs.map((r) => r.bookingId).filter((b): b is string => Boolean(b)));
  const dxBookings = new Set(dxRows.map((d) => d.bookingId).filter((b): b is string => Boolean(b)));
  const visits = h.consultations.filter((c) => past.has(c) || (c.visit.bookingId && (rxBookings.has(c.visit.bookingId) || dxBookings.has(c.visit.bookingId))));

  for (const c of visits) {
    register(c.visit.doctor && { id: c.visit.doctor.id, name: c.visit.doctor.name ?? "Doctor" }, {
      photoUrl: c.visit.doctor?.photoUrl ?? null,
      specialties: c.visit.doctor?.specializations ?? [],
      clinic: clinicLabel(c.visit.clinic),
      clinicDate: c.visit.date,
    });
  }
  for (const d of dxRows) register(d.doctor, { specialties: d.specialties });
  for (const r of rxs) register(r.doctor && { id: r.doctor.id, name: r.doctor.name ?? "Doctor" });
  for (const i of h.investigations) register(i.author);
  for (const d of docs) {
    if (!isMedicalReport(d)) continue;
    register(d.source === "doctor" && d.recordedBy ? d.recordedBy : d.doctorName ? { id: null, name: d.doctorName } : null);
  }

  const records: CompRecord[] = [];
  const push = (r: CompRecord) => records.push(r);
  const statusOf = (bookingId: string | null) => {
    const v = visitOf(h, bookingId);
    return v ? VISIT_STATUS[v.status].label : null;
  };
  const visitDoctorRef = (c: (typeof visits)[number]) => (c.visit.doctor ? { id: c.visit.doctor.id, name: c.visit.doctor.name ?? "Doctor" } : null);

  // Initial Assessment — the visit itself, with what the patient presented with.
  for (const c of visits) {
    const dk = register(visitDoctorRef(c));
    if (!dk) continue;
    const complaints = c.complaints.map((e) => e.title).filter((t): t is string => Boolean(t));
    const noteComplaints = (c.consultationNotes ?? []).map((n) => n.complaints).filter(Boolean);
    const text = complaints.length ? complaints.join(", ") : noteComplaints.length ? noteComplaints.join(" · ") : null;
    push({
      key: `ia${c.visit.bookingId}`, row: "initial", date: c.visit.date,
      title: text ?? "Consultation recorded",
      detail: [text ? null : "Chief complaints not recorded", c.visit.appointmentType === "video" ? "Video consultation" : "Clinic consultation", clinicLabel(c.visit.clinic)].filter(Boolean).join(" · ") || null,
      status: VISIT_STATUS[c.visit.status].label, doctorKey: dk, bookingId: c.visit.bookingId,
    });
  }

  // Diagnosis (every record, own doctor) / Confirmation (recorded as final only) /
  // Status Change (edits and retractions, exactly as stored).
  for (const d of dxRows) {
    push({
      key: `dx${d.key}`, row: "diagnosis", date: d.date, title: d.name,
      detail: [d.code ? `${d.codeSystem ?? "ICD"} ${d.code}` : null, diagnosisTypeLabel(d.type)].filter(Boolean).join(" · "),
      status: statusOf(d.bookingId), doctorKey: d.doctorKey, bookingId: d.bookingId, dxName: d.name, dxKey: d.key,
    });
    if (d.type === "final") {
      push({
        key: `cf${d.key}`, row: "confirmation", date: d.date, title: d.name,
        detail: ["Recorded as confirmed (final)", d.code ? `${d.codeSystem ?? "ICD"} ${d.code}` : null].filter(Boolean).join(" · "),
        status: statusOf(d.bookingId), doctorKey: d.doctorKey, bookingId: d.bookingId, dxName: d.name, dxKey: d.key,
      });
    }
    if (d.entry?.status === "entered_in_error") {
      push({
        key: `se${d.key}`, row: "status", date: editedOn(d) ?? d.date, title: "Diagnosis retracted",
        detail: [d.name, d.entry.retiredReason].filter(Boolean).join(" · "),
        status: statusOf(d.bookingId), doctorKey: d.doctorKey, bookingId: d.bookingId, dxName: d.name, dxKey: d.key,
      });
    } else {
      const edited = editedOn(d);
      if (edited) {
        push({
          key: `su${d.key}`, row: "status", date: edited, title: "Diagnosis entry edited",
          detail: d.name, status: statusOf(d.bookingId), doctorKey: d.doctorKey, bookingId: d.bookingId, dxName: d.name, dxKey: d.key,
        });
      }
    }
  }

  // Investigation — tests advised by each doctor, plus the medical reports they filed.
  for (const i of h.investigations) {
    // The author first; else the doctor of the consultation the test belongs
    // to — only when that consultation is one the timeline already shows.
    const v = visits.find((c) => c.visit.bookingId === i.bookingId)?.visit ?? null;
    const dk = register(i.author) ?? register(v?.doctor && { id: v.doctor.id, name: v.doctor.name ?? "Doctor" }, {
      photoUrl: v?.doctor?.photoUrl ?? null,
      specialties: v?.doctor?.specializations ?? [],
      clinic: v ? clinicLabel(v.clinic) : null,
      clinicDate: v?.date ?? null,
    });
    if (!dk) continue;
    const priority = i.details?.priority === "stat" ? "Immediately" : i.details?.priority ? String(i.details.priority) : null;
    push({
      key: `iv${i.id}`, row: "investigation", date: i.visitDate ?? i.recordedOn ?? null,
      title: i.title ?? "Investigation advised",
      detail: [i.remarks, priority].filter(Boolean).join(" · ") || null,
      status: statusOf(i.bookingId), doctorKey: dk, bookingId: i.bookingId,
    });
  }
  for (const d of docs) {
    if (!isMedicalReport(d)) continue;
    const who = d.source === "doctor" && d.recordedBy ? d.recordedBy : d.doctorName ? { id: null, name: d.doctorName } : null;
    const dk = register(who);
    if (!dk) continue;
    push({
      key: `rp${d.id}`, row: "investigation", date: d.recordDate,
      title: d.tag?.trim() || d.originalName || documentKindLabel(d),
      detail: [documentKindLabel(d), d.location].filter(Boolean).join(" · ") || null,
      status: "Available", doctorKey: dk, bookingId: null, doc: d,
    });
  }

  // Treatment — each doctor's treatment notes and signed prescriptions (with their medicines).
  for (const c of visits) {
    const dk = register(visitDoctorRef(c));
    if (!dk) continue;
    for (const n of (c.consultationNotes ?? []).filter((x) => x.treatment && x.treatment.trim())) {
      push({
        key: `tn${n.id}`, row: "treatment", date: c.visit.date, title: n.treatment!,
        detail: [c.visit.appointmentType === "video" ? "Video consultation" : "Clinic consultation", clinicLabel(c.visit.clinic)].filter(Boolean).join(" · ") || null,
        status: VISIT_STATUS[c.visit.status].label, doctorKey: dk, bookingId: c.visit.bookingId,
      });
    }
  }
  for (const rx of rxs) {
    const v = rx.bookingId ? visitOf(h, rx.bookingId) : null;
    const dk = register(v?.doctor ? { id: v.doctor.id, name: v.doctor.name ?? "Doctor" } : null) ?? register(rx.doctor ? { id: rx.doctor.id, name: rx.doctor.name ?? "Doctor" } : null);
    if (!dk) continue;
    const meds = rx.items.map(medicineLabel);
    push({
      key: `rx${rx.id}`, row: "treatment", date: rxDay(rx),
      title: rx.noMedication
        ? `Prescription${rx.rxNumber ? ` ${rx.rxNumber}` : ""} — no medication`
        : `Prescription${rx.rxNumber ? ` ${rx.rxNumber}` : ""} · ${meds.slice(0, 3).join(", ")}${meds.length > 3 ? ` +${meds.length - 3} more` : ""}`,
      detail: rx.advice ?? null,
      status: statusOf(rx.bookingId), doctorKey: dk, bookingId: rx.bookingId,
    });
  }

  // Follow-up — as planned per consultation, with the doctor who planned it.
  for (const c of visits) {
    const fu = c.followUp;
    if (!fu?.followUpOn) continue;
    const dk = register(fu.doctor ?? visitDoctorRef(c));
    if (!dk) continue;
    push({
      key: `fu${c.visit.bookingId}`, row: "followup", date: fu.followUpOn,
      title: fu.note ?? fu.serviceName ?? "Follow-up planned",
      detail: [fu.status?.label, fu.serviceName && `${fu.serviceName}${fu.serviceQuantity ? ` ×${fu.serviceQuantity}` : ""}`, fu.homeCare ? "At home" : null, fu.comments].filter(Boolean).join(" · ") || null,
      status: VISIT_STATUS[c.visit.status].label, doctorKey: dk, bookingId: c.visit.bookingId,
    });
  }

  // Reconciliation — no reconciliation records exist in the backend; the row stays
  // empty and the summary says "not recorded" instead of inventing a status.

  // Identity stays exactly as each record carries it: the doctor's user id
  // when the record has one, else the recorded name. Identities are never
  // merged by name — two entries appear as one doctor only when the record
  // itself connects them.
  const invBookingIds = new Set(h.investigations.map((i) => i.bookingId).filter((b): b is string => Boolean(b)));

  // Order: records chronological inside a cell, doctors by most recent activity.
  const byDate = (a: { date: string | null; key: string }, b: { date: string | null; key: string }) =>
    String(a.date ?? "9999").localeCompare(String(b.date ?? "9999")) || a.key.localeCompare(b.key);
  records.sort(byDate);

  const lastActivity = new Map<string, string | null>();
  for (const r of records) {
    const cur = lastActivity.get(r.doctorKey) ?? null;
    if (r.date && (!cur || r.date > cur)) lastActivity.set(r.doctorKey, r.date);
  }
  const countByKey = new Map<string, number>();
  for (const r of records) countByKey.set(r.doctorKey, (countByKey.get(r.doctorKey) ?? 0) + 1);
  const doctors: CompDoctor[] = [...registry.values()]
    .map((d) => ({ key: d.key, id: d.id, name: d.name, photoUrl: d.photoUrl, specialties: [...d.specialties], clinic: d.clinic, eventCount: 0, tone: 0 }))
    .sort((a, b) => String(lastActivity.get(b.key) ?? "").localeCompare(String(lastActivity.get(a.key) ?? "")) || a.name.localeCompare(b.name));
  doctors.forEach((d, i) => { d.tone = i % COMP_TONES.length; d.eventCount = countByKey.get(d.key) ?? 0; });

  const comparison: Comparison = { doctors, records, dxRows, invBookingIds, summary: summarize(doctors, records, dxRows), insights: [] };
  comparison.insights = insightsOf(comparison);
  return comparison;
}

// ── Summary & insights (calculated only from the records in view) ─────────────

function summarize(doctors: CompDoctor[], records: CompRecord[], dxRows: (DiagnosisRow & { doctorKey: string })[]): CompSummary {
  // The same condition recorded more than once: same ICD code, else same name
  // (the structured relationship the Diagnosis Records page already uses).
  const groups = new Map<string, { name: string; doctorKeys: Set<string> }>();
  for (const d of dxRows) {
    const k = conditionKey(d);
    const g = groups.get(k) ?? { name: d.name, doctorKeys: new Set<string>() };
    g.doctorKeys.add(d.doctorKey);
    groups.set(k, g);
  }
  const matching = [...groups.values()].filter((g) => g.doctorKeys.size >= 2);
  const separate = dxRows.filter((d) => (groups.get(conditionKey(d))?.doctorKeys.size ?? 1) === 1).length;
  const consultations = new Set(records.filter((r) => r.row === "initial").map((r) => r.bookingId).filter(Boolean)).size;
  const reports = records.filter((r) => r.row === "investigation" && r.doc).length;
  return { doctors: doctors.length, diagnoses: dxRows.length, matching: { count: matching.length, names: matching.map((g) => g.name) }, separate, consultations, reports };
}

function insightsOf(c: Comparison): CompInsight[] {
  const out: CompInsight[] = [];
  const dxDoctors = new Set(c.dxRows.map((d) => d.doctorKey));
  const conditions = new Set(c.dxRows.map((d) => conditionKey(d)));
  // Different diagnoses recorded by multiple doctors.
  if (dxDoctors.size >= 2 && conditions.size >= 2) {
    out.push({ key: "diff-dx", icon: "FiColumns", color: COMP_TONES[2].fg, text: `Different diagnoses are recorded by ${dxDoctors.size} doctors — each entry stays under its own doctor, never merged.` });
  }
  // Different laterality recorded in diagnosis entries of the same condition.
  const lateralityGroups = new Map<string, { name: string; values: Set<string> }>();
  for (const d of c.dxRows) {
    const lat = lateralityOf(d);
    if (!lat) continue;
    const k = conditionKey(d);
    const g = lateralityGroups.get(k) ?? { name: d.name, values: new Set<string>() };
    g.values.add(lat.toLowerCase());
    lateralityGroups.set(k, g);
  }
  for (const g of lateralityGroups.values()) {
    if (g.values.size > 1) out.push({ key: `lat-${g.name}`, icon: "FiCompass", color: COMP_TONES[3].fg, text: `Different laterality recorded for ${g.name}: ${[...g.values].join(" vs ")}.` });
  }
  // Investigations advised alongside a diagnosis (same consultation, joined on booking id).
  const withInv = c.dxRows.filter((d) => d.bookingId && c.invBookingIds.has(d.bookingId)).length;
  if (withInv > 0) out.push({ key: "inv-linked", icon: "FiDroplet", color: COMP_TONES[4].fg, text: `${withInv} diagnosi${withInv === 1 ? "s has" : "es have"} investigations advised in the same consultation.` });
  // Treatment recorded by different doctors.
  const treatDoctors = new Set(c.records.filter((r) => r.row === "treatment").map((r) => r.doctorKey));
  if (treatDoctors.size >= 2) out.push({ key: "treat-doctors", icon: "FiActivity", color: COMP_TONES[0].fg, text: `Treatment is recorded by ${treatDoctors.size} different doctors.` });
  // Reconciliation: no reconciliation records exist in the system — nothing is
  // shown here unless one is actually recorded.
  return out;
}

// ── Filtering (the existing dashboard filters, applied to the comparison) ────

export function filterComparison(base: Comparison, f: DashFilters): Comparison {
  const active = f.from || f.to || f.doctorId || f.specialty || f.kind || f.diagnosis || f.status;
  if (!active) return base;

  const kindRows = f.kind ? new Set(KIND_ROWS[f.kind]) : null;
  const dxBookings = f.diagnosis ? new Set(base.dxRows.filter((d) => d.name === f.diagnosis).map((d) => d.bookingId).filter(Boolean)) : null;

  const records = base.records.filter((r) =>
    (!f.from || (r.date != null && r.date >= f.from)) &&
    (!f.to || (r.date != null && r.date <= f.to)) &&
    (!f.status || r.status === f.status) &&
    (!kindRows || kindRows.has(r.row)) &&
    (!dxBookings || dxBookings.has(r.bookingId ?? "") || r.dxName === f.diagnosis)
  );

  let doctors = base.doctors.filter((d) =>
    (!f.doctorId || d.key === f.doctorId) &&
    (!f.specialty || d.specialties.includes(f.specialty))
  );
  const docKeys = new Set(doctors.map((d) => d.key));
  const records2 = records.filter((r) => docKeys.has(r.doctorKey));
  // A doctor column stays only while the doctor still has a visible record.
  const withRecords = new Set(records2.map((r) => r.doctorKey));
  doctors = doctors.filter((d) => withRecords.has(d.key));
  const doctorKeys2 = new Set(doctors.map((d) => d.key));

  const dxRows = base.dxRows.filter((d) =>
    (!f.from || (d.date != null && d.date >= f.from)) &&
    (!f.to || (d.date != null && d.date <= f.to)) &&
    (!f.diagnosis || d.name === f.diagnosis) &&
    doctorKeys2.has(d.doctorKey)
  );

  const comparison: Comparison = { doctors, records: records2, dxRows, invBookingIds: base.invBookingIds, summary: summarize(doctors, records2, dxRows), insights: [] };
  comparison.insights = insightsOf(comparison);
  return comparison;
}
