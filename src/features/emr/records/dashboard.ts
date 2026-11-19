/**
 * Pure derivations for the Clinical Dashboard. Everything is built from rows the
 * server already authorised (history, documents, vitals) — nothing is stored,
 * guessed or invented. Each event keeps the doctor who recorded it; different
 * doctors' records are never merged and a later diagnosis never replaces an
 * earlier one.
 */
import { VISIT_STATUS, istToday } from "../format";
import { documentGroupOf, documentKindLabel } from "@/features/records/documentKinds";
import { sourceLabel } from "../components/PatientDocuments";
import { diagnosisRows, rxDay, signedRx } from "./derive";
import type { HistoryConsultation, MedicalHistory, PatientDocument, VisitRxItem, VitalEntry } from "@/types/emr";

export type EvKind = "consultation" | "diagnosis" | "prescription" | "report" | "investigation" | "vitals" | "treatment" | "follow_up";

export const EV_KIND: Record<EvKind, { label: string; icon: string; color: string; bg: string }> = {
  consultation: { label: "Consultation", icon: "FiUser", color: "#2F5FA8", bg: "#E6EEFB" },
  diagnosis: { label: "Diagnosis", icon: "FiSearch", color: "#7543C6", bg: "#F0EAFE" },
  prescription: { label: "Prescription", icon: "FiCheckCircle", color: "#16834A", bg: "#E5F5E9" },
  report: { label: "Medical report", icon: "FiFileText", color: "#138477", bg: "#E3F4F1" },
  investigation: { label: "Investigation", icon: "FiClipboard", color: "#138477", bg: "#E3F4F1" },
  vitals: { label: "Vitals", icon: "FiHeart", color: "#4F6B8A", bg: "#EBF0F5" },
  treatment: { label: "Treatment", icon: "FiActivity", color: "#D97706", bg: "#FFF0DD" },
  follow_up: { label: "Follow-up", icon: "FiCalendar", color: "#D6336C", bg: "#FCE7F0" },
};

export type DashDoctor = { id: string | null; name: string; photoUrl?: string | null };

export interface DashEvent {
  id: string;
  kind: EvKind;
  date: string | null;
  title: string;
  detail: string | null;
  doctor: DashDoctor | null;
  specialties: string[];
  clinic: string | null;
  bookingId: string | null;
  status: string;
  diagnosisNames: string[];
  /** Diagnosis events: the status exactly as recorded, and the ICD code. */
  dxType?: string;
  code?: string | null;
  /** Document events with no doctor: who added it (patient, lab, clinic…). */
  origin?: string | null;
  doc?: PatientDocument;
}

export interface DashRow {
  key: string;
  kind: "visit" | "report";
  date: string | null;
  bookingId: string | null;
  doctor: DashDoctor | null;
  specialties: string[];
  clinic: string | null;
  diagnoses: { name: string; type: string; code: string | null }[];
  records: string[];
  medicines: string[];
  treatment: string | null;
  status: string;
  statusColor: "default" | "warning" | "info" | "success" | "error";
  kinds: EvKind[];
  consultation?: HistoryConsultation;
  doc?: PatientDocument;
}

/** Consultations that already took place (an upcoming booking has no record yet). */
export const pastVisits = (h: MedicalHistory) => {
  const today = istToday();
  return h.consultations.filter((c) => c.visit.status !== "no_show" && (c.visit.status === "completed" || c.visit.date <= today));
};

