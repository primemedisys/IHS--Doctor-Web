/**
 * The types the shared history views (features/emr/components/HistoryViews.tsx)
 * read. The patient app has the same module over its own types file, so the
 * two copies of HistoryViews stay identical.
 */
export type {
  AccessCategory,
  ClinicalAccess,
  ClinicalEntry,
  HistoryConsultation,
  HistoryNote,
  HistoryRx,
  MedicalHistory,
  VisitRxItem,
  VitalEntry,
  VitalKey,
} from "./emr";
