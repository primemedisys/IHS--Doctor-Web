"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { dashboardService, earningsService } from "../services/dashboard.service";
import type { Period } from "@/types/dashboard";

/** The doctor's dashboard tiles. Invalidated by mark-paid / complete. */
export function useDoctorDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: dashboardService.getSummary,
    staleTime: 60_000,
  });
}

/** Today's schedule for the overview's right-hand card. */
export function useTodaySchedule() {
  return useQuery({
    queryKey: queryKeys.dashboard.today(),
    queryFn: dashboardService.getToday,
    staleTime: 60_000,
  });
}

/** Earnings totals for a period. */
export function useEarningsSummary(period: Period) {
  return useQuery({
    queryKey: queryKeys.earnings.summary(period),
    queryFn: () => earningsService.getSummary(period),
    staleTime: 5 * 60_000,
  });
}

/** The zero-filled chart series for a period. */
export function useEarningsSeries(period: Period) {
  return useQuery({
    queryKey: queryKeys.earnings.series(period),
    queryFn: () => earningsService.getSeries(period),
    staleTime: 5 * 60_000,
  });
}

/**
 * The paginated ledger.
 *
 * `keepPreviousData` holds the previous page's rows on screen while the next
 * loads, so paging doesn't flash an empty table and collapse the page height.
 */
export function useEarningsTransactions(period: Period, page: number) {
  return useQuery({
    queryKey: queryKeys.earnings.transactions(period, page),
    queryFn: () => earningsService.getTransactions(period, page),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}
