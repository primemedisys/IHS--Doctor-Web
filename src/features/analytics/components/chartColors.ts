"use client";

import { useTheme } from "@mui/material/styles";
import type { AcquisitionGroupKey } from "../types";

/**
 * Chart colours, all read from the theme palette (never hex in components).
 *
 * `categorical` is a FIXED order, validated with the dataviz palette checker
 * (lightness band, chroma, colour-blind separation of adjacent pairs, ≥3:1 on
 * white): primary (navy) → success → warning → teal → purple. A series
 * keeps its slot whatever else is on screen.
 *
 * `status` is reserved for appointment states and always ships with a legend:
 * completed = green, pending = orange, cancelled = red, no-show = grey.
 */
export function useChartColors() {
  const t = useTheme();
  const p = t.palette;
  const categorical = [p.primary.main, p.success.main, p.warning.main, t.tokens.accent.teal.fg, t.tokens.accent.purple.fg] as const;
  return {
    categorical,
    /** Two related measures (collected vs net, new vs returning, clinic vs video). */
    pair: [p.primary.main, t.tokens.accent.teal.fg] as const,
    line: p.primary.main,
    negative: p.error.main,
    neutral: p.grey[400],
    status: { completed: p.success.main, pending: p.warning.main, cancelled: p.error.main, noShow: p.grey[400] },
    grid: p.divider,
    axis: p.text.secondary,
    surface: p.background.paper,
    text: p.text.primary,
    radius: t.tokens.radius.sm,
  };
}

/** Acquisition chart series: 6 slots (Other folds in "Not sure"; "Not asked" is the neutral grey). */
export type AcqSeriesKey = "google" | "social" | "referral" | "ihs" | "other" | "not_captured";
export const ACQ_SERIES: { key: AcqSeriesKey; label: string; groups: AcquisitionGroupKey[] }[] = [
  { key: "google", label: "Google", groups: ["google"] },
  { key: "social", label: "Social media / Meta", groups: ["social"] },
  { key: "referral", label: "Referral", groups: ["referral"] },
  { key: "ihs", label: "IHS platform", groups: ["ihs"] },
  { key: "other", label: "Other / not sure", groups: ["other", "undisclosed"] },
  { key: "not_captured", label: "Not asked", groups: ["not_captured"] },
];

export function acqColor(c: ReturnType<typeof useChartColors>, key: AcqSeriesKey): string {
  const i = ACQ_SERIES.findIndex((s) => s.key === key);
  return key === "not_captured" ? c.neutral : c.categorical[i];
}
