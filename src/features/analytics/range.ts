import { istToday, shiftDay } from "@/features/emr/format";
import type { DateRange, Granularity } from "./types";

/**
 * The dashboard's period filter. Every bound is an IST calendar day
 * ("YYYY-MM-DD", inclusive) — the API's own convention — computed by string
 * arithmetic so the browser's time zone can never shift a day.
 */
export type RangePreset = "today" | "week" | "month" | "lastMonth" | "year" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export interface RangeValue extends DateRange {
  preset: RangePreset;
}

/** The API rejects wider ranges, and a daily series past this many days. */
export const MAX_RANGE_DAYS = 366;
export const MAX_DAILY_DAYS = 92;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (s: unknown): s is string => typeof s === "string" && DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Inclusive day count. */
export function rangeDays({ from, to }: DateRange): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Why a custom range can't be sent, or null when it's fine. */
export function rangeError(r: DateRange): string | null {
  if (!isDay(r.from) || !isDay(r.to)) return "Pick both dates";
  if (r.from > r.to) return "Start date must be on or before the end date";
  if (rangeDays(r) > MAX_RANGE_DAYS) return `A range can cover at most ${MAX_RANGE_DAYS} days`;
  return null;
}

/** A preset's bounds, as of today (IST). */
export function presetRange(preset: Exclude<RangePreset, "custom">, today = istToday()): DateRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      // Monday-start week, matching the server's week buckets.
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
      return { from: shiftDay(today, -((dow + 6) % 7)), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "lastMonth": {
      const lastDay = shiftDay(`${today.slice(0, 7)}-01`, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

export const DEFAULT_RANGE_PRESET: Exclude<RangePreset, "custom"> = "month";

export function rangeFor(preset: RangePreset, custom?: Partial<DateRange>): RangeValue {
  if (preset === "custom" && custom && isDay(custom.from) && isDay(custom.to) && !rangeError(custom as DateRange)) {
    return { preset, from: custom.from, to: custom.to };
  }
  const p: Exclude<RangePreset, "custom"> = preset === "custom" ? DEFAULT_RANGE_PRESET : preset;
  return { preset: p, ...presetRange(p) };
}

/** Parse `?range=…&from=…&to=…` (Explore More links carry the overview's period). */
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function rangeFromParams(sp: SearchParamsRecord): RangeValue {
  const read = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const preset = read("range") as RangePreset | undefined;
  const valid = RANGE_PRESETS.some((p) => p.value === preset) ? (preset as RangePreset) : DEFAULT_RANGE_PRESET;
  return rangeFor(valid, { from: read("from"), to: read("to") });
}

/** The query string that reproduces a range on another page. */
export function rangeQuery(r: RangeValue): string {
  const q = new URLSearchParams({ range: r.preset });
  if (r.preset === "custom") {
    q.set("from", r.from);
    q.set("to", r.to);
  }
  return q.toString();
}

export const withRange = (href: string, r: RangeValue) => `${href}?${rangeQuery(r)}`;

/** A day series wider than the server cap is refused — fall back to the server's default. */
export function effectiveGranularity(g: Granularity | undefined, r: DateRange): Granularity | undefined {
  return g === "day" && rangeDays(r) > MAX_DAILY_DAYS ? undefined : g;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (day: string, withYear: boolean) => {
  const [y, m, d] = day.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}${withYear ? ` ${y}` : ""}`;
};

/** "1 Oct – 31 Oct 2026", "31 Oct 2026". */
export function rangeLabel({ from, to }: DateRange): string {
  if (from === to) return short(to, true);
  return `${short(from, from.slice(0, 4) !== to.slice(0, 4))} – ${short(to, true)}`;
}

/** Chart axis label for an opaque bucket key ("2026-10-05" day/week, "2026-10" month). */
export function bucketTick(bucket: string, g: Granularity | undefined): string {
  const [y, m, d] = bucket.split("-");
  const month = MONTHS[Number(m) - 1] ?? m;
  if (!d) return `${month} ${String(y).slice(2)}`;
  return g === "week" ? `Wk ${Number(d)} ${month}` : `${Number(d)} ${month}`;
}
