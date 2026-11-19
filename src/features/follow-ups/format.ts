import { alpha, darken, lighten, type Theme } from "@mui/material/styles";

/**
 * Presentation helpers for follow-up statuses (docs/follow-up-status).
 *
 * The colour is the DOCTOR'S choice, so nothing here overrides it — the chip
 * derives a readable ink from whatever hue they picked instead. A doctor who
 * chooses #FFFF00 gets a yellow chip they can still read, not a silently
 * corrected one.
 */

/** The four colours a chip needs, derived from one doctor-chosen hue. */
export function chipColors(t: Theme, hex: string) {
  const dark = t.palette.mode === "dark";
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#2E86C1";
  return {
    solid: safe,
    soft: alpha(safe, dark ? 0.22 : 0.14),
    line: alpha(safe, dark ? 0.5 : 0.45),
    ink: dark ? lighten(safe, 0.45) : darken(safe, 0.35),
  };
}

/**
 * A "YYYY-MM-DD" as a LOCAL date.
 *
 * Never `new Date("2026-09-01")` — that parses as UTC and lands on 31 Aug west
 * of Greenwich, which would show the wrong follow-up day.
 */
export function localDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "1 Sep '26" — the date under a status chip. */
export function followUpDateLabel(value?: string | null): string | null {
  const d = localDate(value);
  if (!d) return null;
  return `${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
}

/** Whole days from today; negative once the date has passed. */
export function daysUntil(value?: string | null): number | null {
  const d = localDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** "in 5 wks" / "today" / "3 days overdue" — how the date reads on a roster. */
export function dueLabel(value?: string | null): string | null {
  const days = daysUntil(value);
  if (days == null) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) {
    const over = Math.abs(days);
    if (over < 30) return `${over} days overdue`;
    const m = Math.round(over / 30);
    return `${m} ${m === 1 ? "month" : "months"} overdue`;
  }
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} wks`;
  return `in ${Math.round(days / 30)} months`;
}

/** Overdue is the one state on this column worth interrupting for. */
export const isOverdue = (value?: string | null): boolean => {
  const days = daysUntil(value);
  return days != null && days < 0;
};

/**
 * Sort key for the follow-up column: soonest review first, undated tags after
 * them, untagged patients last. A roster sorted by "who is due next" is a
 * worklist; sorted alphabetically by label it is trivia.
 */
export function followUpSortValue(followUp?: { followUpOn: string | null } | null): number {
  if (!followUp) return Number.MAX_SAFE_INTEGER;
  const d = localDate(followUp.followUpOn);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER - 1;
}

/** The palette offered in the colour picker — validated for contrast as chip ink. */
export const FOLLOW_UP_PALETTE = [
  "#2E7D53",
  "#2E86C1",
  "#5B4CB0",
  "#B07714",
  "#C0392B",
  "#0E6E86",
  "#7B5E2A",
  "#96190D",
  "#356C3A",
  "#8E44AD",
  "#1F618D",
  "#556673",
];
