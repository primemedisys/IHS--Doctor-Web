/**
 * Prescription + letterhead vocabulary (mirrors the backend DB enums and
 * `serializeTemplate` / `serializePrescriptionForDoctor`).
 *
 * The frozen key sets below mirror `backend/src/config/constants.js`. They are
 * the same lists the backend's Joi validator reads, so the field picker and the
 * server can't drift — a value not in these unions is a 422.
 */

export const PATIENT_FIELD_KEYS = [
  "name", "age", "sex", "phone", "address",
  "bp", "pulse", "weight", "height", "temperature", "spo2", "date",
] as const;
export type PatientFieldKey = (typeof PATIENT_FIELD_KEYS)[number];

export const MEDICINE_ROUTES = ["oral", "topical", "injection", "drops", "inhaler", "other"] as const;
export type MedicineRoute = (typeof MEDICINE_ROUTES)[number];

export const MEDICINE_TIMINGS = ["before_food", "after_food", "with_food", "anytime"] as const;
export type MedicineTiming = (typeof MEDICINE_TIMINGS)[number];

/** What a medicine's duration count is measured in. */
export const DURATION_UNITS = ["day", "week", "month"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export const MEDICINE_COLUMNS = [
  "medicineName", "dosage", "route", "frequency", "timing", "durationDays", "notes",
] as const;
export type MedicineColumn = (typeof MEDICINE_COLUMNS)[number];

/** Print-safe only — the PDF renders on the server, where the doctor's fonts don't exist. */
export const PRESCRIPTION_FONTS = [
  "Helvetica, Arial, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Courier New', monospace",
  "Verdana, Geneva, sans-serif",
  "'Trebuchet MS', sans-serif",
] as const;

export type TemplateAssetKind = "logo" | "watermark" | "signature";
export type PrescriptionStatus = "draft" | "finalized";

// ── The five JSON blobs ──────────────────────────────────────────────────────
export interface HeaderJson {
  doctorNameLine: string;
  credentialLines: string[];
  clinicName: string;
  clinicTagline: string;
  regNoLabel: string;
  regNoValue: string;
  logoPosition: "left" | "right";
}

export interface PatientFieldConfig {
  key: PatientFieldKey;
  label: string;
  enabled: boolean;
  row: number;
}

export interface SidebarGroup {
  title: string;
  items: string[];
}
export interface SidebarJson {
  title: string;
  groups: SidebarGroup[];
}

export interface BodyJson {
  rxSymbol: boolean;
  showDiagnosis: boolean;
  showVitals: boolean;
  medicineColumns: MedicineColumn[];
  showAdviceText: boolean;
  showFollowUp: boolean;
  disclaimer: string;
}

export interface FooterColumn {
  title: string;
  lines: string[];
}
export interface FooterJson {
  columns: FooterColumn[];
}

// ── Template ─────────────────────────────────────────────────────────────────
/** `GET /doctor/prescription-templates/:id` — flat, exactly the shape PATCH accepts. */
export interface PrescriptionTemplate {
  id: string;
  name: string;
  clinicId: string | null;
  clinic: { id: string; name: string } | null;
  isDefault: boolean;
  isActive: boolean;

  assets: {
    logoUrl: string | null;
    watermarkUrl: string | null;
    signatureUrl: string | null;
  };
  watermarkOpacity: number;

  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
  accentColor: string;
  fontFamily: string;
  baseFontSizePt: number;

  pageSize: "A4" | "Letter";
  marginMmTop: number;
  marginMmRight: number;
  marginMmBottom: number;
  marginMmLeft: number;

  showHeader: boolean;
  showFooter: boolean;
  showSidebar: boolean;
  showWatermark: boolean;
  sidebarWidthPct: number;

  headerJson: HeaderJson;
  patientFieldsJson: PatientFieldConfig[];
  sidebarJson: SidebarJson;
  bodyJson: BodyJson;
  footerJson: FooterJson;

  rxNumberPrefix: string | null;
  updatedAt: string | null;
}

export interface PrescriptionTemplateSummary {
  id: string;
  name: string;
  clinic: { id: string; name: string } | null;
  isDefault: boolean;
  logoUrl: string | null;
  updatedAt: string | null;
}

/**
 * What the editor may PATCH. `assets`, `id`, `clinic` and `updatedAt` are
 * server-owned; everything else round-trips. JSON blobs are replaced WHOLESALE
 * — there is no array-patch semantics (integration-plan §2).
 */
export type TemplateUpdate = Partial<
  Omit<PrescriptionTemplate, "id" | "assets" | "clinic" | "updatedAt" | "isDefault">
>;

// ── Prescription ─────────────────────────────────────────────────────────────
export interface PrescriptionItem {
  /** Optional reference to a doctor's medicine master list entry. */
  medicineId?: string | null;
  /** The IHS catalogue row the line was picked from (backend migration 053). */
  medicineMasterId?: string | null;
  /** The printed label, e.g. "Pan 40 40 mg" — what the PDF and patient views show. */
  medicineName: string;
  /** The medicine's own strength / dosage form (migration 053) — never the prescribed dose. */
  strength?: string | null;
  dosageForm?: string | null;
  /** The DOSE the doctor prescribes (e.g. "1 tab") — free text, never auto-filled. */
  dosage: string | null;
  route: MedicineRoute;
  frequency: string | null;
  timing: MedicineTiming | null;
  durationDays: number | null;
  durationUnit: DurationUnit;
  notes: string | null;
  /** EMR medication order (backend migration 051) — optional, never inferred. */
  quantity?: number | null;
  priority?: "routine" | "urgent" | "stat" | null;
  nameType?: "trade" | "generic" | null;
}

export interface Vitals {
  heightCm: number | null;
  weightKg: number | null;
  bloodPressure: string | null;
  pulseRateBpm: number | null;
  temperatureF: number | null;
  spo2Percent: number | null;
}

/**
 * The letterhead a prescription renders with. A DRAFT carries the live
 * `template`; a FINALIZED one carries its frozen `snapshot`. They are the same
 * shape and a different document — never fall back to fetching the live
 * template for a finalized prescription.
 */
export type TemplateSnapshot = Omit<
  PrescriptionTemplate,
  "id" | "assets" | "clinic" | "clinicId" | "isDefault" | "isActive" | "rxNumberPrefix" | "updatedAt"
> & {
  logoUrl: string | null;
  watermarkUrl: string | null;
  signatureUrl: string | null;
};

export interface Prescription {
  id: string;
  status: PrescriptionStatus;
  version: number;
  rxNumber: string | null;
  parentPrescriptionId: string | null;
  supersededById: string | null;
  amendReason: string | null;

  booking: {
    id: string;
    date: string;
    startTime: string | null;
    mode: "video" | "clinic";
    status: string;
  } | null;
  patient: {
    id: string | null;
    /** Display registration number (IHS-P-000123). */
    regNo?: string | null;
    name: string | null;
    phone: string | null;
    dateOfBirth?: string | null;
    age: number | null;
    gender: string | null;
    bloodGroup: string;
    addressLine: string | null;
    city: string | null;
  };
  clinic: { id: string; name: string } | null;

  templateId: string | null;
  template: PrescriptionTemplate | null; // draft only
  snapshot: TemplateSnapshot | null; // finalized only

  vitals: Vitals;
  chiefComplaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  advice: string | null;
  adviceSelected: string[];
  followUpDate: string | null;
  /** The doctor ticked "medication not needed" (migration 051). */
  noMedication?: boolean;
  items: PrescriptionItem[];
  /** The Patient Workbench record it was written from (migration 059); frozen at finalize. */
  clinicalSnapshot?: WorkbenchSnapshot | null;

  canEdit: boolean;
  pdfUrl: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionSummary {
  id: string;
  status: PrescriptionStatus;
  version: number;
  rxNumber: string | null;
  bookingId: string | null;
  patient: { id: string | null; name: string | null };
  clinic: { name: string } | null;
  supersededById: string | null;
  diagnosis: string | null;
  finalizedAt: string | null;
  createdAt: string;
}

/** The body of `PATCH /doctor/prescriptions/:id`. `items` is replace-the-set. */
export interface PrescriptionUpdate {
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  advice?: string | null;
  adviceSelected?: string[];
  followUpDate?: string | null;
  templateId?: string | null;
  vitals?: Partial<Vitals>;
  items?: PrescriptionItem[];
  noMedication?: boolean;
}

export interface PrescriptionFilters {
  status?: PrescriptionStatus;
  patientId?: string;
  bookingId?: string;
}

// ── Patient Workbench → prescription (backend migration 059) ─────────────────
export type WorkbenchVitalSource = "consultation" | "same_day" | "earlier" | "none";

export interface WorkbenchVitals {
  /** consultation = taken in this visit; same_day = on the visit's day, not linked; earlier = an older reading. */
  source: WorkbenchVitalSource;
  values: {
    bpSystolic: number | null;
    bpDiastolic: number | null;
    bloodPressure: string | null;
    pulseRateBpm: number | null;
    heartRateBpm: number | null;
    respiratoryRate: number | null;
    spo2Percent: number | null;
    temperatureF: number | null;
    heightCm: number | null;
    weightKg: number | null;
    bmi: number | null;
  } | null;
  recordedOn: string | null;
  recordedAt: string | null;
  readings: number;
  /** Only this visit's (or same-day) reading is printed on the prescription. */
  printable: boolean;
}

export interface WorkbenchDiagnosis {
  id: string;
  title: string;
  code: string | null;
  icdCodeId: string | null;
  codeSystem: string | null;
  codeVersion: string | null;
  codeDescription: string | null;
  type: string | null;
  stage: string | null;
  remarks: string | null;
  patientVisible: boolean;
}

export interface WorkbenchSnapshot {
  version: number;
  syncedAt: string;
  patient: {
    id: string | null;
    regNo: string | null;
    name: string | null;
    dateOfBirth: string | null;
    age: number | null;
    gender: string | null;
    phone: string | null;
    bloodGroup: string | null;
    address: string | null;
  };
  consultation: {
    bookingId: string;
    date: string;
    startTime: string | null;
    appointmentType: "video" | "clinic";
    status: string;
    clinic: { id: string; name: string; city: string | null } | null;
    doctor: { id: string; name: string | null; qualification: string | null; specializations: string[] } | null;
  };
  vitals: WorkbenchVitals;
  complaints: { id: string; title: string; since: string | null; severity: string | null; remarks: string | null; patientVisible: boolean }[];
  examinations: { id: string; form: string; label: string; findings: { label: string; value: string }[]; remarks: string | null; patientVisible: boolean }[];
  diagnoses: WorkbenchDiagnosis[];
  // Snapshot version 2+. A snapshot frozen before has none of these — treat as empty.
  history?: { id: string; category: string | null; label: string | null; findings: { label: string; value: string }[]; remarks: string | null; recordedOn: string | null; patientVisible: boolean }[];
  comorbidities?: { id: string; title: string | null; category: string | null; remarks: string | null; since: string | null; patientVisible: boolean }[];
  investigations?: { id: string; title: string | null; type: string | null; priority: string | null; quantity: number | null; instruction: string | null; patientVisible: boolean }[];
  /** Published doctor's notes of this consultation — the prescription's advice. Private notes are never included. */
  advice?: { id: string; type: string | null; text: string; createdAt: string | null }[];
  followUp: { followUpOn: string | null; note: string | null; intervalValue: number | null; intervalUnit: string | null; comments: string | null } | null;
  /** What goes onto the prescription; null = nothing in the Workbench for it (the prescription keeps its own value). */
  printed: {
    chiefComplaint: string | null;
    diagnosis: string | null;
    vitals: Record<string, number | string | null> | null;
    followUpDate: string | null;
    followUpNote?: string | null;
    advice?: string | null;
    investigations?: string[];
  };
}
