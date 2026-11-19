import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  ClinicalEntry,
  ConsultationView,
  DiagnosisHit,
  IcdHit,
  EmrCatalog,
  AuditPage,
  AuditQuery,
  ClinicalAccess,
  EmrWorkspace,
  MedicalHistory,
  EntryKind,
  EntryPatch,
  InvestigationHit,
  MedicineHit,
  NewEntry,
  NewVitals,
  PatientDocument,
  PatientTimeline,
  TimelineQuery,
  VisitSummary,
  VitalsMatrix,
  Workbench,
} from "@/types/emr";

const E = API_ENDPOINTS.doctor.emr;

/**
 * The doctor EMR workspace (backend migration 051). Every read is gated
 * server-side on a real doctor–patient relationship; every write goes through
 * a booking (the visit) the doctor owns — the patient id is never trusted from
 * here, the server derives it.
 */
export const emrService = {
  catalog: () => requestData<EmrCatalog>(api.get<ApiResponse<EmrCatalog>>(E.catalog)),

  workbench: (p: { date: string; view: ConsultationView; q?: string }) =>
    requestData<Workbench>(
      api.get<ApiResponse<Workbench>>(E.workbench, { params: { date: p.date, view: p.view, q: p.q || undefined } }),
    ),

  workspace: (patientId: string, bookingId?: string | null) =>
    requestData<EmrWorkspace>(
      api.get<ApiResponse<EmrWorkspace>>(E.patient(patientId), { params: { bookingId: bookingId || undefined } }),
    ),

  vitals: (patientId: string, range: { from?: string; to?: string } = {}) =>
    requestData<VitalsMatrix>(api.get<ApiResponse<VitalsMatrix>>(E.patientVitals(patientId), { params: range })),

  addVitals: (bookingId: string, body: NewVitals) =>
    requestData<VitalsMatrix>(api.post<ApiResponse<VitalsMatrix>>(E.bookingVitals(bookingId), body)),

  entries: (patientId: string, f: { kind?: EntryKind; bookingId?: string; includeRetired?: boolean } = {}) =>
    requestData<ClinicalEntry[]>(api.get<ApiResponse<ClinicalEntry[]>>(E.patientEntries(patientId), { params: f })),

  addEntry: (bookingId: string, body: NewEntry) =>
    requestData<ClinicalEntry>(api.post<ApiResponse<ClinicalEntry>>(E.bookingEntries(bookingId), body)),

  updateEntry: (id: string, body: EntryPatch) =>
    requestData<ClinicalEntry>(api.patch<ApiResponse<ClinicalEntry>>(E.entry(id), body)),

  retireEntry: (id: string, reason: string) =>
    requestData<ClinicalEntry>(api.post<ApiResponse<ClinicalEntry>>(E.retireEntry(id), { reason })),

  visitSummary: (patientId: string, bookingId: string) =>
    requestData<VisitSummary>(api.get<ApiResponse<VisitSummary>>(E.visitSummary(patientId, bookingId))),

  history: (patientId: string) =>
    requestData<MedicalHistory>(api.get<ApiResponse<MedicalHistory>>(E.patientHistory(patientId))),

  timeline: (patientId: string, q: TimelineQuery) =>
    requestData<PatientTimeline>(api.get<ApiResponse<PatientTimeline>>(E.patientTimeline(patientId), { params: q })),

  /** The patient's documents this doctor may see — locked ones are simply absent. */
  documents: (patientId: string) =>
    requestData<PatientDocument[]>(api.get<ApiResponse<PatientDocument[]>>(E.patientDocuments(patientId))),

  /** One document shared through a document request: streamed (authenticated, audited) as a Blob. */
  async sharedRecordFile(requestId: string, recordId: string): Promise<Blob> {
    const res = await api.get(E.sharedRecordFile(requestId, recordId), { responseType: "blob" });
    return res.data as Blob;
  },

  audit: (patientId: string, q: AuditQuery) =>
    requestData<AuditPage>(api.get<ApiResponse<AuditPage>>(E.patientAudit(patientId), { params: q })),

  access: (patientId: string) =>
    requestData<ClinicalAccess>(api.get<ApiResponse<ClinicalAccess>>(E.patientAccess(patientId))),

  requestAccess: (patientId: string, body: { categories: string[]; purpose?: string }) =>
    requestData<ClinicalAccess>(api.post<ApiResponse<ClinicalAccess>>(E.patientAccessRequests(patientId), body)),

  cancelAccessRequest: (id: string) => api.post(E.cancelAccessRequest(id)),

  searchMedicines: (q: string) =>
    requestData<MedicineHit[]>(api.get<ApiResponse<MedicineHit[]>>(E.searchMedicines, { params: { q } })),

  searchInvestigations: (q: string) =>
    requestData<InvestigationHit[]>(api.get<ApiResponse<InvestigationHit[]>>(E.searchInvestigations, { params: { q } })),

  searchDiagnoses: (q: string) =>
    requestData<DiagnosisHit[]>(api.get<ApiResponse<DiagnosisHit[]>>(E.searchDiagnoses, { params: { q } })),

  /** The admin ICD catalogue — by diagnosis name or code. Every match is returned for the doctor to choose. */
  searchIcd: (q: string) => requestData<IcdHit[]>(api.get<ApiResponse<IcdHit[]>>(E.searchIcd, { params: { q } })),
};
