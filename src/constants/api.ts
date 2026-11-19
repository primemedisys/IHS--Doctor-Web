/**
 * Backend endpoint paths (relative to `env.apiUrl`). The auth block maps 1:1
 * to `backend/src/routes/auth.routes.js`; the rest are written ahead of the
 * API so swapping mock services for real ones is a one-line change each.
 */
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    google: "/auth/google",
    adminLogin: "/auth/admin/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
    forgotPassword: "/auth/forgot-password",
    /** Forgot password by SMS code (doctor accounts: audience "doctor"). */
    forgotPasswordOtp: "/auth/forgot-password/otp",
    verifyPasswordOtp: "/auth/forgot-password/otp/verify",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
    updateProfile: "/auth/profile",
  },
  /**
   * The platform's shared in-app notification feed. Doctors are included
   * (appointment + record-access events); every query is scoped server-side to
   * the signed-in user.
   */
  notifications: {
    list: "/medicine/notifications",
    unreadCount: "/medicine/notifications/unread-count",
    markRead: (id: string | number) => `/medicine/notifications/${id}/read`,
    markAllRead: "/medicine/notifications/read-all",
  },
  doctors: {
    root: "/doctors",
    byId: (id: string | number) => `/doctors/${id}`,
    slots: (id: string | number) => `/doctors/${id}/slots`,
  },
  /** Doctor-owned profile & portfolio management (backend doctor.routes.js). */
  doctor: {
    onboarding: "/doctor/onboarding",
    profile: "/doctor/profile",
    preview: "/doctor/preview",
    specializations: "/doctor/specializations",
    subSpecializations: "/doctor/sub-specializations",
    /** Doctor "+ Add new sub-specialty" → shared catalog (find-or-create). */
    createSubSpecialization: "/doctor/catalog/sub-specializations",
    languages: "/doctor/languages",
    awards: "/doctor/awards",
    award: (id: string | number) => `/doctor/awards/${id}`,
    awardImage: (id: string | number) => `/doctor/awards/${id}/image`,
    testimonials: "/doctor/testimonials",
    testimonialItem: (id: string | number) => `/doctor/testimonials/${id}`,
    testimonialPhoto: (id: string | number) => `/doctor/testimonials/${id}/photo`,
    testimonialOrder: "/doctor/testimonials/order",
    links: "/doctor/links",
    link: (id: string | number) => `/doctor/links/${id}`,
    keywords: "/doctor/keywords",
    keyword: (id: string | number) => `/doctor/keywords/${id}`,
    documents: "/doctor/documents",
    document: (id: string | number) => `/doctor/documents/${id}`,
    photo: "/doctor/photo",
    showcaseImage: "/doctor/showcase-image",
    heroImages: "/doctor/hero-images",
    heroImage: (index: number) => `/doctor/hero-images/${index}`,
    submit: "/doctor/submit",
    // ── Portfolio v2 sections (docs/doctor-portfolio-v2) ────────────────────
    education: "/doctor/education",
    educationItem: (id: string | number) => `/doctor/education/${id}`,
    experience: "/doctor/experience",
    experienceItem: (id: string | number) => `/doctor/experience/${id}`,
    services: "/doctor/services",
    serviceItem: (id: string | number) => `/doctor/services/${id}`,
    publications: "/doctor/publications",
    publicationItem: (id: string | number) => `/doctor/publications/${id}`,
    memberships: "/doctor/memberships",
    membershipItem: (id: string | number) => `/doctor/memberships/${id}`,
    faqs: "/doctor/faqs",
    faqItem: (id: string | number) => `/doctor/faqs/${id}`,
    gallery: "/doctor/gallery",
    galleryItem: (id: string | number) => `/doctor/gallery/${id}`,
    galleryOrder: "/doctor/gallery/order",
    // ── Migration 049 sections ──
    affiliations: "/doctor/affiliations",
    affiliationItem: (id: string | number) => `/doctor/affiliations/${id}`,
    fellowships: "/doctor/fellowships",
    fellowshipItem: (id: string | number) => `/doctor/fellowships/${id}`,
    expertise: "/doctor/expertise",
    expertiseItem: (id: string | number) => `/doctor/expertise/${id}`,
    insurances: "/doctor/insurances",
    // ── Consultation payment QR (the doctor's own UPI QR, migration 044) ────
    paymentQr: "/doctor/payment-qr",
    paymentQrImage: "/doctor/payment-qr/image",
    // ── Clinics & availability (docs/clinics-availability) ──────────────────
    clinics: "/doctor/clinics",
    clinic: (id: string | number) => `/doctor/clinics/${id}`,
    clinicAvailability: (id: string | number) => `/doctor/clinics/${id}/availability`,
    onlineAvailability: "/doctor/online-availability",
    exceptions: "/doctor/exceptions",
    exception: (id: string | number) => `/doctor/exceptions/${id}`,
    // ── Appointments (docs/booking-payments) ────────────────────────────────
    // ── Dashboard & earnings (docs/dashboards-earnings) ─────────────────────
    dashboardSummary: "/doctor/dashboard/summary",
    dashboardToday: "/doctor/dashboard/today",
    earningsSummary: "/doctor/earnings/summary",
    earningsSeries: "/doctor/earnings/series",
    earningsTransactions: "/doctor/earnings/transactions",
    // ── Dashboard 2.0 analytics (docs/doctor-dashboard-2-31-10-2026) ────────
    analyticsOverview: "/doctor/analytics/overview",
    analyticsTrends: "/doctor/analytics/trends",
    analyticsPatients: "/doctor/analytics/patients",
    analyticsAppointments: "/doctor/analytics/appointments",
    analyticsFinancial: "/doctor/analytics/financial",
    analyticsQuality: "/doctor/analytics/quality",
    analyticsProductivity: "/doctor/analytics/productivity",
    analyticsAcquisition: "/doctor/analytics/acquisition",
    bookings: "/doctor/bookings",
    // ── Follow-up statuses (docs/follow-up-status) ──────────────────────────
    followUpStatuses: "/doctor/follow-up-statuses",
    followUpStatus: (id: string | number) => `/doctor/follow-up-statuses/${id}`,
    followUpStatusReorder: "/doctor/follow-up-statuses/reorder",
    // Per CONSULTATION, not per patient: re-tagging one visit must leave that
    // patient's other visits alone.
    bookingFollowUp: (bookingId: string | number) => `/doctor/bookings/${bookingId}/follow-up`,
    // ── Automatic follow-up reminders (docs/follow-up-reminders-07-09-2026) ──
    bookingReminder: (bookingId: string | number) => `/doctor/bookings/${bookingId}/reminder`,
    // ── Treatment timeline (docs/treatment-timeline) ────────────────────────
    bookingPatientTimeline: (id: string | number) => `/doctor/bookings/${id}/patient-timeline`,
    myPatients: "/doctor/patients",
    /** EMR workbench + patient medical workspace (backend migration 051). */
    emr: {
      catalog: "/doctor/emr/catalog",
      workbench: "/doctor/emr/workbench",
      searchMedicines: "/doctor/emr/search/medicines",
      searchInvestigations: "/doctor/emr/search/investigations",
      searchDiagnoses: "/doctor/emr/search/diagnoses",
      searchIcd: "/doctor/emr/search/icd",
      patient: (patientId: string | number) => `/doctor/emr/patients/${patientId}`,
      patientVitals: (patientId: string | number) => `/doctor/emr/patients/${patientId}/vitals`,
      patientEntries: (patientId: string | number) => `/doctor/emr/patients/${patientId}/entries`,
      visitSummary: (patientId: string | number, bookingId: string | number) =>
        `/doctor/emr/patients/${patientId}/visits/${bookingId}`,
      bookingVitals: (bookingId: string | number) => `/doctor/emr/bookings/${bookingId}/vitals`,
      bookingEntries: (bookingId: string | number) => `/doctor/emr/bookings/${bookingId}/entries`,
      entry: (id: string | number) => `/doctor/emr/entries/${id}`,
      retireEntry: (id: string | number) => `/doctor/emr/entries/${id}/retire`,
      // Structured history + per-category consent (backend migration 057).
      patientHistory: (patientId: string | number) => `/doctor/emr/patients/${patientId}/history`,
      /** Server-filtered, paginated longitudinal timeline of the patient. */
      patientTimeline: (patientId: string | number) => `/doctor/emr/patients/${patientId}/timeline`,
      /** Read-only trail of this doctor's own actions on the patient (access_audit_logs). */
      patientAudit: (patientId: string | number) => `/doctor/emr/patients/${patientId}/audit`,
      patientAccess: (patientId: string | number) => `/doctor/emr/patients/${patientId}/access`,
      /** The patient's documents behind the consent gate (own / granted category / shared document). */
      patientDocuments: (patientId: string | number) => `/doctor/emr/patients/${patientId}/documents`,
      /** Audited stream of ONE document shared through a document request (045). */
      sharedRecordFile: (requestId: string | number, recordId: string | number) =>
        `/doctor/access-requests/${requestId}/records/${recordId}/file`,
      patientAccessRequests: (patientId: string | number) => `/doctor/emr/patients/${patientId}/access-requests`,
      cancelAccessRequest: (id: string | number) => `/doctor/access-requests/${id}/cancel`,
    },
    patientTimeline: (patientId: string | number) => `/doctor/patients/${patientId}/timeline`,
    booking: (id: string | number) => `/doctor/bookings/${id}`,
    bookingMarkPaid: (id: string | number) => `/doctor/bookings/${id}/mark-paid`,
    bookingComplete: (id: string | number) => `/doctor/bookings/${id}/complete`,
    bookingReschedule: (id: string | number) => `/doctor/bookings/${id}/reschedule`,
    // Patient-wide clinical notes reached from an appointment (list + append).
    bookingClinicalNotes: (id: string | number) => `/doctor/bookings/${id}/clinical-notes`,
    // The patient's self-recorded vitals timeline (the record table).
    bookingPatientVitals: (id: string | number) => `/doctor/bookings/${id}/patient-vitals`,
    // Correct the DATE one of the patient's documents speaks for.
    bookingPatientRecord: (id: string | number, recordId: string | number) =>
      `/doctor/bookings/${id}/patient-records/${recordId}`,
    // ── Video consultation (docs/video-consultation) ────────────────────────
    bookingVideoToken: (id: string | number) => `/doctor/bookings/${id}/video-token`,
    // ── Prescriptions & letterhead (docs/prescriptions) ─────────────────────
    prescriptionTemplates: "/doctor/prescription-templates",
    prescriptionTemplate: (id: string | number) => `/doctor/prescription-templates/${id}`,
    prescriptionTemplateDefault: (id: string | number) => `/doctor/prescription-templates/${id}/default`,
    prescriptionTemplateDuplicate: (id: string | number) => `/doctor/prescription-templates/${id}/duplicate`,
    prescriptionTemplateAssets: (id: string | number) => `/doctor/prescription-templates/${id}/assets`,
    prescriptionTemplateAsset: (id: string | number, kind: string) =>
      `/doctor/prescription-templates/${id}/assets/${kind}`,
    prescriptionTemplatePreview: (id: string | number) =>
      `/doctor/prescription-templates/${id}/preview.pdf`,
    prescriptions: "/doctor/prescriptions",
    prescription: (id: string | number) => `/doctor/prescriptions/${id}`,
    prescriptionFinalize: (id: string | number) => `/doctor/prescriptions/${id}/finalize`,
    prescriptionAmend: (id: string | number) => `/doctor/prescriptions/${id}/amend`,
    /** Refill a draft from its Patient Workbench consultation (migration 059). */
    prescriptionSyncWorkbench: (id: string | number) => `/doctor/prescriptions/${id}/sync-workbench`,
    prescriptionPdf: (id: string | number) => `/doctor/prescriptions/${id}/pdf`,
    bookingPrescription: (id: string | number) => `/doctor/bookings/${id}/prescription`,
    // ── Doctor medicine master list ──────────────────────────────────────────
    medicines: "/doctor/medicines",
    medicinesAll: "/doctor/medicines/all",
    medicine: (id: string | number) => `/doctor/medicines/${id}`,
    // ── Multi-doctor referrals (docs/multi-doctor-referrals) ────────────────
    referralTargets: (q: string, clinicId?: string | number) =>
      `/doctor/referral-targets?q=${encodeURIComponent(q)}${clinicId != null ? `&clinicId=${clinicId}` : ""}`,
    bookingReferrals: (id: string | number) => `/doctor/bookings/${id}/referrals`,
    referral: (id: string | number) => `/doctor/referrals/${id}`,
    // Target-doctor inbox: referrals sent TO me + the shared case.
    referralsIncoming: (status?: string) =>
      `/doctor/referrals/incoming${status ? `?status=${status}` : ""}`,
    referralCase: (id: string | number) => `/doctor/referrals/${id}/case`,
    referralCasePdf: (id: string | number) => `/doctor/referrals/${id}/case/prescription.pdf`,
    // Begin the walk-in consult for a referral → creates the target doctor's ₹0 appointment.
    referralStartConsultation: (id: string | number) => `/doctor/referrals/${id}/consultation`,
  },
  /** Public lookup lists (backend doctorsPublic.routes.js). */
  catalog: {
    specializations: "/specializations",
    subSpecializations: "/sub-specializations",
    languages: "/languages",
    insurances: "/insurances",
  },
  specialties: { root: "/specialties" },
  symptoms: { root: "/symptoms" },
  states: { root: "/states" },
  contact: { root: "/contact" },
} as const;
