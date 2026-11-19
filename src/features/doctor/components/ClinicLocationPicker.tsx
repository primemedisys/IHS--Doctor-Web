"use client";

import Skeleton from "@mui/material/Skeleton";
import dynamic from "next/dynamic";
import type { ClinicLocationPickerProps } from "./ClinicLocationPickerInner";

/**
 * Client-only wrapper for the Google Maps clinic-location picker. The Maps JS
 * API is browser-only, so the map is dynamically imported with `ssr: false`
 * (same pattern as components/ui/DoctorsMap).
 */
const Inner = dynamic(() => import("./ClinicLocationPickerInner"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" sx={{ width: "100%", height: 340 }} />,
});

export function ClinicLocationPicker(props: ClinicLocationPickerProps) {
  return <Inner {...props} />;
}

export type { ClinicLocationPickerProps, PickedLocation } from "./ClinicLocationPickerInner";