const clinicName = (c: HistoryConsultation["visit"]["clinic"]) => (c ? `${c.name}${c.city ? `, ${c.city}` : ""}` : null);
const vitalsSummary = (v: VitalEntry) => {
  const x = v.values;
  const bits = [
    x.bpSystolic != null && x.bpDiastolic != null ? `BP ${x.bpSystolic}/${x.bpDiastolic} mmHg` : null,
    x.heartRateBpm != null ? `HR ${x.heartRateBpm} bpm` : x.pulseRateBpm != null ? `Pulse ${x.pulseRateBpm} bpm` : null,
    x.spo2Percent != null ? `SpO₂ ${x.spo2Percent}%` : null,
    x.temperatureF != null ? `Temp ${x.temperatureF} °F` : null,
    x.weightKg != null ? `Weight ${x.weightKg} kg` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
};

/**
 * A signed prescription's PDF is filed as a document too, but it is the
 * prescription (shown with its medicines), not a medical report.
 */
export const isMedicalReport = (d: PatientDocument) => documentGroupOf(d) !== "prescriptions";

/** "Paracetamol 500 mg · 1 tab, BD" — strength only when the name does not already carry it. */
export const medicineLabel = (i: VisitRxItem) => {
  const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const name = i.strength && !squash(i.medicineName).includes(squash(i.strength)) ? `${i.medicineName} ${i.strength}` : i.medicineName;
  const how = [i.dosage, i.frequency].filter(Boolean).join(", ");
  return how ? `${name} · ${how}` : name;
};

export function buildDash(h: MedicalHistory, docs: PatientDocument[]) {
  // Doctor photographs, keyed by the doctor's user id (from the visits' own doctor relationship).
  const photos = new Map<string, string>();
  const specialtiesByDoctor = new Map<string, string[]>();
  for (const c of h.consultations) {
    if (c.visit.doctor?.photoUrl) photos.set(c.visit.doctor.id, c.visit.doctor.photoUrl);
    if (c.visit.doctor?.specializations?.length) specialtiesByDoctor.set(c.visit.doctor.id, c.visit.doctor.specializations);
  }
  const withPhoto = (d: { id: string | null; name: string } | null): DashDoctor | null => (d ? { ...d, photoUrl: d.id ? photos.get(d.id) ?? null : null } : null);
  // A diagnosis typed on a prescription is not a second diagnosis when the same visit already holds it as a structured entry.
  const rawDx = diagnosisRows(h);
  const structured = new Set(rawDx.filter((d) => d.source === "entry").map((d) => `${d.bookingId}|${d.name.trim().toLowerCase()}`));
  const dxAll = rawDx.filter((d) => d.source === "entry" || !structured.has(`${d.bookingId}|${d.name.trim().toLowerCase()}`));
  const dxByBooking = new Map<string, typeof dxAll>();
  for (const d of dxAll) if (d.bookingId) dxByBooking.set(d.bookingId, [...(dxByBooking.get(d.bookingId) ?? []), d]);
  const rxByBooking = new Map<string, MedicalHistory["prescriptions"]>();
  for (const r of signedRx(h)) if (r.bookingId) rxByBooking.set(r.bookingId, [...(rxByBooking.get(r.bookingId) ?? []), r]);
  const invByBooking = new Map<string, MedicalHistory["investigations"]>();
  for (const i of h.investigations) if (i.bookingId) invByBooking.set(i.bookingId, [...(invByBooking.get(i.bookingId) ?? []), i]);

  // Past visits, plus any visit that already holds a diagnosis or a signed prescription
  // (it took place, whatever its slot date says).
  const past = new Set(pastVisits(h));
  const visits = h.consultations.filter((c) => past.has(c) || dxByBooking.has(c.visit.bookingId) || rxByBooking.has(c.visit.bookingId));

  const events: DashEvent[] = [];
  const rows: DashRow[] = [];

  for (const c of visits) {
    const v = c.visit;
    const doctor = v.doctor ? withPhoto({ id: v.doctor.id, name: v.doctor.name ?? "Doctor" }) : null;
    const base = { doctor, specialties: v.doctor?.specializations ?? [], clinic: clinicName(v.clinic), bookingId: v.bookingId };
    const st = VISIT_STATUS[v.status];
    const dx = dxByBooking.get(v.bookingId) ?? [];
    const dxNames = dx.map((d) => d.name);
    const rxs = rxByBooking.get(v.bookingId) ?? [];
    const meds = rxs.flatMap((r) => r.items.map(medicineLabel));
    const inv = (c.investigations ?? []).map((i) => i.title).filter((t): t is string => Boolean(t));
    const planBits = [
      ...(c.consultationNotes ?? []).map((n) => n.treatment).filter(Boolean),
      ...rxs.map((r) => r.advice).filter(Boolean),
    ] as string[];
    const fu = c.followUp;
    const treatment = [planBits.join(" · ") || null, fu?.followUpOn ? `Follow-up ${fu.followUpOn}` : null].filter(Boolean).join(" — ") || null;
    const kinds: EvKind[] = ["consultation"];
    if (dx.length) kinds.push("diagnosis");
    if (rxs.length) kinds.push("prescription");
    if (inv.length) kinds.push("investigation");
    if (c.vitals.length) kinds.push("vitals");
    if (planBits.length) kinds.push("treatment");
    if (fu?.followUpOn) kinds.push("follow_up");

    rows.push({
      key: `v${v.bookingId}`, kind: "visit", date: v.date, ...base,
      diagnoses: dx.map((d) => ({ name: d.name, type: d.type, code: d.code })),
      records: inv, medicines: meds, treatment, status: st.label, statusColor: st.color, kinds, consultation: c,
    });

    const mk = (kind: EvKind, id: string, title: string, detail: string | null, date: string | null): DashEvent => ({
      id, kind, date, title, detail, ...base, status: st.label, diagnosisNames: dxNames,
    });
    events.push(mk("consultation", `c${v.bookingId}`, `${v.appointmentType === "video" ? "Video" : "Clinic"} consultation`, (c.consultationNotes ?? []).map((n) => n.complaints).filter(Boolean).join(" · ") || null, v.date));
    for (const t of c.vitals) events.push(mk("vitals", `vt${t.id}`, "Vitals recorded", vitalsSummary(t), t.recordedOn ?? v.date));
    for (const i of c.investigations ?? []) events.push(mk("investigation", `iv${i.id}`, i.title ?? "Investigation advised", i.remarks, i.visitDate ?? i.recordedOn ?? v.date));
    if (planBits.length) events.push(mk("treatment", `tr${v.bookingId}`, "Treatment plan", planBits.join(" · "), v.date));
    if (fu?.followUpOn) events.push(mk("follow_up", `fu${v.bookingId}`, "Follow-up scheduled", [fu.note, fu.status?.label].filter(Boolean).join(" · ") || null, fu.followUpOn));
  }

  // Records whose consultation is not in the history — another doctor's visit that is
  // not marked completed yet, or one beyond the visit cap. Their diagnoses,
  // prescriptions and investigations still arrive (consent-checked) with their own
  // booking id, so they get one row per booking, built only from those records.
  // Joined on booking id alone — never by date or doctor name.
  const known = new Set(h.consultations.map((c) => c.visit.bookingId));
  const unseen = [...new Set([...dxByBooking.keys(), ...rxByBooking.keys(), ...invByBooking.keys()])].filter((id) => !known.has(id));
  for (const id of unseen) {
    const dx = dxByBooking.get(id) ?? [];
    const rxs = rxByBooking.get(id) ?? [];
    const inv = (invByBooking.get(id) ?? []).map((i) => i.title).filter((t): t is string => Boolean(t));
    const advice = rxs.map((r) => r.advice).filter((a): a is string => Boolean(a));
    const who = rxs.find((r) => r.doctor)?.doctor ?? null;
    const doctor = who ? withPhoto({ id: who.id, name: who.name ?? "Doctor" }) : dx[0] ? withPhoto(dx[0].doctor) : null;
    // The visit's own date as carried by its records; never invented.
    const date =
      rxs.map((r) => r.visitDate).find(Boolean) ??
      (invByBooking.get(id) ?? []).map((i) => i.visitDate).find(Boolean) ??
      dx.map((d) => d.entry?.visitDate ?? null).find(Boolean) ??
      [...rxs.map(rxDay), ...dx.map((d) => d.date)].filter((d): d is string => Boolean(d)).sort().at(-1) ??
      null;
    const kinds: EvKind[] = [];
    if (dx.length) kinds.push("diagnosis");
    if (rxs.length) kinds.push("prescription");
    if (inv.length) kinds.push("investigation");
    if (advice.length) kinds.push("treatment");
    rows.push({
      key: `b${id}`, kind: "visit", date, bookingId: id, doctor,
      specialties: doctor?.id ? specialtiesByDoctor.get(doctor.id) ?? [] : [], clinic: null,
      diagnoses: dx.map((d) => ({ name: d.name, type: d.type, code: d.code })),
      records: inv, medicines: rxs.flatMap((r) => r.items.map(medicineLabel)), treatment: advice.join(" · ") || null,
      // The same status the timeline already gives these records when their visit is not in the history.
      status: rxs.length ? "Signed" : "Recorded", statusColor: rxs.length ? "success" : "default", kinds,
    });
  }

  // Diagnoses: every record, with its own doctor — never merged or overwritten.
  for (const d of dxAll) {
    const v = d.bookingId ? visits.find((c) => c.visit.bookingId === d.bookingId)?.visit : null;
    events.push({
      id: d.key, kind: "diagnosis", date: d.date, title: d.name,
      detail: [d.code ? `${d.codeSystem ?? "ICD"} ${d.code}` : null, d.type === "from prescription" ? "From prescription" : d.type].filter(Boolean).join(" · "),
      doctor: withPhoto(d.doctor), specialties: d.specialties, clinic: v ? clinicName(v.clinic) : null, bookingId: d.bookingId,
      status: v ? VISIT_STATUS[v.status].label : "Recorded", diagnosisNames: [d.name], dxType: d.type, code: d.code,
    });
  }
  for (const r of signedRx(h)) {
    const v = r.bookingId ? visits.find((c) => c.visit.bookingId === r.bookingId)?.visit : null;
    events.push({
      id: `rx${r.id}`, kind: "prescription", date: rxDay(r), title: `Prescription${r.rxNumber ? ` ${r.rxNumber}` : ""}`,
      detail: r.items.map((i) => i.medicineName).join(", ") || "Medication not needed",
      doctor: r.doctor ? withPhoto({ id: r.doctor.id, name: r.doctor.name ?? "Doctor" }) : null,
      specialties: v?.doctor?.specializations ?? [], clinic: v ? clinicName(v.clinic) : null, bookingId: r.bookingId,
      status: v ? VISIT_STATUS[v.status].label : "Signed", diagnosisNames: r.bookingId ? (dxByBooking.get(r.bookingId) ?? []).map((d) => d.name) : [],
    });
  }
  // Documents carry no ordering consultation in the record, so none is linked or guessed.
  for (const d of docs) {
    const title = d.tag?.trim() || d.originalName || documentKindLabel(d);
    // Only a document filed BY a doctor is attributed (and photographed) through that doctor's account.
    const filedByDoctor = d.source === "doctor" && d.recordedBy;
    const doctor = filedByDoctor ? withPhoto({ id: d.recordedBy!.id, name: d.recordedBy!.name }) : d.doctorName ? { id: null, name: d.doctorName } : null;
    events.push({ id: `d${d.id}`, kind: "report", date: d.recordDate, title, detail: `${documentKindLabel(d)}${d.location ? ` · ${d.location}` : ""}`, doctor, specialties: [], clinic: d.location, bookingId: null, status: "Available", diagnosisNames: [], doc: d, origin: sourceLabel(d) });
    // A prescription PDF is already its prescription's row (with its medicines) — not a medical report row.
    if (!isMedicalReport(d)) continue;
    rows.push({
      key: `d${d.id}`, kind: "report", date: d.recordDate, bookingId: null, doctor, specialties: [], clinic: d.location,
      diagnoses: [], records: [title], medicines: [], treatment: null, status: "Available", statusColor: "info", kinds: ["report"], doc: d,
    });
  }

  const byDateDesc = (a: { date: string | null }, b: { date: string | null }) => String(b.date ?? "").localeCompare(String(a.date ?? ""));
  events.sort(byDateDesc);
  rows.sort(byDateDesc);
  return { events, rows, visits };
}

export interface DashFilters {
  from: string;
  to: string;
  doctorId: string;
  specialty: string;
  kind: "" | EvKind;
  diagnosis: string;
  status: string;
}
export const EMPTY_FILTERS: DashFilters = { from: "", to: "", doctorId: "", specialty: "", kind: "", diagnosis: "", status: "" };

type Filterable = { date: string | null; doctor: { id: string | null; name: string } | null; specialties: string[]; status: string };
const common = (x: Filterable, f: DashFilters) =>
  (!f.from || (x.date != null && x.date >= f.from)) &&
  (!f.to || (x.date != null && x.date <= f.to)) &&
  (!f.doctorId || x.doctor?.id === f.doctorId) &&
  (!f.specialty || x.specialties.includes(f.specialty)) &&
  (!f.status || x.status === f.status);

export const filterRows = (rows: DashRow[], f: DashFilters) =>
  rows.filter((r) => common(r, f) && (!f.kind || r.kinds.includes(f.kind)) && (!f.diagnosis || r.diagnoses.some((d) => d.name === f.diagnosis)));

export const filterEvents = (events: DashEvent[], f: DashFilters) =>
  events.filter((e) => common(e, f) && (!f.kind || e.kind === f.kind) && (!f.diagnosis || e.diagnosisNames.includes(f.diagnosis)));

// ── Analytics ───────────────────────────────────────────────────────────────
export const monthOf = (d: string | null) => (d ? d.slice(0, 7) : null);
export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
};

export function countBy<T>(items: T[], key: (t: T) => string | null | undefined): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Per-month counts over the months that actually have records (no invented empty months). */
export function byMonth<T>(items: T[], date: (t: T) => string | null): { month: string; label: string; value: number }[] {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = monthOf(date(i));
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([month, value]) => ({ month, label: monthLabel(month), value }));
}

export const reportGroup = (d: PatientDocument) => {
  const k = d.documentKind ?? d.fileType ?? "";
  if (k === "xray") return "X-ray";
  if (k === "mri") return "MRI";
  if (k === "ct_scan") return "CT scan";
  if (k === "ultrasound" || k === "ecg") return documentKindLabel(d);
  if (k === "lab_report" || k.startsWith("lab")) return "Laboratory";
  return documentGroupOf(d) === "investigations" ? documentKindLabel(d) : "Other documents";
};
