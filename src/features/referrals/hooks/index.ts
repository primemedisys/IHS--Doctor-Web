"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { useDebounce } from "@/hooks/useDebounce";
import { referralService } from "../services/referral.service";
import type { CreateReferralInput } from "@/types/referral";

/**
 * The "type a first name → suggestions" engine. Keyed on the DEBOUNCED query so
 * we don't fire a request per keystroke; `keepPreviousData` stops the list
 * flickering while the next page streams in.
 */
export function useReferralTargets(q: string, clinicId?: string) {
  const debounced = useDebounce(q.trim(), 250);
  return useQuery({
    queryKey: queryKeys.referrals.targets(debounced, clinicId),
    queryFn: () => referralService.listTargets(debounced, clinicId),
    enabled: debounced.length >= 1,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/** Referrals already made from this consultation. */
export function useBookingReferrals(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.referrals.forBooking(bookingId),
    queryFn: () => referralService.listBookingReferrals(bookingId),
    enabled: !!bookingId,
  });
}

/** Create a referral, then refresh the from-this-booking list. */
export function useCreateReferral(bookingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReferralInput) => referralService.createReferral(bookingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.forBooking(bookingId) });
    },
  });
}

/** Cancel a pending referral, then refresh the list. */
export function useCancelReferral(bookingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => referralService.cancelReferral(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.forBooking(bookingId) });
    },
  });
}

/** The inbox of referrals sent TO the signed-in doctor. */
export function useIncomingReferrals(status?: string) {
  return useQuery({
    queryKey: queryKeys.referrals.incoming(status),
    queryFn: () => referralService.listIncoming(status),
  });
}

/**
 * Begin the walk-in consultation for an incoming referral. Creates the target
 * doctor's ₹0 appointment and returns its id; refreshes the inbox (the referral
 * flips to "booked") and the appointments board (the new consult appears there).
 */
export function useStartReferralConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => referralService.startConsultation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
    },
  });
}

/** The referring doctor's notes + prescription behind one incoming referral. */
export function useReferralCase(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.referrals.case(id),
    queryFn: () => referralService.getCase(id),
    enabled: enabled && !!id,
  });
}

/** The referring doctor's prescription PDF (blob) for inline viewing. */
export function useReferralCasePdf(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.referrals.casePdf(id),
    queryFn: () => referralService.casePdf(id),
    enabled: enabled && !!id,
    staleTime: Infinity,
  });
}
