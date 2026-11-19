import type { IconType } from "react-icons";
import {
  FiCheckCircle,
  FiCreditCard,
  FiGrid,
  FiMapPin,
  FiShield,
  FiUserX,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import type {
  Appointment,
  BookingMode,
  BookingPayment,
  BookingStatus,
  PaymentStatus,
} from "@/types/appointment";

/** "HH:mm" → "10:30 AM"; null-safe. */
export function timeLabel(hhmm: string | null): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** "YYYY-MM-DD" → "Mon, 12 Jul 2026". */
export function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ *
 * Date arithmetic for the board's range picker.
 *
 * Everything is done on LOCAL "YYYY-MM-DD" strings — never `toISOString()`,
 * which shifts the day backwards in IST and would make "today" resolve to
 * yesterday for any appointment before 05:30. Two such strings also compare
 * correctly with `<` / `>`, which is how the range filter works.
 * ------------------------------------------------------------------ */

/** A Date → local "YYYY-MM-DD". */
export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Today as a local "YYYY-MM-DD". */
export const todayYmd = (): string => ymd(new Date());

/** Shift a "YYYY-MM-DD" by n days (n may be negative). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** "Today" / "Tomorrow" / "Yesterday", else "Mon, 12 Jul". */
export function relativeDayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** The heading under the board title: one long date, or a "12 Jul – 26 Jul 2026" span. */
export function rangeLabel(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return "";
  if (from === to) {
    return f.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  const sameYear = f.getFullYear() === t.getFullYear();
  const left = f.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const right = t.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${left} – ${right}`;
}

/** Up to two initials for the row avatar. */
export function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ------------------------------------------------------------------ *
 * Slot clock — the board's "now" line and live pulse are derived from
 * these, not from any backend field. See `isLiveNow`.
 * ------------------------------------------------------------------ */

/** Default consult length when a booking somehow has no end time (backend default). */
const FALLBACK_SLOT_MINUTES = 15;

/** The appointment's start as a local Date; epoch 0 when the time is missing. */
export function slotStartMs(a: Appointment): number {
  const t = new Date(`${a.date}T${a.startTime ?? "00:00"}:00`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** The appointment's end as a local Date, falling back to start + 15 min. */
export function slotEndMs(a: Appointment): number {
  if (a.endTime) {
    const t = new Date(`${a.date}T${a.endTime}:00`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return slotStartMs(a) + FALLBACK_SLOT_MINUTES * 60_000;
}

/**
 * Whether this appointment's slot window contains right now.
 *
 * DERIVED FROM THE CLOCK, never from the backend — there is no "in progress"
 * booking status, so this claims only what it can prove: a confirmed booking
 * whose scheduled window we are currently inside. It drives the row's live
 * pulse; the status badge still shows the real stored status.
 */
export function isLiveNow(a: Appointment, now: number): boolean {
  if (a.status !== "confirmed" || !a.startTime) return false;
  return now >= slotStartMs(a) && now <= slotEndMs(a);
}

/* ------------------------------------------------------------------ *
 * Status registry
 * ------------------------------------------------------------------ */

/**
 * The palette family a status paints with. `neutral` has no palette slot — it
 * renders in slate, because a cancelled appointment is absence of work, not a
 * state that should compete for attention.
 */
export type StatusTone = "warning" | "info" | "success" | "error" | "neutral";

/**
 * Everything the UI needs to render one booking status.
 *
 * `label`/`color` are the original MUI-Chip pair (still used by
 * AppointmentDetailDialog); `icon`/`tone`/`hint` are what the board's chips,
 * badges and count cards read. Keeping both on one record is what stops the
 * dialog and the board from ever disagreeing about what a status is called.
 */
export const STATUS_META: Record<
  BookingStatus,
  {
    label: string;
    /** Compact label for the dense chip strip. */
    short: string;
    color: "primary" | "success" | "default" | "error" | "warning";
    icon: IconType;
    tone: StatusTone;
    hint: string;
  }
> = {
  pending_payment: {
    label: "Pending payment",
    short: "Pending",
    color: "warning",
    icon: FiCreditCard,
    tone: "warning",
    hint: "Slot is held but unpaid — it frees itself if payment doesn't land.",
  },
  confirmed: {
    label: "Confirmed",
    short: "Confirmed",
    color: "success",
    icon: FiShield,
    tone: "info",
    hint: "Paid or reserved to pay at the hospital. This is the day's work.",
  },
  completed: {
    label: "Completed",
    short: "Completed",
    color: "primary",
    icon: FiCheckCircle,
    tone: "success",
    hint: "Consultation done and closed out.",
  },
  no_show: {
    label: "No-show",
    short: "No-show",
    color: "error",
    icon: FiUserX,
    tone: "error",
    hint: "Patient didn't attend. Nothing was collected.",
  },
  cancelled: {
    label: "Cancelled",
    short: "Cancelled",
    color: "default",
    icon: FiXCircle,
    tone: "neutral",
    hint: "Called off — the slot went back into the pool.",
  },
};

/** Chip-strip order: the states you act on first, exceptions last. */
export const STATUS_ORDER: BookingStatus[] = [
  "confirmed",
  "pending_payment",
  "completed",
  "no_show",
  "cancelled",
];

/** Sort rank for the Status column — same intent as STATUS_ORDER. */
export const STATUS_RANK: Record<BookingStatus, number> = {
  confirmed: 0,
  pending_payment: 1,
  completed: 2,
  no_show: 3,
  cancelled: 4,
};

/**
 * The three count cards above the roster — the shape of the range at a glance.
 *
 * Deliberately NOT one card per status: cancelled and no-show are exceptions to
 * scan for, not workload to plan around, so they live only in the chip strip.
 */
export type FamilyKey = "awaiting" | "confirmed" | "completed";

export const FAMILIES: Record<
  FamilyKey,
  { label: string; members: BookingStatus[]; tone: StatusTone; foot: string }
> = {
  awaiting: {
    label: "Awaiting payment",
    members: ["pending_payment"],
    tone: "warning",
    foot: "Slot held · unpaid",
  },
  confirmed: {
    label: "Confirmed",
    members: ["confirmed"],
    tone: "info",
    foot: "Booked · not yet seen",
  },
  completed: {
    label: "Completed",
    members: ["completed"],
    tone: "success",
    foot: "Seen & closed",
  },
};

export const FAMILY_ORDER: FamilyKey[] = ["awaiting", "confirmed", "completed"];

/* ------------------------------------------------------------------ *
 * Date range presets — the board's first tab row
 * ------------------------------------------------------------------ */

export type PresetKey = "previous" | "today" | "future";

/**
 * The range presets and their colour code — where the range sits relative to
 * now, readable before you click anything: grey is behind you, green is
 * happening, blue is still ahead.
 *
 * Fixed hexes rather than palette slots on purpose. These three are a legend
 * with a meaning of their own (past / present / future), not the app's
 * primary/success/info roles, and they must keep saying the same thing if the
 * brand palette is retuned.
 */
export const PRESET_META: Record<PresetKey, { label: string; hue: string; hint: string }> = {
  previous: { label: "Previous", hue: "#8A929E", hint: "Already behind you — the last two weeks." },
  today: { label: "Today", hue: "#198754", hint: "Active right now — today's list." },
  future: { label: "Future", hue: "#102B5C", hint: "Planned for later — the next 30 days." },
};

export const PRESET_ORDER: PresetKey[] = ["previous", "today", "future"];

/* ------------------------------------------------------------------ *
 * Consultation mode — the board's second tab row and its Location column
 * ------------------------------------------------------------------ */

/** The tab strip above the roster: everything, or one consultation mode. */
export type ModeKey = "all" | BookingMode;

/**
 * Everything the UI needs to render one mode tab.
 *
 * `accent` is a palette key rather than a colour so the tab, the roster's mode
 * icon and the Location cell all resolve the SAME hue — a video tab tinted
 * differently from its own rows would read as two unrelated controls.
 */
export const MODE_META: Record<
  ModeKey,
  { label: string; short: string; icon: IconType; accent: "neutral" | "primary" | "secondary"; hint: string }
> = {
  all: {
    label: "All bookings",
    short: "All",
    icon: FiGrid,
    accent: "neutral",
    hint: "Video consults and hospital visits together.",
  },
  video: {
    label: "Video consult",
    short: "Video",
    icon: FiVideo,
    accent: "secondary",
    hint: "Online consultations — nowhere to travel to.",
  },
  // The key stays `clinic` — it is the backend's booking mode. Only the words
  // the doctor reads say "hospital".
  clinic: {
    label: "Hospital visit",
    short: "Hospital",
    icon: FiMapPin,
    accent: "primary",
    hint: "In-person visits, grouped by the hospital they were booked at.",
  },
};

export const MODE_ORDER: ModeKey[] = ["all", "video", "clinic"];

/**
 * The Location cell's two lines: which hospital the appointment was taken at,
 * and the city under it.
 *
 * A video consult has no place, so it says so rather than going blank — a blank
 * cell would be indistinguishable from an in-person booking missing its hospital.
 */
export function locationLines(a: Appointment): { primary: string; secondary: string | null; muted: boolean } {
  if (a.mode === "video") return { primary: "Online", secondary: null, muted: true };
  if (!a.clinic?.name) return { primary: "Hospital not set", secondary: null, muted: true };
  return { primary: a.clinic.name, secondary: a.clinic.city ?? null, muted: false };
}

/**
 * Location ordering: hospitals A→Z (city breaking ties between two branches of
 * the same name), then bookings with no hospital, then video consults last —
 * an online consult has no address, so it can't sit inside the alphabet.
 */
export function compareLocation(a: Appointment, b: Appointment): number {
  const rank = (x: Appointment) => (x.mode === "video" ? 2 : x.clinic?.name ? 0 : 1);
  return (
    rank(a) - rank(b) ||
    (a.clinic?.name ?? "").localeCompare(b.clinic?.name ?? "") ||
    (a.clinic?.city ?? "").localeCompare(b.clinic?.city ?? "")
  );
}

/**
 * Whether a booking is paid by scanning the doctor's own UPI QR (an OFFLINE
 * payment the doctor confirms by hand), as opposed to cash at the counter.
 */
export function isUpiQrPayment(
  paymentMode: "online" | "offline",
  payment: BookingPayment | null | undefined,
): boolean {
  return paymentMode === "offline" && payment?.offlineMethod === "upi_qr";
}

/**
 * Human label for a booking's payment state. Mode-aware: a doctor-recorded
 * at-the-counter cash payment lands as `offline` + `success`, which must read
 * "Paid at hospital" — NOT the online "Paid online". `status` is undefined
 * before a payment row exists.
 */
export function paymentLabel(
  paymentMode: "online" | "offline",
  status: PaymentStatus | null | undefined,
  payment?: BookingPayment | null,
): string | undefined {
  // UPI QR: the patient paid the doctor's own QR. Nothing verifies it — the
  // label only relays what the patient reported until the doctor marks it paid.
  if (isUpiQrPayment(paymentMode, payment)) {
    if (status === "pending_at_clinic") {
      if (!payment?.reportedAt) return "UPI QR — awaiting payment";
      return `UPI QR — patient reported paid${payment.payerReference ? ` (ref ${payment.payerReference})` : ""}`;
    }
    if (status === "success") return "Paid via UPI QR";
  }
  switch (status) {
    case "success":
      return paymentMode === "offline" ? "Paid at hospital" : "Paid online";
    case "pending_at_clinic":
      return "Pay at hospital";
    case "initiated":
      return paymentMode === "online" ? "Online — pending" : "Pending";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default:
      return undefined;
  }
}
