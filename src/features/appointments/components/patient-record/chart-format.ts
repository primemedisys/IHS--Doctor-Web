/**
 * Dates for the patient record.
 *
 * Everything parses "YYYY-MM-DD" as a LOCAL date (`T00:00:00`), never through
 * `new Date("2026-08-03")` — that is parsed as UTC and lands on the previous
 * day west of Greenwich, which would file a reading under the wrong block on a
 * page whose entire structure is "one block per day".
 */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A "YYYY-MM-DD" (or ISO datetime) as a local Date; null when unparseable. */
function localDate(value?: string | null): Date | null {
  if (!value) return null;
  const day = String(value).slice(0, 10);
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Midnight today, for day-distance arithmetic. */
function startOfToday(): Date {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return n;
}

/** "14 Jul '26" — the compact form used inside blocks and rows. */
export function fmtDate(value?: string | null): string {
  const d = localDate(value);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

/** "Tuesday, 14 July 2026" — the sticky context bar's headline. */
export function fmtLong(value?: string | null): string {
  const d = localDate(value);
  if (!d) return "This consultation";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "14 Jul" — the time spine's node heading. */
export function dayMonth(value: string): string {
  const d = localDate(value);
  return d ? `${d.getDate()} ${MON[d.getMonth()]}` : value;
}

/** "2026" — the node's quiet second line. */
export function yearOf(value: string): string {
  const d = localDate(value);
  return d ? String(d.getFullYear()) : "";
}

/** "Today" / "Yesterday" / "8 days ago" / "3 months ago" — how far back a node sits. */
export function relTime(value?: string | null): string {
  const d = localDate(value);
  if (!d) return "";
  const days = Math.round((startOfToday().getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  const y = Math.round(days / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}

/** Is this date today, in the doctor's own timezone? */
export function isToday(value?: string | null): boolean {
  const d = localDate(value);
  if (!d) return false;
  return d.getTime() === startOfToday().getTime();
}

/** Both shapes start "YYYY-MM-DD", so a prefix compare is enough. */
export const sameDay = (a?: string | null, b?: string | null) =>
  Boolean(a && b && a.slice(0, 10) === b.slice(0, 10));

/** Up to two initials for the banner avatar. */
export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
