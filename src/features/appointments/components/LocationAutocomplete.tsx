"use client";

import Skeleton from "@mui/material/Skeleton";
import dynamic from "next/dynamic";
import type { LocationAutocompleteProps } from "./LocationAutocompleteInner";

/**
 * Client-only wrapper for the Google Maps location field (twin of the patient
 * app's). The Maps JS API is browser-only, so the picker is dynamically imported
 * with `ssr: false` (same pattern as ClinicLocationPicker / DoctorsMap).
 */
const Inner = dynamic(() => import("./LocationAutocompleteInner"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" sx={{ width: "100%", height: 56 }} />,
});

export function LocationAutocomplete(props: LocationAutocompleteProps) {
  return <Inner {...props} />;
}

export type { LocationAutocompleteProps } from "./LocationAutocompleteInner";
