/**
 * Doctor Dashboard 2.0 analytics — response shapes.
 *
 * Mirrors backend/src/services/doctorAnalytics.service.js (one exported
 * function per endpoint) and docs/doctor-dashboard-2-31-10-2026/api.md.
 * Percentages are one-decimal numbers, or `null` when the denominator is 0.
 * A metric IHS does not record arrives as `{ available: false, reason }` —
 * render the reason, never a 0.
 */

export type Granularity = "day" | "week" | "month";

/** IST calendar days, inclusive. */
export interface DateRange {
  from: string;
  to: string;
}

export interface AnalyticsPeriod {
  from: string;
  to: string;
  days: number;
  previousFrom: string;
  previousTo: string;
  today: string;
}

export interface Unavailable {
  available: false;
  reason: string;
}

/** A metric that may not be recorded: either its figures, or why not. */
export type Maybe<T> = (T & { available: true }) | Unavailable;

// ── Patients ────────────────────────────────────────────────────────────────

export interface PatientKpis {
  total: number;
  active: number;
  activeWindowDays: number;
  new: number;
  newPrevious: number;
  newGrowth: number | null;
  seenInPeriod: number;
  returning: number;
  returningPercent: number | null;
  today: { patients: number; completed: number; remaining: number };
  cancellations: { count: number; rate: number | null; eligible: number };
}

// ── Appointments ────────────────────────────────────────────────────────────

export type BookingStatusKey = "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
export type ConsultMode = "clinic" | "video";

export interface AppointmentKpis {
  period: {
    total: number;
    byStatus: Record<BookingStatusKey, number>;
    clinic: number;
    video: number;
    clinicRate: number | null;
    videoRate: number | null;
    rescheduled: number;
    completed: number;
    completedClinic: number;
    completedVideo: number;
    completionRate: number | null;
    noShow: number;
    noShowRate: number | null;
    cancelled: number;
    notMarkedComplete: number;
  };
  today: { total: number; clinic: number; video: number; queued: number; serving: number; awaitingPayment: number };
  upcoming: {
    count: number;
    awaitingPayment: number;
    next: {
      bookingId: string;
      date: string;
      time: string | null;
      mode: ConsultMode;
      token: number | null;
      patientName: string | null;
    } | null;
  };
  consultDuration: Maybe<{ averageMinutes: number | null; measured: number }>;
  waitingTime: Maybe<{ averageMinutes: number | null }>;
}

// ── Financial ───────────────────────────────────────────────────────────────

export interface MoneyTotals {
  collected: number;
  commission: number;
  doctorNet: number;
  transactions: number;
  consultation: { clinic: number; video: number; total: number };
  methods: { online: number; cash: number; upi: number };
  refunded: number;
  refundCount: number;
  failedTransactions: number;
  averagePerCompletedConsult: number | null;
}

export interface FinancialKpis {
  period: MoneyTotals;
  previous: { collected: number; doctorNet: number };
  growth: number | null;
  /** Outstanding NOW (cash / UPI owed at the clinic) — not range-bound. */
  pending: { amount: number; count: number; overdueAmount: number; overdueCount: number };
  today: number;
  last7Days: number;
  yearToDate: number;
  procedureRevenue: Maybe<{ amount: number }>;
  surgeryRevenue: Maybe<{ amount: number }>;
  contractRevenue: Maybe<{ amount: number }>;
}

// ── Quality ─────────────────────────────────────────────────────────────────

export interface QualityKpis {
  satisfaction: Maybe<{ averageRating: number | null }> & {
    portfolioTestimonials?: { count: number; averageRating: number | null };
  };
  feedback: Maybe<{ count: number }>;
  documentation: {
    completedConsultations: number;
    withFinalizedPrescription: number;
    withClinicalNote: number;
    missingPrescription: number;
    rate: number | null;
  };
  followUp: { scheduled: number; completed: number; pending: number; overdue: number; rate: number | null };
}

// ── Productivity ────────────────────────────────────────────────────────────

export interface ProductivityKpis {
  consultations: number;
  workingDays: number;
  consultationsPerDay: number | null;
  patientsPerDay: number | null;
  opd: number;
  video: number;
  scheduleAdherence: Maybe<{
    onTime: number;
    sessions: number;
    rate: number | null;
    averageStartDelayMinutes: number | null;
    toleranceMinutes: number;
  }>;
  utilization: Maybe<{ booked: number; capacity: number; rate: number | null; basis: string }>;
}

// ── Acquisition ─────────────────────────────────────────────────────────────

export type AcquisitionGroupKey = "google" | "social" | "referral" | "ihs" | "other" | "undisclosed" | "not_captured";

export interface AcquisitionGroup {
  group: AcquisitionGroupKey;
  label: string;
  count: number;
  percent: number | null;
  previous: number;
  change: number | null;
  sources: { source: string; label: string; count: number }[];
}

