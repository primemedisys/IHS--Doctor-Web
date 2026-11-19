"use client";

import { useState } from "react";
import { effectiveGranularity, rangeQuery, type RangeValue } from "../range";
import type { Granularity } from "../types";

/**
 * The Explore More pages' period, mirrored into the URL (`?range=…&from&to`)
 * so a page can be reloaded or shared on the same range. Uses the native
 * history API (Next.js syncs it) — no server round trip per change.
 */
export function useRangeState(initial: RangeValue) {
  const [range, setRange] = useState<RangeValue>(initial);
  const update = (next: RangeValue) => {
    setRange(next);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `${window.location.pathname}?${rangeQuery(next)}`);
  };
  return [range, update] as const;
}

/** Chosen chart granularity; undefined = let the server pick from the range length. */
export function useGranularity(range: RangeValue) {
  const [g, setG] = useState<Granularity | undefined>(undefined);
  return [effectiveGranularity(g, range), setG] as const;
}
