"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { appointmentService } from "../services/appointment.service";
import type { ClinicalNoteInput } from "@/types/appointment";

/** Every clinical note for this booking's patient (patient-wide, newest first). */
export function useClinicalNotes(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.appointments.clinicalNotes(bookingId),
    queryFn: () => appointmentService.listClinicalNotes(bookingId),
    enabled: !!bookingId,
  });
}

/** Append a new note, then refresh the list so it appears at the top. */
export function useAddClinicalNote(bookingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClinicalNoteInput) => appointmentService.addClinicalNote(bookingId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.clinicalNotes(bookingId) });
    },
  });
}
