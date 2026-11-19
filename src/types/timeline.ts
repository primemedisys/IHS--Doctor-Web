/**
 * Treatment timeline (docs/treatment-timeline) — mirrors the backend's
 * `serializeTimelineRow` exactly. One row per completed consultation.
 */

export type TimelineSort = "newest" | "oldest";

export interface TimelineFilters {
  year?: number;
  month?: number;
  sort?: TimelineSort;
}

export interface TimelineRow {
  bookingId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  startTime: string | null;
  mode: "clinic" | "video";
  /**
   * NULL for a video consult — the backend deliberately sends no label, so the
   * wording ("Video consultation") lives with the UI.
   */
  location: { name: string | null; city: string | null } | null;
  doctor: { id: string; name: string | null; specialization: string | null };
  /** Note diagnosis → prescription diagnosis → note complaints → null. */
  issue: string | null;
  /**
   * The clinic that arranged this consultation, if any — renders as
   * "Arranged by X Clinic". NULL when the patient booked the doctor directly,
   * which is every row created before the clinic portal existed. The backend
   * has always sent this to both viewers; it simply wasn't declared here.
   */
  bookedBy: {
    id: string;
    role: string | null;
    name: string | null;
    phone: string | null;
    city: string | null;
  } | null;
  /**
   * `id` is null and `canView` false for a DOCTOR viewer — the PDF is
   * patient-only, enforced server-side by omitting the id entirely.
   */
  prescription: { id: string | null; rxNumber: string | null; canView: boolean } | null;
}

export interface TimelineResult {
  rows: TimelineRow[];
  /** Every year with consultations — computed over the full history, not the capped page. */
  years: number[];
  total: number;
  /** True when the 200-row cap was hit. */
  capped: boolean;
}

/**
 * My Patients status (backend migration 023). `new_patient` / `opd_followup`
 * are derived from visit count unless the doctor overrides; the surgery pair
 * is always doctor-set.
 */
export type PatientStatus = "new_patient" | "opd_followup" | "surgery_pending" | "surgery_followup";

/** One My Patients roster row (docs/treatment-timeline §5.4). */
export interface DoctorPatient {
  patient: {
    id: string;
    /** "IHS-P-000123" — the real user id in the display format. */
    regNo: string | null;
    name: string | null;
    phone: string | null;
    photoUrl: string | null;
    age: number | null;
    gender: string | null;
  };
  /** "addressLine, city" — what the patient filled on their profile. */
  address: string | null;
  /** Effective status: the doctor's override, else derived from visit count. */
  status: PatientStatus;
  consultationCount: number;
  /** "YYYY-MM-DD" */
  lastSeenOn: string | null;
  /** The latest treated booking — anchors "open the full record". */
  lastBookingId: string | null;
}

export interface DoctorPatientsResult {
  patients: DoctorPatient[];
  total: number;
  capped: boolean;
  /** Present on a paginated request. */
  page?: number;
  limit?: number;
  totalPages?: number;
}

/** Server-side roster query (search: name / mobile / registration no.). */
export interface MyPatientsQuery {
  q?: string;
  page: number;
  limit: number;
  sort: "recent" | "oldest" | "name" | "visits";
  status?: PatientStatus;
}
