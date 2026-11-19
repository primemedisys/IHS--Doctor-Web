import type { PatientFollowUp } from "@/types/followUp";
import type { Vitals } from "@/types/prescription";

/** Booking + payment vocabulary (mirrors the backend DB enums). */
export type BookingMode = "video" | "clinic";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus =
  | "initiated"
  | "success"
  | "failed"
  | "refunded"
  | "pending_at_clinic";

/** How an OFFLINE payment is settled: cash at the counter, or the doctor's own UPI QR. */
export type OfflinePaymentMethod = "cash" | "upi_qr";

/**
 * A booking's payment as the doctor sees it (mirrors the backend payment
 * serializer). Only `status` is guaranteed on older cached rows, so the rest is
 * optional. A UPI-QR booking is `mode === "offline" && offlineMethod ===
 * "upi_qr"`: it stays `pending_at_clinic` until the DOCTOR confirms receipt
 * with "Mark paid" — the platform never verifies the transfer itself.
 */
export interface BookingPayment {
  status: PaymentStatus;
  mode?: "online" | "offline" | null;
  offlineMethod?: OfflinePaymentMethod | null;
  /** The UPI transaction id / UTR the patient typed when reporting payment. */
  payerReference?: string | null;
  /** When the patient said "I have paid" (ISO); null until they do. */
  reportedAt?: string | null;
}

/**
 * Who arranged an appointment, when it wasn't the patient (mirrors
 * `serializeBookedBy`). NULL on every booking a patient made themselves — which
 * is every booking made before the clinic portal existed.
 */
export interface BookedBy {
  id: string;
  role: string | null;
  /** The clinic's name, falling back to the account name. */
  name: string | null;
  phone: string | null;
  city: string | null;
}

/** A booking row as the DOCTOR sees it (mirrors `serializeBookingForDoctor`). */
export interface Appointment {
  id: string;
  mode: BookingMode;
  /**
   * `photoUrl` is null until the patient uploads one; rows fall back to
   * initials. Age/phone/address print under the name on the roster and are all
   * optional — a patient who never completed their profile has none of them.
   */
  patient: {
    id: string | null;
    name: string | null;
    photoUrl?: string | null;
    phone?: string | null;
    age?: number | null;
    gender?: string | null;
    addressLine?: string | null;
    city?: string | null;
    state?: string | null;
  };
  /** This patient's current follow-up for the signed-in doctor; null when untagged. */
  followUp?: PatientFollowUp | null;
  /**
   * Who sent this patient here, and who they were sent on to
   * (`serializeBookingReferrals`). Only the appointments LIST carries it; every
   * other read of this shape leaves it undefined, so treat absent and null
   * alike — "no referral either way".
   */
  referrals?: BookingReferrals | null;
  /** Where an offline consult happens; null on a video booking. `city` is the
   *  Location column's second line — it may be absent on an older cached row. */
  clinic: { id: string | null; name: string; city?: string | null } | null;
  date: string; // "YYYY-MM-DD"
  startTime: string | null; // "HH:mm"
  endTime: string | null;
  status: BookingStatus;
  amount: number;
  paymentMode: "online" | "offline";
  payment: BookingPayment | null;
  /** The in-app "Join call" deep link for a video consult; null otherwise. */
  meetLink: string | null;
  /** Set when a clinic booked this on the patient's behalf; null otherwise. */
  bookedBy: BookedBy | null;
  /** When the booking was created (ISO) — the appointments list orders by this. */
  createdAt: string;
}

/** One end of a referral, as the roster's Referral column needs it. */
export interface ReferralPeer {
  id: string | null;
  name: string | null;
  specialization?: string | null;
}

/** A referral edge trimmed for the roster (mirrors `serializeBookingReferrals`). */
export interface BookingReferralMini {
  id: string;
  status: "pending" | "booked" | "completed" | "cancelled" | "declined";
  reason: string | null;
  fromDoctor: ReferralPeer | null;
  toDoctor: ReferralPeer | null;
}

/**
 * The two directions a consultation can sit between.
 *
 * `incoming` is the referral this booking FULFILS — another doctor sent the
 * patient here. `outgoing` are the referrals made FROM this consultation. Both
 * can be present: referred in, examined, referred on is an ordinary case, not
 * an edge case.
 */
export interface BookingReferrals {
  incoming: BookingReferralMini | null;
  outgoing: BookingReferralMini[];
}

/** An allergy the patient recorded. */
export interface SnapshotAllergy {
  name: string;
  severity?: string | null;
}
export interface SnapshotCondition {
  name: string;
  diagnosedYear?: number | null;
}
export interface SnapshotMedication {
  medicineName: string;
  dosage?: string | null;
  frequency?: string | null;
}
export interface SnapshotRecord {
  /** The row id, so the doctor can PATCH the record's date. Null on stale caches. */
  id?: string | null;
  fileUrl: string;
  tag?: string | null;
  recordDate?: string | null;
  /** When the patient uploaded the file — the date fallback when recordDate is unset. */
  uploadedAt?: string | null;
  /** "prescription" | "lab_report" | "xray" | "mri" | "other" — the kind of document uploaded. */
  fileType?: string | null;
  /** Who uploaded it: "patient" | "doctor" | "clinic" | "admin". */
  source?: string;
  // ── Document-library metadata (backend migration 058) — null on older rows ──
  /** The finer kind the patient picked: "ct_scan", "discharge_summary", … */
  documentKind?: string | null;
  /** Hospital / laboratory where it was done or issued. */
  location?: string | null;
  /** The doctor named on the document (may be outside IHS). */
  doctorName?: string | null;
  description?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  updatedAt?: string | null;
  recordedBy?: { id: string; name: string } | null;
}

