"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { analyticsService } from "../services/analytics.service";
import type { AppointmentsParams, DateRange, FinancialParams, PatientsParams, SeriesParams } from "../types";

/** Money moves (mark paid, refunds) — keep it fresh. */
const MONEY_STALE = 30_000;
const STALE = 60_000;

/** Every KPI card on the overview — one request. */
export function useAnalyticsOverview(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("overview", { ...range }),
    queryFn: () => analyticsService.overview(range),
    placeholderData: keepPreviousData,
    staleTime: MONEY_STALE,
  });
}

/** The overview charts (revenue, appointments, patients, acquisition). */
export function useAnalyticsTrends(params: SeriesParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("trends", { ...params }),
    queryFn: () => analyticsService.trends(params),
    placeholderData: keepPreviousData,
    staleTime: MONEY_STALE,
  });
}

/** Tables keep the previous page on screen while the next loads. */
export function usePatientsAnalytics(params: PatientsParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("patients", { ...params }),
    queryFn: () => analyticsService.patients(params),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useAppointmentsAnalytics(params: AppointmentsParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("appointments", { ...params }),
    queryFn: () => analyticsService.appointments(params),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useFinancialAnalytics(params: FinancialParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("financial", { ...params }),
    queryFn: () => analyticsService.financial(params),
    placeholderData: keepPreviousData,
    staleTime: MONEY_STALE,
  });
}

export function useQualityAnalytics(params: SeriesParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("quality", { ...params }),
    queryFn: () => analyticsService.quality(params),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useProductivityAnalytics(params: SeriesParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("productivity", { ...params }),
    queryFn: () => analyticsService.productivity(params),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useAcquisitionAnalytics(params: SeriesParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics("acquisition", { ...params }),
    queryFn: () => analyticsService.acquisition(params),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}
