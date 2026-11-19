"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type { DoctorFilters } from "@/types/doctor";
import { getDoctorBySlug, getDoctorDetail, getRelatedDoctors, listDoctors } from "../services/doctor.service";

/** Paginated, filtered doctor list. Keeps previous data for smooth paging. */
export function useDoctors(filters: DoctorFilters) {
  return useQuery({
    queryKey: queryKeys.doctors.list(filters),
    queryFn: () => listDoctors(filters),
    placeholderData: keepPreviousData,
  });
}

/** Single doctor (base record) by slug. */
export function useDoctor(slug: string) {
  return useQuery({
    queryKey: queryKeys.doctors.detail(slug),
    queryFn: () => getDoctorBySlug(slug),
    enabled: !!slug,
  });
}

/** Full doctor profile (clinics, online availability, reviews) by slug. */
export function useDoctorDetail(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.doctors.detail(slug), "full"],
    queryFn: () => getDoctorDetail(slug),
    enabled: !!slug,
  });
}

/** Related doctors (same specialty). */
export function useRelatedDoctors(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.doctors.detail(slug), "related"],
    queryFn: () => getRelatedDoctors(slug),
    enabled: !!slug,
  });
}
