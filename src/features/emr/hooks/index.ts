"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emrService } from "../services/emr.service";
import type { AuditQuery, ConsultationView, EntryKind, EntryPatch, NewEntry, NewVitals, TimelineQuery } from "@/types/emr";

/** One root so a write can refresh every EMR view of the patient it touched. */
export const emrKeys = {
  all: ["doctor", "emr"] as const,
  catalog: () => [...emrKeys.all, "catalog"] as const,
  workbench: (date: string, view: ConsultationView, q: string) => [...emrKeys.all, "workbench", date, view, q] as const,
  patient: (patientId: string) => [...emrKeys.all, "patient", patientId] as const,
  workspace: (patientId: string, bookingId: string | null) =>
    [...emrKeys.patient(patientId), "workspace", bookingId ?? "auto"] as const,
  vitals: (patientId: string, from?: string, to?: string) =>
    [...emrKeys.patient(patientId), "vitals", from ?? null, to ?? null] as const,
  entries: (patientId: string, kind?: EntryKind, bookingId?: string, includeRetired?: boolean) =>
    [...emrKeys.patient(patientId), "entries", kind ?? "all", bookingId ?? "all", Boolean(includeRetired)] as const,
  visit: (patientId: string, bookingId: string) => [...emrKeys.patient(patientId), "visit", bookingId] as const,
  history: (patientId: string) => [...emrKeys.patient(patientId), "history"] as const,
  // Under the patient key, so an approval / revocation picked up by the access
  // poll (RecordAccessProvider) refetches it with no page reload.
  documents: (patientId: string) => [...emrKeys.patient(patientId), "documents"] as const,
};

export function useEmrCatalog() {
  return useQuery({ queryKey: emrKeys.catalog(), queryFn: emrService.catalog, staleTime: 60 * 60 * 1000 });
}

export function useWorkbench(date: string, view: ConsultationView, q: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: emrKeys.workbench(date, view, q),
    queryFn: () => emrService.workbench({ date, view, q }),
    enabled,
    // Keep the previous day's columns on screen while the next day loads —
    // the layout must not collapse every time the doctor taps "next".
    placeholderData: keepPreviousData,
  });
}

export function useEmrWorkspace(patientId: string, bookingId: string | null) {
  return useQuery({
    queryKey: emrKeys.workspace(patientId, bookingId),
    queryFn: () => emrService.workspace(patientId, bookingId),
    enabled: Boolean(patientId),
  });
}

export function usePatientVitals(patientId: string, range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: emrKeys.vitals(patientId, range.from, range.to),
    queryFn: () => emrService.vitals(patientId, range),
    enabled: Boolean(patientId),
    placeholderData: keepPreviousData,
  });
}

export function useEntries(patientId: string, f: { kind?: EntryKind; bookingId?: string; includeRetired?: boolean } = {}) {
  return useQuery({
    queryKey: emrKeys.entries(patientId, f.kind, f.bookingId, f.includeRetired),
    queryFn: () => emrService.entries(patientId, f),
    enabled: Boolean(patientId),
  });
}

export function useVisitSummary(patientId: string, bookingId: string | null) {
  return useQuery({
    queryKey: emrKeys.visit(patientId, bookingId ?? ""),
    queryFn: () => emrService.visitSummary(patientId, bookingId!),
    enabled: Boolean(patientId && bookingId),
  });
}

/** The structured history — other doctors' records only for granted categories (server-enforced). */
/** The patient's documents behind the consent gate (own / granted category / shared document). */
export function usePatientDocuments(patientId: string) {
  return useQuery({
    queryKey: emrKeys.documents(patientId),
    queryFn: () => emrService.documents(patientId),
    enabled: Boolean(patientId),
  });
}

/** One page of the patient's timeline — filtered, sorted and paginated by the server. */
export function useTimeline(patientId: string, q: TimelineQuery) {
  return useQuery({
    queryKey: [...emrKeys.patient(patientId), "timeline", q] as const,
    queryFn: () => emrService.timeline(patientId, q),
    enabled: Boolean(patientId),
    placeholderData: keepPreviousData,
  });
}

export function useAuditHistory(patientId: string, q: AuditQuery) {
  return useQuery({
    queryKey: [...emrKeys.patient(patientId), "audit", q] as const,
    queryFn: () => emrService.audit(patientId, q),
    enabled: Boolean(patientId),
    placeholderData: keepPreviousData,
  });
}

export function useMedicalHistory(patientId: string) {
  return useQuery({
    queryKey: emrKeys.history(patientId),
    queryFn: () => emrService.history(patientId),
    enabled: Boolean(patientId),
  });
}

/**
 * Ask the patient for categories of their history. Success refetches every
 * view of the patient so the sections show "pending"; a grant only ever comes
 * from the patient's approval, re-checked on each request by the server.
 */
export function useRequestAccess(patientId: string) {
  const invalidate = usePatientInvalidation(patientId);
  return useMutation({
    mutationFn: (body: { categories: string[]; purpose?: string }) => emrService.requestAccess(patientId, body),
    onSuccess: invalidate,
  });
}

export function useCancelAccessRequest(patientId: string) {
  const invalidate = usePatientInvalidation(patientId);
  return useMutation({ mutationFn: (id: string) => emrService.cancelAccessRequest(id), onSuccess: invalidate });
}

/** Any EMR write refreshes everything shown for that patient (header, lists, graphs, summaries). */
function usePatientInvalidation(patientId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: emrKeys.patient(patientId) });
    qc.invalidateQueries({ queryKey: [...emrKeys.all, "workbench"] });
    // The older booking-keyed views read the same rows (vitals table, timeline).
    qc.invalidateQueries({ queryKey: ["doctor", "timeline"] });
  };
}

export function useAddVitals(patientId: string, bookingId: string) {
  const invalidate = usePatientInvalidation(patientId);
  return useMutation({ mutationFn: (body: NewVitals) => emrService.addVitals(bookingId, body), onSuccess: invalidate });
}

export function useAddEntry(patientId: string, bookingId: string) {
  const invalidate = usePatientInvalidation(patientId);
  return useMutation({ mutationFn: (body: NewEntry) => emrService.addEntry(bookingId, body), onSuccess: invalidate });
}

export function useUpdateEntry(patientId: string) {
  const invalidate = usePatientInvalidation(patientId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntryPatch }) => emrService.updateEntry(id, patch),
    onSuccess: invalidate,
  });
}

export function useRetireEntry(patientId: string) {
  const invalidate = usePatientInvalidation(patientId);
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => emrService.retireEntry(id, reason),
    onSuccess: invalidate,
  });
}
