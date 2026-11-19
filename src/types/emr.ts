/**
 * Doctor EMR workspace (backend migration 051). Mirrors the serializers in
 * backend/src/utils/serializers.js (EMR section). The visit is the booking;
 * "clinic" vs "video" is only the appointment type.
 */

export type AppointmentType = "clinic" | "video";
export type VisitStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface EmrPatientLite {
  id: string;
  regNo: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  age: number | null;
  gender: string | null;
}

export interface WorkbenchVisit {
  bookingId: string;
  patient: EmrPatientLite;
  date: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  status: VisitStatus;
  queueNumber: number | null;
  queueState: string | null;
  clinic: { id: string; name: string; city: string | null } | null;
  isReferral: boolean;
  canOpen: boolean;
}

export interface RosterEntry {
  patient: EmrPatientLite;
  visitCount: number;
  lastVisitOn: string;
  lastBookingId: string;
}

export interface Capped<T> {
  rows: T[];
  capped: boolean;
}

export type ConsultationView = "pending" | "completed";

export interface Workbench {
  date: string;
  view: ConsultationView;
  counts: { pending: number; completed: number };
  consultations: WorkbenchVisit[];
  today: WorkbenchVisit[];
  upcoming: Capped<WorkbenchVisit>;
  previous: Capped<RosterEntry>;
  all: Capped<RosterEntry>;
}

// ── Vitals ───────────────────────────────────────────────────────────────────
export type VitalKey =
  | "weightKg"
  | "heightCm"
  | "bmi"
  | "waistCm"
  | "hipCm"
  | "waistHipRatio"
  | "temperatureF"
  | "spo2Percent"
  | "respiratoryRate"
  | "pulseRateBpm"
  | "heartRateBpm"
  | "bpSystolic"
  | "bpDiastolic"
  | "headCircumferenceCm"
  | "bloodPressure";

export type VitalStatus = "normal" | "low" | "borderline" | "high" | "critical" | "unknown";

export interface VitalField {
  key: VitalKey;
  label: string;
  unit: string;
  derived?: boolean;
  normal?: { min: number | null; max: number | null; display?: string } | null;
}

export interface VitalEntry {
  id: string;
  recordedOn: string;
  recordedAt: string | null;
  bookingId: string | null;
  source: "patient" | "doctor" | "clinic";
  recordedBy: { id: string; name: string } | null;
  note: string | null;
  location: string | null;
  values: Partial<Record<VitalKey, number | string | null>>;
  statuses: Partial<Record<VitalKey, { status: VitalStatus; label?: string }>>;
}

export interface VitalsMatrix {
  fields: VitalField[];
  entries: VitalEntry[];
}

export interface LatestVital {
  value: number | string;
  recordedOn: string;
  recordedAt: string | null;
  status: VitalStatus;
  label: string | null;
}

export type NewVitals = Partial<
  Record<
    | "bpSystolic"
    | "bpDiastolic"
    | "pulseRateBpm"
    | "heartRateBpm"
    | "respiratoryRate"
    | "spo2Percent"
    | "temperatureF"
    | "heightCm"
    | "weightKg"
    | "waistCm"
    | "hipCm"
    | "headCircumferenceCm",
    number | null
  >
> & { recordedAt?: string; note?: string | null };

// ── Workspace ────────────────────────────────────────────────────────────────
export interface EmrVisit {
  bookingId: string;
  date: string;
  startTime: string | null;
  appointmentType: AppointmentType;
  status: VisitStatus;
  queueNumber: number | null;
  consultStartedAt: string | null;
  consultEndedAt: string | null;
  clinic: { id: string; name: string; city: string | null } | null;
  doctor: { id: string; name: string | null; photoUrl?: string | null; qualification: string | null; specializations: string[] } | null;
}

