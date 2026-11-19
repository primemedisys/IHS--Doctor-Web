import type { CardTone } from "@/theme/palette";
import type { VisitStatus, VitalKey, VitalStatus } from "@/types/emr";

/**
 * Today as the server means it: the Asia/Kolkata calendar date ("YYYY-MM-DD").
 * Bookings are stored as IST wall-clock dates, so "today" must not follow the
 * browser's zone (a doctor travelling abroad still works the IST day).
 */
export function istToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Add whole days to a "YYYY-MM-DD" (pure calendar arithmetic, no zone drift). */
export function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + by));
  return t.toISOString().slice(0, 10);
}

/** Add an interval to a day — for the follow-up "next visit in N days/weeks/months". */
export function addInterval(day: string, value: number, unit: "day" | "week" | "month"): string {
  if (unit === "day") return shiftDay(day, value);
  if (unit === "week") return shiftDay(day, value * 7);
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + value, 1));
  // Clamp to the target month's last day (31 Jan + 1 month → 28/29 Feb).
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}

/** "30 Oct 2026" from "YYYY-MM-DD" without a timezone shift. */
export function dayLabel(day: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!day) return "—";
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

/** "30 Oct 2026, 10:15 am" for an ISO instant, shown in IST. */
export function instantLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** "10:30" → "10:30 am". */
export function timeLabel(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function ageGender(age: number | null, gender: string | null): string {
  const g = gender ? gender.charAt(0).toUpperCase() : null;
  if (age == null && !g) return "Age/gender not recorded";
  return [age != null ? `${age} y` : null, g].filter(Boolean).join(" / ");
}

export const VISIT_STATUS: Record<VisitStatus, { label: string; color: "default" | "warning" | "info" | "success" | "error" }> = {
  pending_payment: { label: "Awaiting payment", color: "warning" },
  confirmed: { label: "Pending consultation", color: "info" },
  completed: { label: "Completed", color: "success" },
  no_show: { label: "No-show", color: "default" },
  cancelled: { label: "Cancelled", color: "error" },
};

/** Severity → theme colour key. "Never colour alone": callers also print the label. */
export const VITAL_TONE: Record<VitalStatus, "success" | "info" | "warning" | "error" | null> = {
  normal: "success",
  low: "info",
  borderline: "warning",
  high: "error",
  critical: "error",
  unknown: null,
};

/** Pastel card tone for each vital, so charts and summaries stay recognisable per measurement. */
export const VITAL_CARD_TONE: Partial<Record<VitalKey, CardTone>> = {
  bpSystolic: "red",
  bpDiastolic: "red",
  heartRateBpm: "green",
  pulseRateBpm: "orange",
  respiratoryRate: "purple",
  spo2Percent: "teal",
  temperatureF: "orange",
  heightCm: "teal",
  weightKg: "purple",
  bmi: "orange",
  waistCm: "green",
  hipCm: "green",
  waistHipRatio: "green",
  headCircumferenceCm: "teal",
};

export const titleCase = (s: string | null | undefined) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
