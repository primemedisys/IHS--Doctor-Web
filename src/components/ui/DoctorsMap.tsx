"use client";

import Skeleton from "@mui/material/Skeleton";
import dynamic from "next/dynamic";
import type { DoctorsMapProps } from "./DoctorsMapInner";

/**
 * Client-only wrapper for the Google map. The Maps JS API is browser-only, so
 * the actual map is dynamically imported with `ssr: false` and a skeleton
 * placeholder is shown until it hydrates.
 */
const DoctorsMapInner = dynamic(() => import("./DoctorsMapInner"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" sx={{ width: "100%", height: "100%", minHeight: 240 }} />,
});

export function DoctorsMap(props: DoctorsMapProps) {
  return <DoctorsMapInner {...props} />;
}

export type { DoctorsMapProps };
