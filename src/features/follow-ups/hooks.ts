"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { followUpService } from "./service";
import type { FollowUpStatusInput, FollowUpStatusPatch, SetFollowUpInput, SetReminderInput } from "@/types/followUp";

/**
 * Follow-up status hooks (docs/follow-up-status).
 *
 * Every mutation invalidates BOTH the follow-up keys and `appointments.all()`.
 * The appointments board renders this data in three places (the count card, the
 * column and the filter dropdown), so a status recoloured on the options page
 * that stayed blue on the roster would read as a bug, not as a stale cache.
 */
function useFollowUpInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
  };
}

/** The doctor's own option list. Seeded server-side on first read. */
export function useFollowUpStatuses() {
  return useQuery({
    queryKey: queryKeys.followUps.statuses(),
    queryFn: () => followUpService.listStatuses(),
    staleTime: 60_000,
  });
}

export function useCreateFollowUpStatus() {
  const invalidate = useFollowUpInvalidation();
  return useMutation({
    mutationFn: (input: FollowUpStatusInput) => followUpService.createStatus(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFollowUpStatus() {
  const invalidate = useFollowUpInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FollowUpStatusPatch }) =>
      followUpService.updateStatus(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteFollowUpStatus() {
  const invalidate = useFollowUpInvalidation();
  return useMutation({
    mutationFn: (id: string) => followUpService.deleteStatus(id),
    onSuccess: invalidate,
  });
}

export function useReorderFollowUpStatuses() {
  const invalidate = useFollowUpInvalidation();
  return useMutation({
    mutationFn: (ids: string[]) => followUpService.reorderStatuses(ids),
    onSuccess: invalidate,
  });
}

/** This CONSULTATION'S follow-up — what the appointment modal pre-fills from. */
export function useBookingFollowUp(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.followUps.forBooking(bookingId ?? ""),
    queryFn: () => followUpService.getBookingFollowUp(bookingId!),
    enabled: Boolean(bookingId),
  });
}

/**
 * Set/replace ONE consultation's follow-up.
 *
 * Keyed on the BOOKING: a follow-up is a decision made at a visit, so
 * re-tagging today's consult must leave that patient's earlier visits showing
 * whatever was decided at the time.
 */
export function useSetBookingFollowUp(bookingId: string) {
  const invalidate = useFollowUpInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetFollowUpInput) => followUpService.setBookingFollowUp(bookingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.forBooking(bookingId) });
      invalidate();
    },
  });
}

export function useClearBookingFollowUp(bookingId: string) {
  const invalidate = useFollowUpInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => followUpService.clearBookingFollowUp(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.forBooking(bookingId) });
      invalidate();
    },
  });
}

// ── Automatic follow-up reminders (docs/follow-up-reminders-07-09-2026) ─────

/** This consultation's reminder config. Null when no reminder is set. */
export function useBookingReminder(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.followUps.reminder(bookingId ?? ""),
    queryFn: () => followUpService.getBookingReminder(bookingId!),
    enabled: Boolean(bookingId),
  });
}

/** Create or update the reminder for a consultation. */
export function useSetBookingReminder(bookingId: string) {
  const invalidate = useFollowUpInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetReminderInput) => followUpService.setBookingReminder(bookingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.reminder(bookingId) });
      invalidate();
    },
  });
}

/** Cancel the reminder for a consultation. */
export function useClearBookingReminder(bookingId: string) {
  const invalidate = useFollowUpInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => followUpService.clearBookingReminder(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.reminder(bookingId) });
      invalidate();
    },
  });
}
