/**
 * Dashboard + earnings contracts — mirror `backend/src/utils/serializers.js`
 * exactly (docs/dashboards-earnings/integration-plan.md §2).
 *
 * Money is `number` (rupees, 2 dp): the backend serializer already cast the
 * DECIMAL-as-string, so no component ever computes `"1000" + "2000"`.
 *
 * The `| null` unions below are load-bearing, not defensive. They force every
 * call site to handle "no data source" at the type level rather than papering
 * over it with `?? 0`, which would render an absent figure as a real zero.
 */

/** Appointment row shapes shared by the dashboard lists. */
export type ApptStatus = "upcoming" | "completed" | "cancelled";
export type ApptMode = "video" | "clinic";

export interface DashAppointment {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  patientName: string;
  mode: ApptMode;
  clinic?: string;
  date: string; // ISO
  time: string;
  status: ApptStatus;
  fee: number;
}

export interface DoctorDashboardSummary {
  todaysAppointments: number;
  patientsThisMonth: number;
  /** Always null until the `reviews` table exists. Renders "—", never "0 stars". */
  averageRating: number | null;
  earnedThisMonth: number;
  /** All-time distinct patients with a confirmed or completed booking. */
  totalPatients: number;
  /** All-time distinct patients with a completed consultation. */
  consultedPatients: number;
  /** All-time net received (successful payments only, after commission). */
  totalRevenue: number;
  /** Non-cancelled bookings; today + previous + upcoming === total. */
  appointments: {
    today: number;
    total: number;
    pending: number;
    previous: number;
    upcoming: number;
  };
}

export interface EarningsSummary {
  period: { from: string; to: string };
  gross: number;
  commission: number;
  /** The headline: what the doctor is actually paid. */
  net: number;
  refunded: number;
  consults: number;
  /** null when consults === 0 — guard before formatting, or you render ₹NaN. */
  averagePerConsult: number | null;
  /** Cash owed by PATIENTS at the clinic. Not a platform payout. */
  awaitingCollection: number;
}

export interface EarningsBucket {
  /** Opaque IST label: "2026-07" (month) or "2026-07-04" (day). Not an instant. */
  bucket: string;
  gross: number;
  commission: number;
  net: number;
  consults: number;
}

export interface EarningsSeries {
  granularity: "month" | "day";
  buckets: EarningsBucket[];
}

export interface LedgerRow {
  id: string;
  paidAt: string;
  date: string | null;
  patientName: string | null;
  /** PAYMENT mode, not booking mode — a clinic visit can be paid online. */
  mode: "online" | "offline";
  gross: number;
  commission: number;
  net: number;
}

export interface LedgerPage {
  rows: LedgerRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A period the UI can request. `undefined` bounds mean "server default". */
export interface Period {
  from?: string;
  to?: string;
  granularity?: "month" | "day";
}
