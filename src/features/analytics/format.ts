/** Display helpers for analytics figures. `null` always renders as "—", never 0. */

const INR0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const INR2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const COMPACT = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** ₹4,500 — paise shown only when there are any (₹1,234.50). */
export function inr(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Number.isInteger(v) ? INR0.format(v) : INR2.format(v);
}

/** ₹12.5K — chart axes. */
export const inrCompact = (v: number) => `₹${COMPACT.format(v)}`;

export function num(v: number | null | undefined): string {
  return v == null || Number.isNaN(v) ? "—" : NUM.format(v);
}

export function pctText(v: number | null | undefined): string {
  return v == null ? "—" : `${NUM.format(v)}%`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${NUM.format(n)} ${n === 1 ? one : many}`;

/** Same formula as the server's `growth()`: change vs previous in %, null with nothing to compare. */
export function growthOf(cur: number, prev: number): number | null {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;
}

/** Same as the server's `pct()`. */
export function pctOf(n: number, d: number): number | null {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}