export interface AcquisitionKpis {
  newPatients: number;
  groups: AcquisitionGroup[];
}

// ── Overview + trends ───────────────────────────────────────────────────────

export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  patients: PatientKpis;
  appointments: AppointmentKpis;
  financial: FinancialKpis;
  quality: QualityKpis;
  productivity: ProductivityKpis;
  acquisition: AcquisitionKpis;
}

export interface RevenuePoint {
  bucket: string;
  collected: number;
  doctorNet: number;
  refunded: number;
}
export interface AppointmentPoint {
  bucket: string;
  completed: number;
  pending: number;
  cancelled: number;
  noShow: number;
  clinic: number;
  video: number;
}
export interface PatientPoint {
  bucket: string;
  unique: number;
  new: number;
  returning: number;
}
export type AcquisitionPoint = { bucket: string } & Record<AcquisitionGroupKey, number>;

export interface AnalyticsTrends {
  period: AnalyticsPeriod;
  granularity: Granularity;
  revenue: RevenuePoint[];
  appointments: AppointmentPoint[];
  patients: PatientPoint[];
  acquisition: AcquisitionPoint[];
}

// ── Explore More details ────────────────────────────────────────────────────

interface Paged {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PatientSegment = "all" | "new" | "returning";

export interface PatientRow {
  id: string;
  name: string;
  registrationNumber: string;
  firstVisit: string | null;
  lastVisit: string | null;
  visits: number;
  completed: number;
  cancelled: number;
  upcoming: string | null;
  isNew: boolean;
  acquisitionSource: { source: string; label: string } | null;
}

export interface PatientsDetail extends Paged {
  period: AnalyticsPeriod;
  summary: PatientKpis;
  timeline: { granularity: Granularity; patients: PatientPoint[] };
  patients: PatientRow[];
}

export interface AppointmentRow {
  id: string;
  date: string;
  sessionStart: string | null;
  sessionEnd: string | null;
  token: number | null;
  mode: ConsultMode;
  clinic: { id: string; name: string } | null;
  patient: { id: string; name: string } | null;
  status: BookingStatusKey;
  rescheduled: boolean;
  amount: number;
  paymentStatus: PaymentStatusKey | null;
  consultMinutes: number | null;
}

export interface AppointmentsDetail extends Paged {
  period: AnalyticsPeriod;
  summary: AppointmentKpis;
  trend: { granularity: Granularity; appointments: AppointmentPoint[] };
  appointments: AppointmentRow[];
}

export type PaymentStatusKey = "initiated" | "success" | "failed" | "refunded" | "pending_at_clinic";
export type PaymentMethodKey = "online" | "cash" | "upi";

export interface TransactionRow {
  id: string;
  gatewayReference: string | null;
  bookingId: string;
  patient: { id: string; name: string } | null;
  serviceType: string;
  method: PaymentMethodKey;
  billed: number;
  collected: number;
  refunded: number;
  commission: number;
  doctorNet: number;
  status: PaymentStatusKey;
  date: string | null;
}

export interface FinancialDetail extends Paged {
  period: AnalyticsPeriod;
  summary: FinancialKpis;
  trend: { granularity: Granularity; revenue: RevenuePoint[] };
  transactions: TransactionRow[];
}

export interface QualityDetail {
  period: AnalyticsPeriod;
  granularity: Granularity;
  summary: QualityKpis & { completionRate: number | null; waitingTime: AppointmentKpis["waitingTime"] };
  documentation: { bucket: string; completed: number; documented: number }[];
  followUps: { bucket: string; scheduled: number; completed: number; overdue: number }[];
}

export interface ProductivityPoint {
  bucket: string;
  consultations: number;
  workingDays: number;
  patients: number;
  consultationsPerDay: number;
  clinic: number;
  video: number;
  averageMinutes: number | null;
}

export interface ProductivityDetail {
  period: AnalyticsPeriod;
  granularity: Granularity;
  summary: ProductivityKpis & { consultDuration: AppointmentKpis["consultDuration"]; completionRate: number | null };
  series: ProductivityPoint[];
}

export interface AcquisitionDetail {
  period: AnalyticsPeriod;
  summary: AcquisitionKpis;
  allTime: AcquisitionKpis;
  bookingAnswersInPeriod: number;
  granularity: Granularity;
  monthly: AcquisitionPoint[];
  newVsReturning: PatientPoint[];
}

// ── Query params ────────────────────────────────────────────────────────────

export interface SeriesParams extends DateRange {
  granularity?: Granularity;
}
export interface PatientsParams extends SeriesParams {
  segment: PatientSegment;
  search?: string;
  page: number;
  limit?: number;
}
export interface AppointmentsParams extends SeriesParams {
  status?: BookingStatusKey;
  mode?: ConsultMode;
  page: number;
  limit?: number;
}
export interface FinancialParams extends SeriesParams {
  method?: PaymentMethodKey;
  status?: PaymentStatusKey;
  page: number;
  limit?: number;
}
