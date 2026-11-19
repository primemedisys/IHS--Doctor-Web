import type { Period } from "@/types/dashboard";

/**
 * The period presets behind the Earnings page's toggle.
 *
 * Bounds are computed from the CLIENT's clock and sent as ISO instants; the
 * server bucket-aligns them to IST and does not second-guess them. Ranges are
 * half-open `[from, to)` end-to-end, matching the API.
 */
export type PeriodKey = "30d" | "3m" | "6m" | "1y";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  "30d": "30 days",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
};

export const PERIOD_KEYS: PeriodKey[] = ["30d", "3m", "6m", "1y"];

/**
 * `30d` uses day buckets (30 points — readable); everything longer uses months.
 * The server rejects a `day` series wider than 92 days with a 400, so a preset
 * must never pair `day` with a multi-month range.
 */
export function periodFor(key: PeriodKey): Period {
  const to = new Date();
  const from = new Date(to);

  switch (key) {
    case "30d":
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString(), to: to.toISOString(), granularity: "day" };
    case "3m":
      from.setMonth(from.getMonth() - 3);
      return { from: from.toISOString(), to: to.toISOString(), granularity: "month" };
    case "6m":
      from.setMonth(from.getMonth() - 6);
      return { from: from.toISOString(), to: to.toISOString(), granularity: "month" };
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      return { from: from.toISOString(), to: to.toISOString(), granularity: "month" };
  }
}

/**
 * Render an opaque IST bucket key as a chart label.
 *
 * `bucket` is a CALENDAR key ("2026-07", "2026-07-04"), not an instant. Passing
 * it through `new Date(...)` would reinterpret it as UTC midnight and, in IST,
 * can render the previous day. So we slice the string instead of parsing it.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function bucketLabel(bucket: string): string {
  const [y, m, d] = bucket.split("-");
  const month = MONTHS[Number(m) - 1] ?? m;
  return d ? `${Number(d)} ${month}` : `${month} ${String(y).slice(2)}`;
}
