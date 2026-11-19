"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { queryKeys } from "@/constants/queryKeys";
import { prescriptionService } from "../services/prescription.service";
import type { PrescriptionFilters, PrescriptionUpdate } from "@/types/prescription";

export function usePrescriptions(filters: PrescriptionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.prescriptions.list(filters as Record<string, string | undefined>),
    queryFn: () => prescriptionService.list(filters),
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: queryKeys.prescriptions.detail(id),
    queryFn: () => prescriptionService.get(id),
    enabled: !!id,
  });
}

/**
 * "Does this appointment have a prescription yet?" A 404 is the ANSWER (no),
 * not a failure — so don't retry it and don't render an error state.
 */
export function useBookingPrescription(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.prescriptions.byBooking(bookingId),
    queryFn: () => prescriptionService.getByBooking(bookingId),
    enabled: !!bookingId,
    retry: (count, error) =>
      error instanceof AxiosError && error.response?.status === 404 ? false : count < 2,
  });
}

/** Everything that changes a prescription must also refresh its appointment card. */
function useRxInvalidator() {
  const qc = useQueryClient();
  return (id: string, bookingId?: string | null) => {
    qc.invalidateQueries({ queryKey: queryKeys.prescriptions.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.prescriptions.all() });
    if (bookingId) {
      qc.invalidateQueries({ queryKey: queryKeys.prescriptions.byBooking(bookingId) });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(bookingId) });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() });
    }
    // Signing a prescription fills the timeline's Prescription column (and its
    // diagnosis feeds the Issue column), so every timeline view the doctor has
    // open is now stale. The root key covers both the booking- and
    // patient-scoped variants without naming the mounted ones.
    qc.invalidateQueries({ queryKey: ["doctor", "timeline"] });
  };
}

export function useCreatePrescription() {
  const invalidate = useRxInvalidator();
  return useMutation({
    mutationFn: (body: { bookingId: string; templateId?: string }) => prescriptionService.create(body),
    onSuccess: (rx) => invalidate(rx.id, rx.booking?.id),
  });
}

/** The composer's autosave. Writes the server row into the cache, never refetches mid-typing. */
export function useUpdatePrescription(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PrescriptionUpdate) => prescriptionService.update(id, body),
    onSuccess: (rx) => qc.setQueryData(queryKeys.prescriptions.detail(id), rx),
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prescriptionService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.prescriptions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all() });
    },
  });
}

export function useFinalizePrescription(id: string) {
  const invalidate = useRxInvalidator();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emailPatient: boolean) => prescriptionService.finalize(id, emailPatient),
    onSuccess: (rx) => {
      qc.setQueryData(queryKeys.prescriptions.detail(id), rx);
      invalidate(id, rx.booking?.id);
    },
  });
}

export function useAmendPrescription(id: string) {
  const invalidate = useRxInvalidator();
  return useMutation({
    mutationFn: (reason: string) => prescriptionService.amend(id, reason),
    onSuccess: (draft) => invalidate(draft.id, draft.booking?.id),
  });
}

/** The finalized PDF, as an object URL the viewer/iframe can point at. */
export function usePrescriptionPdf(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.prescriptions.pdf(id),
    queryFn: () => prescriptionService.pdf(id),
    enabled: enabled && !!id,
    staleTime: Infinity,
  });
}
