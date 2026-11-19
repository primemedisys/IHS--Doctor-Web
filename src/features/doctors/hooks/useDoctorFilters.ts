"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { SEARCH_PARAMS } from "@/constants/search-params";
import type { DoctorFilters, DoctorSort, Gender } from "@/types/doctor";

const toNum = (v: string | null): number | undefined => (v == null || v === "" ? undefined : Number(v));
const toBool = (v: string | null): boolean | undefined => (v === "true" ? true : undefined);

/**
 * URL is the single source of truth for the Find Doctor filters — so results
 * are shareable, bookmarkable and survive refresh. Parses searchParams into a
 * typed `DoctorFilters` and writes changes back to the query string.
 */
export function useDoctorFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<DoctorFilters>(
    () => ({
      search: searchParams.get(SEARCH_PARAMS.query) ?? undefined,
      specialtySlug: searchParams.get(SEARCH_PARAMS.specialty) ?? undefined,
      symptomSlug: searchParams.get(SEARCH_PARAMS.symptom) ?? undefined,
      stateCode: searchParams.get(SEARCH_PARAMS.state) ?? undefined,
      city: searchParams.get(SEARCH_PARAMS.city) ?? undefined,
      gender: (searchParams.get(SEARCH_PARAMS.gender) as Gender | null) ?? undefined,
      language: searchParams.get(SEARCH_PARAMS.language) ?? undefined,
      minExperience: toNum(searchParams.get(SEARCH_PARAMS.minExperience)),
      maxFee: toNum(searchParams.get(SEARCH_PARAMS.maxFee)),
      minRating: toNum(searchParams.get(SEARCH_PARAMS.minRating)),
      verified: toBool(searchParams.get(SEARCH_PARAMS.verified)),
      available: toBool(searchParams.get(SEARCH_PARAMS.available)),
      videoConsult: toBool(searchParams.get(SEARCH_PARAMS.videoConsult)),
      sort: (searchParams.get(SEARCH_PARAMS.sort) as DoctorSort | null) ?? "relevance",
      page: toNum(searchParams.get(SEARCH_PARAMS.page)) ?? 1,
    }),
    [searchParams],
  );

  /** Merge a patch of URL-keyed values; empty/false/undefined removes the key. */
  const update = useCallback(
    (patch: Record<string, string | number | boolean | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === false) params.delete(key);
        else params.set(key, String(value));
      }
      // Any filter change (other than paging itself) returns to page 1.
      if (!(SEARCH_PARAMS.page in patch)) params.delete(SEARCH_PARAMS.page);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback((page: number) => update({ [SEARCH_PARAMS.page]: page }), [update]);
  const reset = useCallback(() => router.push(pathname, { scroll: false }), [pathname, router]);

  /** True when any filter beyond paging/sort is active. */
  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.specialtySlug ||
          filters.symptomSlug ||
          filters.stateCode ||
          filters.city ||
          filters.gender ||
          filters.language ||
          filters.minExperience ||
          filters.maxFee ||
          filters.minRating ||
          filters.verified ||
          filters.available ||
          filters.videoConsult,
      ),
    [filters],
  );

  return { filters, update, setPage, reset, hasActiveFilters };
}
