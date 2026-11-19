"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { appointmentService } from "../services/appointment.service";
import type { PatientVitalsInput } from "@/types/appointment";

/**
 * The patient's self-recorded vitals timeline for this booking's patient (the
 * record table). Gated backend-side to the doctor's own confirmed/completed
 * booking, so it only fetches once a bookingId is present.
 */
export function usePatientVitals(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.appointments.patientVitals(bookingId),
    queryFn: () => appointmentService.getPatientVitals(bookingId),
    enabled: !!bookingId,
  });
}

/**
 * Append a doctor-recorded reading to this patient's record. The endpoint
 * returns the refreshed matrix, so we write it straight into the cache — the
 * table and the prescription's vitals prefill both update without a refetch.
 */
export function useAddPatientVitals(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatientVitalsInput) => appointmentService.addPatientVitals(bookingId, body),
    onSuccess: (matrix) => {
      qc.setQueryData(queryKeys.appointments.patientVitals(bookingId), matrix);
    },
  });
}

/**
 * Correct the DATE one of the patient's documents speaks for. Invalidates the
 * appointment detail (the snapshot owns the records), so the document moves to
 * its corrected date block on the record page.
 */
export function useUpdatePatientRecordDate(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, recordDate }: { recordId: string; recordDate: string }) =>
      appointmentService.updatePatientRecordDate(bookingId, recordId, recordDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(bookingId) });
    },
  });
}