export interface EmrIdentity {
  id: string;
  regNo: string;
  registeredAt: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  age: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string;
  address: string | null;
  emergencyContact: { name: string | null; phone: string | null } | null;
  allergies: { name: string | null; severity: string | null }[];
  conditions: { name: string | null; diagnosedYear: number | null }[];
  currentMedications: { medicineName: string; dosage: string | null; frequency: string | null }[];
  noKnownAllergies: boolean;
  noKnownConditions: boolean;
  noCurrentMedications: boolean;
}

export interface EmrWorkspace {
  patient: EmrIdentity;
  encounter: (EmrVisit & { canRecord: boolean }) | null;
  latestVitals: Partial<Record<VitalKey, LatestVital>>;
  vitalFields: VitalField[];
  visits: EmrVisit[];
  /** Which of other doctors' records this doctor may see (migration 057). */
  access: ClinicalAccess | null;
}

// ── Structured entries ───────────────────────────────────────────────────────
export type EntryKind =
  | "complaint"
  | "history"
  | "comorbidity"
  | "examination"
  | "diagnosis"
  | "investigation"
  | "doctor_note";

export interface ClinicalEntry {
  id: string;
  kind: EntryKind;
  category: string | null;
  title: string | null;
  code: string | null;
  /** The admin ICD catalogue row this diagnosis was picked from (null = typed by hand / older entry). */
  icdCodeId?: string | null;
  /** Snapshot taken when it was picked — stays accurate if the catalogue changes. */
  codeSystem?: string | null;
  codeVersion?: string | null;
  codeDescription?: string | null;
  details: Record<string, string | number | boolean | null> | null;
  remarks: string | null;
  recordedOn: string | null;
  patientVisible: boolean;
  status: "active" | "entered_in_error";
  retiredReason: string | null;
  bookingId: string | null;
  visitDate: string | null;
  author: { id: string; name: string } | null;
  isMine?: boolean;
  canEdit?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewEntry {
  kind: EntryKind;
  category?: string | null;
  title?: string | null;
  code?: string | null;
  details?: Record<string, string | number | boolean | null> | null;
  remarks?: string | null;
  recordedOn?: string | null;
  patientVisible?: boolean;
  /** A diagnosis picked from the admin ICD catalogue — the server fills code, system and version from it. */
  icdCodeId?: string | null;
}

export type EntryPatch = Partial<Omit<NewEntry, "kind" | "category" | "icdCodeId">>;

// ── Catalogue (structure only) ───────────────────────────────────────────────
export interface FormField {
  key: string;
  label: string;
  multiline?: boolean;
}
export interface CategoryDef {
  key: string;
  label: string;
  fields?: FormField[];
  appliesTo?: { gender?: string; maxAge?: number };
}

export interface EmrCatalog {
  historyCategories: CategoryDef[];
  comorbidityCategories: CategoryDef[];
  examinationForms: CategoryDef[];
  diagnosisTypes: string[];
  investigationTypes: string[];
  priorities: string[];
  noteTypes: string[];
  medicineRoutes: string[];
  medicineTimings: string[];
  durationUnits: string[];
  medicineNameTypes: string[];
  /** Dosage forms — the IHS catalogue's own vocabulary (tablet, capsule, syrup, …). */
  dosageForms: string[];
  followUpIntervalUnits: string[];
  entryEditHours: number;
  vitalFields: VitalField[];
}

export interface MedicineHit {
  /** Tell own-list and catalogue hits apart by this — an own medicine may carry a catalogueId too. */
  source: "mine" | "catalogue";
  medicineId: string | null;
  /** Catalogue row: the hit itself ("catalogue") or the row an own medicine is linked to ("mine", may be null). */
  catalogueId: string | null;
  name: string;
  genericName: string | null;
  type: string | null;
  /** Tablet / capsule / syrup / … when known. */
  dosageForm?: string | null;
  strength: string | null;
  manufacturer: string | null;
  /** Saved defaults of the doctor's own medicine (never set on catalogue results). */
  defaultFrequency?: string | null;
  defaultTiming?: string | null;
}

export interface InvestigationHit {
  diagnosticTestId: string;
  name: string;
  labCount: number;
  minPrice: number | null;
}

export interface DiagnosisHit {
  title: string;
  code: string | null;
  icdCodeId?: string | number | null;
  codeSystem?: string | null;
  codeVersion?: string | null;
  uses: number | string;
}

/** One row of the admin ICD catalogue (backend migration 059). */
export interface IcdHit {
  id: string;
  codingSystem: string;
  systemVersion: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

// ── Visit summary ────────────────────────────────────────────────────────────
export interface VisitRxItem {
  medicineId: string | null;
  medicineName: string;
  strength?: string | null;
  dosageForm?: string | null;
  dosage: string | null;
  route: string;
  frequency: string | null;
  timing: string | null;
  durationDays: number | null;
  durationUnit: string;
  notes: string | null;
  quantity: number | null;
  priority: string | null;
  nameType: string | null;
}

export interface VisitSummary {
  visit: EmrVisit;
  vitals: VitalEntry[];
  prescription: {
    id: string;
    status: "draft" | "finalized";
    rxNumber: string | null;
    version: number;
    finalizedAt: string | null;
    chiefComplaint: string | null;
    diagnosis: string | null;
    notes: string | null;
    advice: string | null;
    followUpDate: string | null;
    noMedication: boolean;
    items: VisitRxItem[];
  } | null;
  entries: ClinicalEntry[];
  clinicalNotes: {
    id: string;
    complaints: string | null;
    onExamination: string | null;
    diagnosis: string | null;
    treatment: string | null;
    createdAt: string;
  }[];
  followUp: {
    followUpOn: string | null;
    note: string | null;
    intervalValue: number | null;
    intervalUnit: string | null;
    homeCare: boolean;
    serviceName: string | null;
    serviceQuantity: number | null;
    comments: string | null;
    status: { label: string; colorHex: string } | null;
  } | null;
  /** Parts of ANOTHER doctor's visit not granted to this doctor. */
  locked?: AccessCategory[];
}

// ── Clinical-history consent (migration 057) ─────────────────────────────────
export type AccessCategory =
  | "medical_history" | "consultations" | "diagnoses" | "medications"
  | "investigations" | "doctor_notes" | "vitals";

/**
 * One patient document the server allowed this doctor to see
 * (GET /doctor/emr/patients/:id/documents). `access.via` says why:
 *   own      — the doctor filed it;
 *   category — the patient granted that consent category (057);
 *   document — shared one-by-one through a document request (045). These
 *              have no fileUrl: they are read through the audited stream.
 */
export interface PatientDocument {
  id: string;
  fileUrl: string | null;
  tag: string | null;
  recordDate: string | null;
  uploadedAt: string | null;
  fileType: string | null;
  documentKind: string | null;
  location: string | null;
  doctorName: string | null;
  description: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  updatedAt: string | null;
  source: string;
  recordedBy: { id: string; name: string } | null;
  access:
    | { via: "own" }
    | { via: "category"; category: AccessCategory }
    | { via: "document"; requestId: string; until: string };
}

/** `open` = common information, visible to every treating doctor without a request. */
export type AccessCategoryStatus = "open" | "none" | "granted" | "pending" | "rejected" | "revoked" | "expired" | "cancelled";

export interface AccessCategoryState {
  category: AccessCategory;
  label: string;
  description: string;
  status: AccessCategoryStatus;
  granted: boolean;
  grantExpiresAt: string | null;
  requestId: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
  requestExpiresAt: string | null;
  canRequest: boolean;
  retryAt: string | null;
}

export interface ClinicalAccess {
  categories: AccessCategoryState[];
  grantedCount: number;
  grantDays: number[];
  defaultGrantDays: number;
  skipped?: { category: AccessCategory; reason: string }[];
}

// ── Structured history (same shape the patient's record uses) ────────────────
export interface HistoryRx {
  id: string;
  rxNumber: string | null;
  status: "draft" | "finalized";
  version: number;
  finalizedAt: string | null;
  createdAt: string | null;
  bookingId: string | null;
  visitDate: string | null;
  doctor: { id: string; name: string | null } | null;
  chiefComplaint: string | null;
  diagnosis: string | null;
  advice: string | null;
  noMedication: boolean;
  items: VisitRxItem[];
}

export interface HistoryNote {
  id: string;
  date: string;
  doctorName: string | null;
  recordedByName: string | null;
  bookingId: string | null;
  complaints: string | null;
  onExamination: string | null;
  historyMedical: string | null;
  historySurgical: string | null;
  diagnosis: string | null;
  treatment: string | null;
}

export interface HistoryFollowUp {
  followUpOn: string | null;
  note: string | null;
  homeCare: boolean;
  serviceName: string | null;
  serviceQuantity: number | null;
  comments: string | null;
  status: { label: string; colorHex: string } | null;
  doctor: { id: string; name: string } | null;
}

export interface HistoryConsultation {
  visit: EmrVisit;
  isMine: boolean;
  complaints: ClinicalEntry[];
  examinations: ClinicalEntry[];
  /** null = locked for this viewer (never "none recorded"). */
  diagnoses: ClinicalEntry[] | null;
  rxDiagnosis: string | null;
  /** The visit's advice when its prescription is still locked (otherwise it is on the prescription). */
  advice?: string | null;
  investigations: ClinicalEntry[] | null;
  notes: ClinicalEntry[] | null;
  consultationNotes: HistoryNote[] | null;
  prescription: HistoryRx | null;
  vitals: VitalEntry[];
  followUp: HistoryFollowUp | null;
  locked: AccessCategory[];
}

export interface MedicalHistory {
  consultations: HistoryConsultation[];
  medicalHistory: ClinicalEntry[];
  longTermConditions: ClinicalEntry[];
  diagnoses: ClinicalEntry[];
  prescriptionDiagnoses: {
    prescriptionId: string;
    diagnosis: string;
    bookingId: string | null;
    visitDate: string | null;
    date: string | null;
    doctor: { id: string; name: string | null } | null;
  }[];
  prescriptions: HistoryRx[];
  investigations: ClinicalEntry[];
  doctorNotes: ClinicalEntry[];
  consultationNotes: HistoryNote[];
  lockedCategories: AccessCategory[];
  capped: { consultations: boolean; prescriptions: boolean };
  access: ClinicalAccess | null;
}

// ── Longitudinal timeline (GET /doctor/emr/patients/:id/timeline) ───────────
export type TimelineEventType =
  | "consultation" | "complaint" | "examination" | "vitals" | "note"
  | "diagnosis" | "investigation" | "report" | "prescription" | "follow_up";

export type TimelineGroup = "all" | "consultations" | "diagnoses" | "investigations" | "prescriptions" | "followups";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  /** The clinical date (YYYY-MM-DD). null = the record carries none — never the upload date. */
  date: string | null;
  at: string | null;
  uploadedAt?: string | null;
  doctor: { id: string | null; name: string | null } | null;
  specialties: string[];
  clinic: { id: string | null; name: string; city: string | null } | null;
  consultation: { bookingId: string; date: string; appointmentType: string; status: string } | null;
  status: string | null;
  details: string[];
  /** The original record this event was built from. */
  source: { kind: string; id: string };
}

export interface AuditQuery {
  from?: string;
  to?: string;
  action?: string;
  entityType?: string;
  page: number;
  limit: number;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: string;
  role: string | null;
  entityType: string | null;
  entityId: string | null;
  details: { before?: Record<string, unknown>; reason?: string; grantedCategories?: string[]; documents?: number } | null;
}

export interface AuditPage {
  items: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  actions: string[];
  entityTypes: string[];
}

export interface TimelineQuery {
  types?: TimelineGroup;
  doctorId?: string;
  specialty?: string;
  from?: string;
  to?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PatientTimeline {
  events: TimelineEvent[];
  total: number;
  page: number;
  limit: number;
  facets: { doctors: { id: string; name: string }[]; specialties: string[] };
  capped: { consultations: boolean; prescriptions: boolean };
}
