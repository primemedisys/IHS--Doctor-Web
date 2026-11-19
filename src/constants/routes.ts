import type { UserRole } from "@/types/auth";

/**
 * Central route registry for the IHS platform. Reference these instead of
 * string literals so renames are a one-line change.
 */
export const ROUTES = {
  home: "/",
  findDoctor: "/doctors",
  doctorProfile: (id: string | number = ":id") => `/doctors/${id}`,
  healthcareMap: "/map",
  about: "/about",
  contact: "/contact",
  auth: {
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
  },
  dashboard: {
    root: "/dashboard",
    onboarding: "/dashboard/onboarding",
    portfolio: "/dashboard/portfolio",
    appointments: "/dashboard/appointments",
    referrals: "/dashboard/referrals",
    prescriptions: "/dashboard/prescriptions",
    medicines: "/dashboard/medicines",
    prescription: (id: string | number = ":id") => `/dashboard/prescriptions/${id}`,
    prescriptionTemplates: "/dashboard/prescriptions/templates",
    prescriptionTemplate: (id: string | number = ":id") => `/dashboard/prescriptions/templates/${id}`,
    /** The composer, launched from an appointment. */
    writePrescription: (bookingId: string | number = ":id") =>
      `/dashboard/appointments/${bookingId}/prescription`,
    /** The patient's full treatment history (docs/treatment-timeline §5.3). */
    patientHistory: (bookingId: string | number = ':id') =>
      `/dashboard/appointments/${bookingId}/history`,
    /** My Patients roster + a named patient's timeline (§5.4). */
    patients: '/dashboard/patients',
    /** The EMR workbench (backend migration 051). */
    workbench: "/dashboard/workbench",
    /** One patient's medical workspace, optionally opened on a specific visit. */
    emrPatient: (patientId: string | number = ":id", bookingId?: string | number | null) =>
      `/dashboard/workbench/patients/${patientId}${bookingId ? `?bookingId=${bookingId}` : ""}`,
    /** The four full record pages of one patient (clinical-records | medical-reports | diagnosis-records | treatment-summary). */
    emrRecords: (
      patientId: string | number,
      page: "clinical-dashboard" | "clinical-records" | "medical-reports" | "diagnosis-records" | "treatment-summary" | "medicine-dashboard" | "doctor-comparison" | "reconciliation" | "audit-history",
      bookingId?: string | number | null,
    ) => `/dashboard/workbench/patients/${patientId}/${page}${bookingId ? `?bookingId=${bookingId}` : ""}`,
    /** The doctor's own follow-up categories (docs/follow-up-status). */
    followUpOptions: "/dashboard/follow-up-options",
    patientTimeline: (patientId: string | number = ':id') => `/dashboard/patients/${patientId}`,
    /** The full patient-description page (record table + history + notes). */
    patientDescription: (bookingId: string | number = ":id") =>
      `/dashboard/appointments/${bookingId}/patient`,
    /** The in-app video consultation room for a booking (docs/video-consultation). */
    call: (bookingId: string | number = ":id") => `/dashboard/appointments/${bookingId}/call`,
    clinics: "/dashboard/clinics",
    availability: "/dashboard/availability",
    earnings: "/dashboard/earnings",
    /** Dashboard 2.0 "Explore more" pages (docs/doctor-dashboard-2-31-10-2026). */
    analytics: {
      patients: "/dashboard/analytics/patients",
      appointments: "/dashboard/analytics/appointments",
      financial: "/dashboard/analytics/financial",
      quality: "/dashboard/analytics/quality",
      productivity: "/dashboard/analytics/productivity",
      acquisition: "/dashboard/analytics/acquisition",
    },
    settings: "/dashboard/settings",
  },
} as const;

/** Everything under this prefix requires an authenticated session. */
export const PROTECTED_PREFIX = ROUTES.dashboard.root;

/** Auth-flow routes — redirect away from these when already signed in. */
export const AUTH_ROUTES: string[] = [
  ROUTES.auth.login,
  ROUTES.auth.register,
  ROUTES.auth.forgotPassword,
  ROUTES.auth.resetPassword,
];

/** Doctor-only app — everyone lands on the same dashboard after signing in. */
export function dashboardHomeForRole(role: UserRole): string {
  void role;
  return ROUTES.dashboard.root;
}
