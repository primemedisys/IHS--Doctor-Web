import type { Period } from "@/types/dashboard";
import type { DoctorFilters } from "@/types/doctor";

/**
 * Canonical React Query key factory — consistent keys for caching + invalidation.
 */
export const queryKeys = {
  doctors: {
    all: () => ["doctors"] as const,
    list: (filters?: DoctorFilters) => [...queryKeys.doctors.all(), "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.doctors.all(), "detail", id] as const,
    featured: () => [...queryKeys.doctors.all(), "featured"] as const,
  },
  specialties: {
    all: () => ["specialties"] as const,
    list: () => [...queryKeys.specialties.all(), "list"] as const,
  },
  symptoms: {
    all: () => ["symptoms"] as const,
    list: () => [...queryKeys.symptoms.all(), "list"] as const,
  },
  states: {
    all: () => ["states"] as const,
    list: () => [...queryKeys.states.all(), "list"] as const,
  },
  /** The signed-in doctor's own profile & onboarding (distinct from public discovery). */
  doctor: {
    all: () => ["doctor"] as const,
    onboarding: () => [...queryKeys.doctor.all(), "onboarding"] as const,
    profile: () => [...queryKeys.doctor.all(), "profile"] as const,
    preview: () => [...queryKeys.doctor.all(), "preview"] as const,
    awards: () => [...queryKeys.doctor.all(), "awards"] as const,
    testimonials: () => [...queryKeys.doctor.all(), "testimonials"] as const,
    links: () => [...queryKeys.doctor.all(), "links"] as const,
    keywords: () => [...queryKeys.doctor.all(), "keywords"] as const,
    documents: () => [...queryKeys.doctor.all(), "documents"] as const,
    education: () => [...queryKeys.doctor.all(), "education"] as const,
    experience: () => [...queryKeys.doctor.all(), "experience"] as const,
    services: () => [...queryKeys.doctor.all(), "services"] as const,
    publications: () => [...queryKeys.doctor.all(), "publications"] as const,
    memberships: () => [...queryKeys.doctor.all(), "memberships"] as const,
    faqs: () => [...queryKeys.doctor.all(), "faqs"] as const,
    gallery: () => [...queryKeys.doctor.all(), "gallery"] as const,
    affiliations: () => [...queryKeys.doctor.all(), "affiliations"] as const,
    fellowships: () => [...queryKeys.doctor.all(), "fellowships"] as const,
    expertise: () => [...queryKeys.doctor.all(), "expertise"] as const,
    clinics: () => [...queryKeys.doctor.all(), "clinics"] as const,
    onlineAvailability: () => [...queryKeys.doctor.all(), "onlineAvailability"] as const,
    exceptions: () => [...queryKeys.doctor.all(), "exceptions"] as const,
    paymentQr: () => [...queryKeys.doctor.all(), "paymentQr"] as const,
  },
  /** The signed-in doctor's appointments (bookings) + patient snapshots. */
  /**
   * Follow-up statuses (docs/follow-up-status). Every mutation here also
   * invalidates `appointments.all()` — the board's column, count card and
   * filter all read this data, and a recoloured status that stays blue on the
   * roster until a hard refresh reads as a bug.
   */
  followUps: {
    all: () => ["follow-ups"] as const,
    statuses: () => [...queryKeys.followUps.all(), "statuses"] as const,
    forBooking: (bookingId: string) => [...queryKeys.followUps.all(), "booking", bookingId] as const,
    reminder: (bookingId: string) => [...queryKeys.followUps.all(), "reminder", bookingId] as const,
  },
  appointments: {
    all: () => ["appointments"] as const,
    list: (filters?: Record<string, string | undefined>) =>
      [...queryKeys.appointments.all(), "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.appointments.all(), "detail", id] as const,
    clinicalNotes: (bookingId: string) =>
      [...queryKeys.appointments.all(), "clinical-notes", bookingId] as const,
    patientVitals: (bookingId: string) =>
      [...queryKeys.appointments.all(), "patient-vitals", bookingId] as const,
  },
  /** Video consultation join tokens (docs/video-consultation). */
  video: {
    all: () => ["video"] as const,
    token: (bookingId: string) => [...queryKeys.video.all(), "token", bookingId] as const,
  },
  /** Server-computed dashboard tiles + today's schedule. */
  dashboard: {
    all: () => ["dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all(), "summary"] as const,
    today: () => [...queryKeys.dashboard.all(), "today"] as const,
    /**
     * Dashboard 2.0 analytics. Nested under `dashboard` on purpose: every
     * mutation that already invalidates `dashboard.all()` (mark paid, complete,
     * cancel) refreshes these KPIs too. `params` embeds the range + filters.
     */
    analytics: (endpoint: string, params: Record<string, unknown> = {}) =>
      [...queryKeys.dashboard.all(), "analytics", endpoint, params] as const,
  },
  /**
   * Earnings. Keys embed the PERIOD so switching the range refetches instead of
   * serving a cached six-month chart under a "Last 30 days" label. Mutations
   * invalidate the root key, which catches every period and page variant at once.
   */
  earnings: {
    all: () => ["earnings"] as const,
    summary: (p: Period) => [...queryKeys.earnings.all(), "summary", p] as const,
    series: (p: Period) => [...queryKeys.earnings.all(), "series", p] as const,
    transactions: (p: Period, page: number) =>
      [...queryKeys.earnings.all(), "tx", p, page] as const,
  },
  /** The doctor's configurable letterheads. */
  prescriptionTemplates: {
    all: () => ["prescription-templates"] as const,
    list: () => [...queryKeys.prescriptionTemplates.all(), "list"] as const,
    detail: (id: string) => [...queryKeys.prescriptionTemplates.all(), id] as const,
    /** `updatedAt` busts the cache so "Preview PDF" reflects the latest autosave. */
    preview: (id: string, updatedAt?: string | null) =>
      [...queryKeys.prescriptionTemplates.all(), id, "preview", updatedAt ?? ""] as const,
  },
  /** Prescriptions the doctor has written. */
  prescriptions: {
    all: () => ["prescriptions"] as const,
    list: (filters?: Record<string, string | undefined>) =>
      [...queryKeys.prescriptions.all(), "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.prescriptions.all(), id] as const,
    byBooking: (bookingId: string) => [...queryKeys.prescriptions.all(), "booking", bookingId] as const,
    pdf: (id: string) => [...queryKeys.prescriptions.all(), id, "pdf"] as const,
  },
  /** The doctor's personal medicine master list. */
  medicines: {
    all: () => ["medicines"] as const,
    list: (filters?: Record<string, string | undefined>) =>
      [...queryKeys.medicines.all(), "list", filters ?? {}] as const,
    listAll: (filters?: Record<string, string | undefined>) =>
      [...queryKeys.medicines.all(), "listAll", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.medicines.all(), "detail", id] as const,
  },
  /** Multi-doctor referrals (docs/multi-doctor-referrals). */
  referrals: {
    all: () => ["referrals"] as const,
    targets: (q: string, clinicId?: string) =>
      [...queryKeys.referrals.all(), "targets", q, clinicId ?? ""] as const,
    forBooking: (bookingId: string) =>
      [...queryKeys.referrals.all(), "booking", bookingId] as const,
    incoming: (status?: string) => [...queryKeys.referrals.all(), "incoming", status ?? ""] as const,
    case: (id: string) => [...queryKeys.referrals.all(), "case", id] as const,
    casePdf: (id: string) => [...queryKeys.referrals.all(), "case", id, "pdf"] as const,
  },
  catalog: {
    specializations: () => ["catalog", "specializations"] as const,
    /** Prefix for every sub-specialization list (invalidate after "add new"). */
    subSpecializationsRoot: () => ["catalog", "sub-specializations"] as const,
    subSpecializations: (specializationId?: number) =>
      ["catalog", "sub-specializations", specializationId ?? "all"] as const,
    languages: () => ["catalog", "languages"] as const,
    insurances: () => ["catalog", "insurances"] as const,
  },
  search: {
    universal: (term: string) => ["search", term] as const,
  },
} as const;
