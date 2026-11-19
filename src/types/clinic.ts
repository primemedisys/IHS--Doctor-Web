/**
 * The signed-in doctor's OWN clinic + availability editor shapes — distinct from
 * the public `Clinic`/`OnlineAvailability` discovery types in `./doctor`. These
 * mirror the backend serializers (utils/serializers.js: serializeOwnClinic,
 * serializeWeeklySlot, serializeException) and the contract in
 * docs/clinics-availability/integration-plan.md §2.
 */

/**
 * One CONSULTING WINDOW in the weekly schedule (docs/consultation-queue).
 *
 * It stopped being a slot generator at migration 027: the window is the day's
 * session, patients take a token inside it, and `slotDurationMinutes` — sent
 * back as `avgConsultMinutes` under its real meaning — only seeds the waiting
 * estimate. The old key is still on the wire so this rename did not have to
 * land in three apps on one day.
 */
export interface WeeklySlot {
  id: string;
  dayOfWeek: number; // 0=Sunday .. 6=Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  /** Expected minutes per patient. NOT a slot length. */
  slotDurationMinutes: number;
  avgConsultMinutes?: number;
  /** Optional cap on tokens for a day built from this window; null = unlimited. */
  maxBookings?: number | null;
  isActive: boolean;
}

/** A window being edited/sent (no id — the whole set is replaced). */
export interface WeeklySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxBookings?: number | null;
}

/** The doctor's own clinic (GET /doctor/clinics). */
export interface OwnClinic {
  id: string;
  name: string;
  addressLine: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  offlineFee: number | null;
  isActive: boolean;
  availability: WeeklySlot[];
}

/** Create/patch body for a clinic (no id / availability). */
export interface ClinicInput {
  name: string;
  addressLine: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  /** Optional map pin — both null for an address typed without Google Maps. */
  lat: number | null;
  lng: number | null;
  phone?: string | null;
  offlineFee: number;
  isActive?: boolean;
}

/** A blocked-date exception (GET /doctor/exceptions). */
export interface AvailabilityException {
  id: string;
  clinicId: string | null; // null = an online-schedule exception
  exceptionDate: string; // "YYYY-MM-DD"
  reason: string | null;
}

export interface ExceptionInput {
  clinicId: string | null;
  exceptionDate: string;
  reason?: string | null;
}
