"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { appointmentService } from "../services/appointment.service";
import type { AppointmentFilters } from "@/types/appointment";

/** The doctor's appointments list, filtered by status/date/clinic. */
export function useAppointments(filters: AppointmentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.appointments.list(filters as Record<string, string | undefined>),
    queryFn: () => appointmentService.listAppointments(filters),
  });
}

/** One appointment + patient snapshot. */
export function useAppointment(id: string) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => appointmentService.getAppointment(id),
    enabled: !!id,
  });
}

/**
 * Record an at-clinic payment. Refreshes the list + this detail, AND the
 * dashboard/earnings caches.
 *
 * The earnings invalidation is not cosmetic: marking a consult paid moves its
 * gross out of "Awaiting collection" and its net into "Earned this month".
 * Without it the doctor marks the booking paid, sees it flip, watches the
 * earnings tile sit unchanged, and marks it paid again — the money was recorded
 * correctly the first time; only the cache was stale.
 *
 * Invalidating the ROOT `earnings` key catches every period and page variant in
 * one call, rather than trying to name the ones currently mounted.
 */
export function useMarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentService.markPaid(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings.all() });
    },
  });
}

/**
 * Free slot start times the doctor offers on a date — the reschedule picker.
 * Reads the same public slots endpoint a patient books through, so the doctor
 * is offered exactly what a patient could have booked.
 */
export function useAvailableSlots(
  doctorId: string,
  params: { mode: "clinic" | "video"; date: string; clinicId?: string | null },
  enabled = true,
) {
  return useQuery({
    queryKey: ["doctor", "slots", doctorId, params.mode, params.date, params.clinicId ?? null],
    queryFn: () => appointmentService.availableSlots(doctorId, params),
    enabled: enabled && Boolean(doctorId && params.date),
  });
}

/** Move a confirmed appointment to another time. */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; date: string; startTime: string; reason?: string | null }) =>
      appointmentService.reschedule(id, body),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(id) });
      // The old slot is free and the new one is taken — any open slot picker
      // is now wrong.
      queryClient.invalidateQueries({ queryKey: ["doctor", "slots"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

/** Mark completed / no-show. Refreshes the list, this detail, and the tiles. */
export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, noShow }: { id: string; noShow?: boolean }) =>
      appointmentService.complete(id, noShow),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.earnings.all() });
      // Completing is what puts a consultation ON the treatment timeline (only
      // `completed` bookings are rows) and what can add a first-time patient to
      // the roster — without these the doctor finishes a consult and the
      // history they just created is missing until a hard reload.
      queryClient.invalidateQueries({ queryKey: ["doctor", "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", "my-patients"] });
    },
  });
}
