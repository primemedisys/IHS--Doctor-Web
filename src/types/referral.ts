/**
 * Multi-doctor referral types (docs/multi-doctor-referrals). A referral is a
 * directed hand-off — Dr A ──(reason)──▶ Dr B — made from a consultation A owns.
 * Mirrors the backend `serializeReferral` / `serializeReferralTarget` shapes.
 */
export type ReferralStatus = "pending" | "booked" | "completed" | "cancelled" | "declined";

/** One suggestion in the name autocomplete (serializeReferralTarget). */
export interface ReferralTarget {
  id: string;
  name: string;
  photo: string | null;
  specializations: string[];
  clinicName: string | null;
  /** True when this doctor shares the source booking's clinic (Decision §9.2b). */
  sameClinic: boolean;
}

/** A referral edge as the doctor UI consumes it (serializeReferral). */
export interface Referral {
  id: string;
  journeyId: string | null;
  status: ReferralStatus;
  reason: string;
  note: string | null;
  fromDoctor: { id: string; name: string | null } | null;
  toDoctor: {
    id: string;
    name: string | null;
    slug: string | null;
    specialization: string | null;
    photo: string | null;
  } | null;
  sourceBookingId: string | null;
  targetBookingId: string | null;
  createdAt: string;
}

/** The body a doctor submits to create a referral. */
export interface CreateReferralInput {
  toDoctorId: string;
  reason: string;
  note?: string;
}

// ── Target-doctor side: "who referred a patient TO me" ───────────────────────

/** An inbox item — a referral another doctor sent to the signed-in doctor. */
export interface IncomingReferral {
  id: string;
  status: ReferralStatus;
  reason: string;
  note: string | null;
  createdAt: string;
  fromDoctor: {
    id: string;
    name: string | null;
    slug: string | null;
    specialization: string | null;
    photo: string | null;
  } | null;
  patient: { id: string | null; name: string | null };
  sourceBookingId: string | null;
  /** B's own appointment once the patient booked from this referral (else null). */
  targetBookingId: string | null;
}

/** The referring doctor's finalized prescription, as read by the referral target. */
export interface ReferralCasePrescription {
  id: string;
  bookingId: string | null;
  rxNumber: string | null;
  version: number;
  doctor: { name: string | null; qualification: string | null };
  clinic: { name: string; address: string | null } | null;
  diagnosis: string | null;
  advice: string | null;
  adviceSelected: string[];
  followUpDate: string | null;
  items: {
    medicineName: string;
    dosage: string | null;
    route: string;
    frequency: string | null;
    timing: string | null;
    durationDays: number | null;
    notes: string | null;
  }[];
  pdfUrl: string | null;
  finalizedAt: string | null;
}

/** The shared case behind an incoming referral: the referring doctor's notes + Rx. */
export interface ReferralCase {
  referral: IncomingReferral;
  reports: import("@/types/appointment").ClinicalNote[];
  prescription: ReferralCasePrescription | null;
}
