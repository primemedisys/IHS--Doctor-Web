"use client";

import {
  useMutation,
  useQueryClient, useQuery, keepPreviousData } from "@tanstack/react-query";
import { doctorTimelineService } from "../services/timeline.service";
import type { MyPatientsQuery, PatientStatus, TimelineFilters } from "@/types/timeline";

/**
 * Query keys are kept DISTINCT for the two paths ("booking" vs "patient") on
 * purpose: they return the same shape, so a shared key would let a cached
 * booking-scoped result be served to the patient-scoped page — showing one
 * patient's history under another patient's name.
 */
const key = (scope: "booking" | "patient", id: string, f: TimelineFilters) =>
  ["doctor", "timeline", scope, id, f.year ?? null, f.month ?? null, f.sort ?? "newest"] as const;

/** §5.3 — the patient of this appointment / live video consult. */
export function useTimelineByBooking(bookingId: string, filters: TimelineFilters = {}) {
  return useQuery({
    queryKey: key("booking", bookingId, filters),
    queryFn: () => doctorTimelineService.listByBooking(bookingId, filters),
    enabled: Boolean(bookingId),
  });
}

/** §5.4 — a named patient from the roster. */
export function useTimelineByPatient(patientId: string, filters: TimelineFilters = {}) {
  return useQuery({
    queryKey: key("patient", patientId, filters),
    queryFn: () => doctorTimelineService.listByPatient(patientId, filters),
    enabled: Boolean(patientId),
  });
}

/** The My Patients roster. */
export function useMyPatients(query?: MyPatientsQuery) {
  return useQuery({
    queryKey: ["doctor", "my-patients", query ?? null],
    queryFn: () => doctorTimelineService.myPatients(query),
    // Keep the current page on screen while the next page / search loads.
    placeholderData: keepPreviousData,
  });
}


/** Set a patient's My-Patients status; the roster refetches so the row updates. */
export function useSetPatientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, status }: { patientId: string; status: PatientStatus }) =>
      doctorTimelineService.setPatientStatus(patientId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["doctor", "my-patients"] });
    },
  });
}