/**
 * The clinical snapshot the doctor sees for a confirmed/completed booking — the
 * data the patient saved (mirrors `serializePatientSnapshot`). Only present when
 * the booking is confirmed/completed; `null` otherwise ("unlocks on confirmation").
 */
export interface PatientSnapshot {
  name: string | null;
  phone: string | null;
  /** The patient's profile photo, when they've uploaded one. */
  photoUrl?: string | null;
  age: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  allergies: SnapshotAllergy[];
  conditions: SnapshotCondition[];
  currentMedications: SnapshotMedication[];
  uploadedRecords: SnapshotRecord[];
}

/** `GET /doctor/bookings/:id` — booking facts + (gated) patient snapshot. */
export interface AppointmentDetail {
  booking: Appointment;
  patient: PatientSnapshot | null;
}

/** Filters accepted by the appointments list. */
export interface AppointmentFilters {
  status?: string;
  date?: string;
  clinicId?: string;
}

/**
 * A clinical note — a doctor's dated consultation record for the patient
 * (mirrors `serializeClinicalNote`). Patient-wide: every note the patient has,
 * across doctors and visits.
 *
 * `doctorName` is the authoring DOCTOR and is null on a note a clinic wrote at
 * its counter; `recordedByName` is the author whatever their role, so prefer it
 * for display and fall back to `doctorName`.
 */
export interface ClinicalNote {
  id: string;
  date: string; // ISO datetime the note was written (the timeline key)
  doctorName: string | null;
  source?: "patient" | "doctor" | "clinic";
  recordedByName?: string | null;
  recordedBy?: { id: string; name: string } | null;
  complaints: string | null; // c/o
  onExamination: string | null; // o/e
  historyMedical: string | null; // h/o medical
  historySurgical: string | null; // h/o surgical
  diagnosis: string | null;
  treatment: string | null;
  /** Vitals recorded with the note (same shape as the prescription's Vitals). */
  vitals: Vitals;
}

/**
 * The patient's self-recorded vitals timeline as the record-table matrix
 * (mirrors backend `serializePatientVitals`) — `fields` are the rows, `entries`
 * the dated columns (newest-first), `values[field.key]` the cell.
 */
/**
 * How a reading compares to its adult reference range (backend
 * `config/vitalsRanges.js` — the ONE place thresholds live, shared with the
 * patient app so a doctor and a patient can never see different verdicts on
 * the same number).
 *
 * Severity, not direction: a dangerously low SpO₂ or temperature is
 * `critical`, never `low`. `unknown` means NOT EVALUATED (under 18, no date of
 * birth, unparseable, or a field with no range) and must render like `normal`.
 */
export type VitalStatus = "normal" | "low" | "borderline" | "high" | "critical" | "unknown";

export interface VitalRange {
  min: number | null;
  max: number | null;
  /** BP only, e.g. "< 130/85". */
  display?: string;
}

export interface VitalStatusInfo {
  status: VitalStatus;
  label?: string;
  normal?: VitalRange | null;
  reason?: string;
}

export interface VitalsField {
  key: string;
  label: string;
  unit: string;
  derived?: boolean;
  /** Absent for Weight and Height — neither has an adult reference range. */
  normal?: VitalRange | null;
}
export interface VitalsEntry {
  id: string;
  recordedOn: string; // "YYYY-MM-DD"
  source: "patient" | "doctor" | "clinic";
  /** The author, for the source chip. Null on pre-provenance rows. */
  recordedBy?: { id: string; name: string } | null;
  note: string | null;
  location: string | null;
  values: Record<string, number | string | null>;
  /** Parallel to `values`; `values` itself is untouched. */
  statuses: Record<string, VitalStatusInfo>;
}
export interface VitalsMatrix {
  fields: VitalsField[];
  entries: VitalsEntry[];
}

/** The body to log one dated vitals reading onto a patient's record (≥1 vital). */
export interface PatientVitalsInput {
  recordedOn?: string;
  bloodPressure?: string | null;
  pulseRateBpm?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  temperatureF?: number | null;
  spo2Percent?: number | null;
  note?: string | null;
  location?: string | null;
}

/** The fields a doctor fills to add a note (all optional; at least one required). */
export interface ClinicalNoteInput {
  complaints?: string;
  onExamination?: string;
  historyMedical?: string;
  historySurgical?: string;
  diagnosis?: string;
  treatment?: string;
  vitals?: Vitals;
}
