"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, darken, lighten, type Theme } from "@mui/material/styles";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiCornerDownLeft,
  FiCornerUpRight,
  FiSearch,
  FiTag,
} from "react-icons/fi";
import { EmptyState, ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { useClinics } from "@/features/doctor";
import { chipColors, FollowUpChip, followUpSortValue, useFollowUpStatuses } from "@/features/follow-ups";
import { easeOut } from "@/theme/motion";
import { formatCurrency } from "@/utils/format";
import { useAppointments } from "../hooks";
import { AppointmentDetailDialog } from "./AppointmentDetailDialog";
import {
  addDays,
  compareLocation,
  FAMILIES,
  initials,
  isLiveNow,
  locationLines,
  MODE_META,
  MODE_ORDER,
  paymentLabel,
  PRESET_META,
  PRESET_ORDER,
  relativeDayLabel,
  slotStartMs,
  STATUS_META,
  STATUS_ORDER,
  STATUS_RANK,
  timeLabel,
  todayYmd,
  type FamilyKey,
  type ModeKey,
  type StatusTone,
} from "./appointment-format";
import type { Appointment, BookingReferrals, BookingStatus, ReferralPeer } from "@/types/appointment";
import type { OwnClinic } from "@/types/clinic";

/**
 * A board row: a real booking, or a follow-up that is DUE and not yet booked.
 *
 * The two share a shape so the whole pipeline — range, search, sort, roster —
 * stays one code path. Where they differ is stated at each place that cares:
 * an expected row has no status, no mode and no money, so it is excluded from
 * the status counts, the status filters and the Video/Hospital tabs.
 */
type BoardAppointment = Appointment & {
  /** True when this row is a follow-up date rather than a booking. */
  expected?: boolean;
  /** The consultation the follow-up was set at — what the row opens. */
  sourceId?: string;
};

/** How far the Previous / Future presets reach from today. */
const PREVIOUS_DAYS = 14;
const FUTURE_DAYS = 30;

/* ------------------------------------------------------------------ *
 * Wall clock, as an external store.
 *
 * Read through useSyncExternalStore rather than useState + useEffect for two
 * reasons. The server snapshot is explicitly 0 ("not mounted yet"), so the
 * board never renders a `today` on the server that the browser disagrees with —
 * the two can sit in different time zones, and a mismatch would desync the date
 * inputs across hydration. And it keeps the tick out of an effect body, which
 * is where cascading re-renders come from.
 *
 * 30s is fine-grained enough for a now-line on a 15-minute slot grid.
 * ------------------------------------------------------------------ */
const CLOCK_TICK_MS = 30_000;

let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(onChange: () => void) {
  if (clockListeners.size === 0) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      for (const listener of clockListeners) listener();
    }, CLOCK_TICK_MS);
  }
  clockListeners.add(onChange);
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/** Table columns, so the now-line's colSpan can never drift from the header. */
const COL_COUNT = 8;

type Preset = "previous" | "today" | "future" | "custom";
type SortKey = "patient" | "when" | "mode" | "location" | "referral" | "followUp" | "amount" | "status";
type Sort = { key: SortKey; dir: "asc" | "desc" };
/**
 * A count card, a status chip, or a follow-up. Never more than one at once.
 *
 * `followUp` is NOT a status family: the other two partition by
 * `booking.status`, while a follow-up belongs to the PATIENT and cuts across
 * all of them. `"any"` means "tagged with anything", `"none"` means untagged,
 * and anything else is a status id.
 */
type Filter =
  | { kind: "family"; value: FamilyKey }
  | { kind: "status"; value: BookingStatus }
  | { kind: "followUp"; value: string };

/* ------------------------------------------------------------------ *
 * The segmented control, shared by the board's two scope rows.
 *
 * Split in two on purpose: the GROUP owns the shell and every structural rule
 * that has to beat MUI's own `.MuiToggleButtonGroup-grouped` styles, and each
 * BUTTON owns only its colours. Nothing is declared in both places, so there is
 * no specificity race between the two sx blocks over `color` or `background`.
 * ------------------------------------------------------------------ */

const segmentedGroupSx = (t: Theme) => ({
  bgcolor: t.palette.background.paper,
  border: 1,
  borderColor: "divider",
  borderRadius: `${t.tokens.radius.md}px`,
  // Three segments with a label and a count each do not fit a 360px screen in
  // one line; on a phone they wrap and share the width instead of overflowing.
  flexWrap: "wrap" as const,
  [t.breakpoints.down("sm")]: { width: "100%" },
  p: 0.5,
  gap: 0.25,
  "& .MuiToggleButton-root": {
    // Both rows fill the same shell, so the segments have to share the row —
    // otherwise the shorter row (All / Video / Hospital) would sit inside a
    // box wider than its buttons.
    flexGrow: 1,
    justifyContent: "center",
    border: 0,
    borderRadius: `${t.tokens.radius.sm}px !important`,
    px: 1.5,
    py: 0.75,
    gap: 0.75,
    fontSize: 13,
    fontWeight: 600,
    textTransform: "none",
    whiteSpace: "nowrap",
  },
  // Scoped away from `.Mui-selected` so the selected button's own hover, set on
  // the button below, has no rule here to fight with.
  "& .MuiToggleButton-root:not(.Mui-selected):hover": { bgcolor: t.palette.action.hover },
});

/**
 * One segment's own colour.
 *
 * Selecting TINTS the pill rather than flooding it: label text on a solid
 * #2ECC71 or #3498DB fails contrast at this size, while the tint + ring + a
 * darkened ink of the same hue reads as unmistakably "on" and stays legible in
 * both themes.
 */
const segmentSx = (resolveHue: (t: Theme) => string) => (t: Theme) => {
  const hue = resolveHue(t);
  const dark = t.palette.mode === "dark";
  return {
    color: t.palette.text.secondary,
    "&.Mui-selected": {
      bgcolor: alpha(hue, dark ? 0.22 : 0.14),
      color: dark ? lighten(hue, 0.45) : darken(hue, 0.35),
      boxShadow: `inset 0 0 0 1px ${alpha(hue, 0.5)}`,
      "&:hover": { bgcolor: alpha(hue, dark ? 0.3 : 0.2) },
    },
  };
};

/** The segment's colour code — shown whether or not the segment is selected. */
function SegmentDot({ hue }: { hue: string }) {
  return (
    <Box component="span" sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: "50%", bgcolor: hue }} />
  );
}

/** How many rows the segment would show. */
function SegmentCount({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ fontSize: 11.5, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>
      {children}
    </Box>
  );
}

/**
 * Resolve a tone to the four colours every badge/chip/card/tab needs.
 *
 * Takes the mode accents (`primary`/`secondary`) as well as the status tones,
 * so a mode tab and the roster's mode icon can never drift apart.
 *
 * `neutral` has no palette slot on purpose — cancelled work should read as
 * absence, not as another competing hue.
 */
function toneColors(t: Theme, tone: StatusTone | "primary" | "secondary") {
  const dark = t.palette.mode === "dark";
  if (tone === "neutral") {
    return {
      solid: t.palette.text.disabled,
      ink: t.palette.text.secondary,
      soft: alpha(t.palette.text.disabled, dark ? 0.18 : 0.12),
      line: alpha(t.palette.text.disabled, dark ? 0.36 : 0.28),
    };
  }
  const p = t.palette[tone];
  return {
    solid: p.main,
    ink: dark ? p.light : p.dark,
    soft: alpha(p.main, dark ? 0.18 : 0.12),
    line: alpha(p.main, dark ? 0.42 : 0.3),
  };
}

/**
 * The doctor's appointment board — a date range, three count cards, a status
 * filter strip and a sortable roster, each row opening the detail dialog with
 * the patient snapshot. Reads the real `/doctor/bookings`.
 *
 * The list is fetched ONCE, unfiltered, and every filter below is applied on
 * the client. That is deliberate: the counts on the cards and chips have to
 * describe the same rows the table is showing, which is impossible if the
 * server has already filtered some of them away. It also makes switching a
 * preset or a chip instant instead of a round trip.
 */
export function AppointmentsBoard({ initialAppointmentId }: { initialAppointmentId?: string }) {
  const router = useRouter();

  const now = useSyncExternalStore(subscribeClock, () => clockNow, () => 0);
  // "" until the clock resolves on the client. Equal strings keep the memos
  // below from recomputing on every tick.
  const today = useMemo(() => (now > 0 ? todayYmd() : ""), [now]);

  const [preset, setPreset] = useState<Preset>("today");
  /** Set only when the doctor edits a date directly; otherwise the range is derived. */
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  /** The open tab: both consultation modes, or one of them. */
  const [mode, setMode] = useState<ModeKey>("all");
  /**
   * Which hospital the Hospital tab is narrowed to; NULL = all of them.
   *
   * Only meaningful while `mode === "clinic"`, and cleared whenever the tab
   * changes — a hospital filter left running under the Video tab would silently
   * hide rows with no visible control explaining why.
   */
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "when", dir: "asc" });
  const [selected, setSelected] = useState<string | null>(initialAppointmentId ?? null);

  /**
   * The range is DERIVED from the preset rather than copied into state when a
   * tab is clicked — a copy can drift from the tab that is showing as active,
   * and would need seeding from an effect once the clock lands.
   */
  const { from, to } = useMemo(() => {
    if (customRange) return customRange;
    if (!today) return { from: "", to: "" };
    if (preset === "previous") return { from: addDays(today, -PREVIOUS_DAYS), to: addDays(today, -1) };
    if (preset === "future") return { from: addDays(today, 1), to: addDays(today, FUTURE_DAYS) };
    return { from: today, to: today };
  }, [preset, today, customRange]);

  const { data, isLoading, isError, refetch } = useAppointments();
  const booked = useMemo(() => data ?? [], [data]);

  /**
   * A follow-up date is a promise to see the patient again, so the board treats
   * it as something scheduled: tag a patient `OPD FU · 4 Sept` today and they
   * appear in Future on 4 Sept, months before any booking exists.
   *
   * These are DERIVED rows, not bookings — no time, no fee, no payment, nothing
   * to open. They carry the source consultation's id so the row still opens the
   * visit the follow-up was set at.
   *
   * De-duplicated per patient+date: a patient tagged for the same day at two
   * different consultations is expected once, not twice.
   */
  const expected = useMemo<BoardAppointment[]>(() => {
    if (!today) return [];
    const seen = new Set<string>();
    const out: BoardAppointment[] = [];
    for (const a of booked) {
      const on = a.followUp?.followUpOn;
      if (!on || on <= today) continue;
      const key = `${a.patient.id ?? a.patient.name}|${on}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...a, id: `due-${a.id}`, sourceId: a.id, expected: true, date: on, startTime: null, endTime: null });
    }
    return out;
  }, [booked, today]);

  const all = useMemo<BoardAppointment[]>(() => [...booked, ...expected], [booked, expected]);
  // The doctor's saved hospitals, for the Hospital tab's dropdown.
  const { data: clinics = [] } = useClinics();
  // The doctor's own follow-up list, for the filter dropdown's labels/colours.
  const { data: followUpStatuses = [] } = useFollowUpStatuses();

  /**
   * The badge on each range preset counts exactly what CLICKING it would show —
   * i.e. it honours the same window the preset opens, not "everything before
   * today", and it honours the open mode tab, which survives a preset change.
   * A preset reading 12 that then lists 8 is worse than no badge at all.
   */
  const presetCounts = useMemo(() => {
    const counts = { previous: 0, today: 0, future: 0 };
    if (!today) return counts;
    const prevFrom = addDays(today, -PREVIOUS_DAYS);
    const nextTo = addDays(today, FUTURE_DAYS);
    for (const a of all) {
      // An expected follow-up has no consultation mode yet — it belongs to
      // "All", never to Video or Hospital.
      if (mode !== "all" && (a.expected || a.mode !== mode)) continue;
      if (a.date === today) counts.today += 1;
      else if (a.date < today) {
        if (a.date >= prevFrom) counts.previous += 1;
      } else if (a.date <= nextTo) counts.future += 1;
    }
    return counts;
  }, [all, today, mode]);

  /**
   * Rows inside the date range and matching the search — but BEFORE the mode
   * tab and the status filter, so the tabs, cards and chips keep showing what
   * else is in this range while one of them is active.
   */
  const inRange = useMemo(() => {
    if (!from || !to) return [];
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      if (a.date < from || a.date > to) return false;
      if (!q) return true;
      return (
        (a.patient.name ?? "").toLowerCase().includes(q) ||
        (a.clinic?.name ?? "").toLowerCase().includes(q) ||
        (a.clinic?.city ?? "").toLowerCase().includes(q) ||
        (a.bookedBy?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [all, from, to, query]);

  /**
   * What each tab would show — counted BEFORE the tab filter, for the same
   * reason the range presets count their own window: a badge that changed
   * depending on which tab is open would be describing nothing.
   */
  const modeCounts = useMemo(() => {
    let video = 0;
    let clinic = 0;
    for (const a of inRange) {
      // Expected follow-ups count under All only. They have no consultation
      // mode yet, and counting them under Video/Hospital made those tabs
      // disagree with the range tab above them — Future reading 0 while
      // Hospital read 1.
      if (a.expected) continue;
      if (a.mode === "video") video += 1;
      else clinic += 1;
    }
    return { all: inRange.length, video, clinic };
  }, [inRange]);

  /**
   * The range narrowed to the open tab. Everything below — the count cards, the
   * status chips and the roster — describes THIS, so switching to Video re-reads
   * the whole board as a video board rather than just hiding rows from it.
   */
  const inScope = useMemo(() => {
    if (mode === "all") return inRange;
    const byMode = inRange.filter((a) => !a.expected && a.mode === mode);
    // One hospital picked from the tab's dropdown narrows it further.
    return clinicId ? byMode.filter((a) => a.clinic?.id === clinicId) : byMode;
  }, [inRange, mode, clinicId]);

  /**
   * How many hospital visits each clinic holds in range — the numbers beside
   * the names in the Hospital dropdown. Counted BEFORE the clinic filter, like
   * every other count on this board, so picking one doesn't rewrite the rest.
   */
  /**
   * How many PEOPLE are in view, not how many appointments.
   *
   * A patient who booked three times this week is one patient — the number
   * beside the heading answers "how many people am I seeing", which is a
   * different question from the row count and usually a smaller answer.
   *
   * Keyed on the patient id, falling back to the name for a row whose patient
   * never completed a profile.
   */
  const patientCount = useMemo(() => {
    const seen = new Set<string>();
    for (const a of inScope) seen.add(a.patient.id ?? a.patient.name ?? a.id);
    return seen.size;
  }, [inScope]);

  const clinicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of inRange) {
      if (a.expected || a.mode !== "clinic" || !a.clinic?.id) continue;
      counts.set(a.clinic.id, (counts.get(a.clinic.id) ?? 0) + 1);
    }
    return counts;
  }, [inRange]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<BookingStatus, number>;
    // Expected follow-ups have no booking status — counting them under the
    // source visit's status would report a completed consult twice.
    for (const a of inScope) if (!a.expected) counts[a.status] += 1;
    return counts;
  }, [inScope]);

  /**
   * How many rows carry a follow-up tag, and how many carry each status.
   *
   * Counts BOOKINGS, like the three cards beside it — one patient with three
   * appointments contributes three, because that is what clicking the card
   * lists.
   */
  const followUpCounts = useMemo(() => {
    const byStatus = new Map<string, number>();
    let tagged = 0;
    for (const a of inScope) {
      const id = a.followUp?.status?.id;
      if (!id) continue;
      tagged += 1;
      byStatus.set(id, (byStatus.get(id) ?? 0) + 1);
    }
    return { tagged, untagged: inScope.length - tagged, byStatus };
  }, [inScope]);


  const visible = useMemo(() => {
    const rows = filter
      ? inScope.filter((a) => {
          // Same reason they aren't counted: an expected follow-up has no
          // status of its own to match on.
          if (filter.kind === "status") return !a.expected && a.status === filter.value;
          if (filter.kind === "family") return !a.expected && FAMILIES[filter.value].members.includes(a.status);
          // followUp: "any" = tagged with anything, "none" = untagged, else one status.
          const id = a.followUp?.status?.id ?? null;
          if (filter.value === "any") return id !== null;
          if (filter.value === "none") return id === null;
          return id === filter.value;
        })
      : inScope;

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let v = 0;
      switch (sort.key) {
        case "patient":
          v = (a.patient.name ?? "").localeCompare(b.patient.name ?? "");
          break;
        case "mode":
          v = a.mode.localeCompare(b.mode);
          break;
        case "location":
          v = compareLocation(a, b);
          break;
        case "referral":
          // Referred-in first, then referred-out, then everything else — the
          // rows that involve another doctor group together at one end.
          v = referralSortValue(a) - referralSortValue(b);
          break;
        case "followUp":
          // Soonest review first, undated tags after them, untagged last — a
          // roster sorted by "who is due next" is a worklist.
          v = followUpSortValue(a.followUp) - followUpSortValue(b.followUp);
          break;
        case "amount":
          v = a.amount - b.amount;
          break;
        case "status":
          v = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          break;
        default:
          v = slotStartMs(a) - slotStartMs(b);
      }
      // Every other column falls back to slot time, so a column with many ties
      // (status, mode) still reads as a schedule inside each group.
      return v !== 0 ? v * dir : slotStartMs(a) - slotStartMs(b);
    });
  }, [inScope, filter, sort]);

  /**
   * The now-line only means something when the rows are in clock order and the
   * range actually contains today — otherwise it would be marking a boundary in
   * a list that isn't a timeline.
   */
  const showNow = now > 0 && sort.key === "when" && sort.dir === "asc" && from <= today && today <= to;
  const nowIndex = useMemo(() => {
    if (!showNow) return -1;
    const i = visible.findIndex((a) => slotStartMs(a) >= now);
    return i === -1 ? visible.length : i;
  }, [showNow, visible, now]);

  /**
   * The roster flattened to ONE keyed list with the now-line spliced in.
   *
   * AnimatePresence can only track direct, keyed children — wrapping each pair
   * in a Fragment would hide the rows from it and kill the enter/exit
   * transitions, so the marker becomes a row in the same list instead.
   */
  const rows = useMemo(() => {
    const out: ({ kind: "now" } | { kind: "appt"; appt: BoardAppointment })[] = [];
    visible.forEach((appt, i) => {
      if (showNow && i === nowIndex) out.push({ kind: "now" });
      out.push({ kind: "appt", appt });
    });
    if (showNow && nowIndex === visible.length) out.push({ kind: "now" });
    return out;
  }, [visible, showNow, nowIndex]);

  const applyPreset = (next: Preset) => {
    setPreset(next);
    setCustomRange(null);
    setFilter(null);
    // History is scanned backwards — newest first. Today and the days ahead are
    // schedules you read top to bottom.
    setSort({ key: "when", dir: next === "previous" ? "desc" : "asc" });
  };

  const editRange = (which: "from" | "to", value: string) => {
    setPreset("custom");
    setCustomRange({ from: which === "from" ? value : from, to: which === "to" ? value : to });
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const toggleFilter = (next: Filter) =>
    setFilter((f) => (f && f.kind === next.kind && f.value === next.value ? null : next));

  const closeModal = () => {
    setSelected(null);
    // Drop ?appointment= so a refresh/back doesn't reopen the modal.
    if (initialAppointmentId) router.replace(ROUTES.dashboard.appointments);
  };

  const hasFilters = filter !== null || !!query.trim() || preset !== "today" || mode !== "all";
  const clearAll = () => {
    setQuery("");
    setMode("all");
    applyPreset("today");
  };
  const filterLabel = !filter
    ? null
    : filter.kind === "family"
      ? FAMILIES[filter.value].label
      : filter.kind === "status"
        ? STATUS_META[filter.value].label
        : filter.value === "any"
          ? "Patient type"
          : filter.value === "none"
            ? "No patient type"
            : (followUpStatuses.find((s) => s.id === filter.value)?.label ?? "Patient type");

  /** What the headline counts — it has to name the open tab, not "appointments". */
  const scopeNoun = mode === "all" ? "appointment" : mode === "video" ? "video consult" : "hospital visit";

  // Held until the clock store resolves on the client (its server snapshot is 0).
  if (!today) return <Loading label="Loading appointments…" />;

  return (
    <MotionConfig reducedMotion="user">
      {/* Pulled up toward the app bar. The dashboard shell pads its content box
          on all four sides (`p: { xs: 2, md: 4 }`); this claws back HALF of the
          top pad for this page only.
          Deliberately not the full amount: the app bar renders a little taller
          than the toolbar spacer that reserves room for it, so cancelling all
          32px slid the headings under the bar and clipped their tops. */}
      <Stack spacing={1.25} sx={{ mt: { xs: -1, md: -2 } }}>
        <Stack
          component={motion.div}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          // flex-START, not flex-end: the control column on the right is taller
          // than the two headings, and bottom-aligning pushed the headings down
          // the page, leaving a band of empty grey under the app bar.
          sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between" }}
        >
          {/* Tight leading: two headings one under the other, read as one
              block, not as two paragraphs. */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", minWidth: 0 }}>
            <Box>
              <Typography variant="h4" sx={{ lineHeight: 1.15 }}>
                Appointment board
              </Typography>
              <Typography variant="h4" sx={{ lineHeight: 1.15 }}>
                Patient list
              </Typography>
            </Box>

            {/* PEOPLE, not rows — see `patientCount`. Sits beside the headings
                because it describes the whole board, not any one control. */}
            <Stack
              sx={(t) => ({
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 0.75,
                borderRadius: `${t.tokens.radius.md}px`,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                flexShrink: 0,
              })}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "text.disabled", lineHeight: 1.2 }}
              >
                {patientCount === 1 ? "Patient" : "Patients"}
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>
                {patientCount}
              </Typography>
            </Stack>
          </Stack>

          {/*
            The board's two scopes, stacked: WHEN on top, WHAT KIND directly
            under it. Same control, same size, same behaviour — only the accent
            each segment carries differs, so the pair reads as one two-line
            switch rather than two gadgets.

            `stretch` (not flex-end) is what makes the two rows exactly as wide
            as each other: the column takes the wider row's width and the other
            grows to match it.
          */}
          <Stack spacing={1} sx={{ alignSelf: { xs: "stretch", md: "auto" }, alignItems: "stretch" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={preset}
              onChange={(_e, value: Preset | null) => value && applyPreset(value)}
              aria-label="Time range"
              sx={segmentedGroupSx}
            >
              {PRESET_ORDER.map((key) => {
                const meta = PRESET_META[key];
                return (
                  <ToggleButton key={key} value={key} title={meta.hint} sx={segmentSx(() => meta.hue)}>
                    <SegmentDot hue={meta.hue} />
                    {meta.label}
                    <SegmentCount>{presetCounts[key]}</SegmentCount>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>

            {/* The follow-up filter heads this row rather than sitting under
                the status chips: it narrows the SAME roster the segments
                narrow, so the three controls that change what is listed now sit
                together instead of one being a full-width field further down.
                Kept compact — it is a refinement of the view, not one of its
                two primary scopes. */}
            {/* Wraps on a phone: the select plus the three mode segments are
                wider than a 360px screen, and a control strip that scrolls
                sideways is worse than one that stacks. */}
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ alignItems: "center", justifyContent: { xs: "stretch", sm: "flex-end" }, flexWrap: "wrap" }}
            >
              <TextField
                select
                size="small"
                aria-label="Filter by patient type"
                value={filter?.kind === "followUp" ? filter.value : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilter(v ? { kind: "followUp", value: v } : null);
                }}
                /*
                  A placeholder, not a floating label. MUI renders NOTHING for an
                  empty value unless `displayEmpty` is set, which is why this sat
                  blank with only a label hovering above it — the control looked
                  broken rather than unset.
                  `renderValue` then does the other half: "Patient type" while
                  nothing is chosen, and the chosen category (with its own
                  colour) once one is.
                */
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: (value) => {
                      const v = value as string;
                      if (!v) {
                        return (
                          <Box component="span" sx={{ color: "text.disabled", fontWeight: 500 }}>
                            Patient type
                          </Box>
                        );
                      }
                      if (v === "any") return "All patient types";
                      if (v === "none") return "Untagged";
                      const picked = followUpStatuses.find((s) => s.id === v);
                      if (!picked) return "Patient type";
                      return (
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                          <Box
                            sx={(t) => ({
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              flexShrink: 0,
                              bgcolor: chipColors(t, picked.colorHex).solid,
                            })}
                          />
                          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {picked.label}
                          </Box>
                        </Stack>
                      );
                    },
                  },
                }}
                sx={{
                  width: { xs: "100%", sm: 150 },
                  flexShrink: 0,
                  bgcolor: "background.paper",
                  // Matches the segments beside it, so the row reads as one
                  // control strip rather than a form field parked next to a
                  // toggle.
                  "& .MuiInputBase-root": { fontSize: 13, fontWeight: 600 },
                  "& .MuiSelect-select": { py: 0.9, display: "flex", alignItems: "center" },
                }}
              >
                {/* Clearing the filter, named for what it does rather than
                    for the empty value behind it. */}
                <MenuItem value="">
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    Any patient type
                  </Box>
                </MenuItem>
                <MenuItem value="any">All patient types · {followUpCounts.tagged}</MenuItem>
                <MenuItem value="none">Untagged · {followUpCounts.untagged}</MenuItem>
                {followUpStatuses
                  .filter((s) => s.isActive || followUpCounts.byStatus.has(s.id))
                  .map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Box
                          sx={(t) => ({
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            bgcolor: chipColors(t, s.colorHex).solid,
                          })}
                        />
                        {s.label}
                        <Box component="span" sx={{ color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
                          {followUpCounts.byStatus.get(s.id) ?? 0}
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
              </TextField>

              <ModeTabs
                value={mode}
                counts={modeCounts}
                onChange={(next) => {
                  setMode(next);
                  // Leaving the Hospital tab drops its hospital filter with it.
                  if (next !== "clinic") setClinicId(null);
                }}
                clinics={clinics}
                clinicId={clinicId}
                clinicCounts={clinicCounts}
                onClinicChange={setClinicId}
              />
            </Stack>
          </Stack>
        </Stack>

        {/* The four count cards used to sit here. The chip row below carries
            the same counts and the same filters in a fraction of the height, so
            the roster starts near the top of the page instead of below a band
            of tiles. */}

        <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="overline" color="text.disabled" sx={{ mr: 0.5 }}>
            Statuses
          </Typography>
          {/* Chips come and go as counts cross zero — `layout` slides the
              survivors along instead of letting the row jump. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {STATUS_ORDER.filter((s) => statusCounts[s] > 0).map((status) => (
              <motion.div
                key={status}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.22, ease: easeOut }}
                style={{ display: "flex" }}
              >
                <StatusChip
                  status={status}
                  count={statusCounts[status]}
                  active={filter?.kind === "status" && filter.value === status}
                  onClick={() => toggleFilter({ kind: "status", value: status })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {inScope.length === 0 && (
            <Typography variant="caption" color="text.disabled">
              {mode === "all" ? "Nothing scheduled in this range." : `No ${scopeNoun}s in this range.`}
            </Typography>
          )}

          {/*
            ONE chip for every tagged row, not one per category. Follow-ups cut
            ACROSS the statuses beside them — a patient tagged `SX WAITING` may
            be confirmed or completed — so a row of category pills would read as
            more alternatives to the three on its left. Narrowing to a single
            category is the dropdown's job, above.
          */}
          {followUpCounts.tagged > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: easeOut }}
              style={{ display: "flex" }}
            >
              <FollowUpFilterChip
                label="Patient type"
                count={followUpCounts.tagged}
                active={filter?.kind === "followUp"}
                onClick={() => toggleFilter({ kind: "followUp", value: "any" })}
              />
            </motion.div>
          )}
        </Stack>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "center" } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                type="date"
                size="small"
                label="From"
                value={from}
                onChange={(e) => editRange("from", e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to } }}
                sx={{ width: 165 }}
              />
              <Box sx={{ color: "text.disabled", pt: 0.25 }}>→</Box>
              <TextField
                type="date"
                size="small"
                label="To"
                value={to}
                onChange={(e) => editRange("to", e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from } }}
                sx={{ width: 165 }}
              />
            </Stack>

            <TextField
              size="small"
              placeholder="Search patient, hospital, city or booking agent…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiSearch />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <AnimatePresence initial={false}>
              {filter && (
                <motion.div
                  key="active-filter"
                  initial={{ opacity: 0, scale: 0.9, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  transition={{ duration: 0.22, ease: easeOut }}
                  style={{ flexShrink: 0, overflow: "hidden" }}
                >
                  <Chip
                    label={
                      <>
                        Showing{" "}
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {filterLabel}
                        </Box>
                      </>
                    }
                    onDelete={() => setFilter(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Stack>
        </Paper>

        {/* `mode="wait"` so the outgoing state finishes leaving before the next
            arrives — a spinner dissolving straight into a table reads as a flash. */}
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <Swap key="loading">
              <Loading label="Loading appointments…" />
            </Swap>
          ) : isError ? (
            <Swap key="error">
              <ErrorState onRetry={() => refetch()} />
            </Swap>
          ) : visible.length === 0 ? (
            <Swap key="empty">
              <Paper variant="outlined">
                <EmptyState
                  icon="FiCalendar"
                  title={hasFilters ? "No matching appointments" : "No appointments"}
                  description={
                    hasFilters
                      ? "Nothing here for this tab, range, status or search. Widen the dates or clear the filters."
                      : "Bookings from patients will appear here."
                  }
                  action={
                    hasFilters ? (
                      <Button variant="outlined" onClick={clearAll}>
                        Reset to today
                      </Button>
                    ) : undefined
                  }
                />
              </Paper>
            </Swap>
          ) : (
            <Swap key="table">
              <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                <TableContainer sx={{ maxHeight: "calc(100dvh - 260px)", overflowX: "auto" }}>
                  {/*
                    Eight columns have to fit one window without a horizontal
                    scroll, so the table is width-capped rather than
                    min-width-floored: the cells that can lose space (patient,
                    location, follow-up) are capped below and the rest keep
                    their natural size. `minWidth` only returns below 780px,
                    where a roster genuinely cannot fit and scrolling beats
                    illegibility.
                  */}
                  <Table stickyHeader size="small" sx={{ width: "100%", minWidth: 780, tableLayout: "auto" }}>
                    <TableHead>
                      <TableRow
                        sx={{
                          "& th": {
                            bgcolor: "background.default",
                            borderBottom: 1,
                            borderColor: "divider",
                            py: 1.25,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            color: "text.disabled",
                            whiteSpace: "nowrap",
                          },
                        }}
                      >
                        <SortCell sortKey="patient" sort={sort} onSort={toggleSort}>
                          Patient
                        </SortCell>
                        <SortCell sortKey="when" sort={sort} onSort={toggleSort}>
                          When
                        </SortCell>
                        <SortCell sortKey="mode" sort={sort} onSort={toggleSort}>
                          Consultation
                        </SortCell>
                        <SortCell sortKey="location" sort={sort} onSort={toggleSort}>
                          Location
                        </SortCell>
                        <SortCell sortKey="amount" sort={sort} onSort={toggleSort} align="right">
                          Fee
                        </SortCell>
                        <SortCell sortKey="status" sort={sort} onSort={toggleSort}>
                          Status
                        </SortCell>
                        <SortCell sortKey="referral" sort={sort} onSort={toggleSort}>
                          Referral
                        </SortCell>
                        <SortCell sortKey="followUp" sort={sort} onSort={toggleSort}>
                          Patient type
                        </SortCell>
                        <TableCell aria-hidden />
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      <AnimatePresence>
                        {rows.map((row, i) =>
                          row.kind === "now" ? (
                            <NowRow key="now-line" now={now} />
                          ) : (
                            <AppointmentRow
                              key={row.appt.id}
                              appt={row.appt}
                              today={today}
                              live={isLiveNow(row.appt, now)}
                              // Cap the cascade so a long history doesn't take a
                              // second to finish arriving.
                              delay={Math.min(i, 12) * 0.025}
                              // An expected follow-up has no booking of its
                              // own — it opens the consultation it was set at.
                              onOpen={() => setSelected(row.appt.sourceId ?? row.appt.id)}
                            />
                          ),
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Swap>
          )}
        </AnimatePresence>

        <AppointmentDetailDialog appointmentId={selected} open={!!selected} onClose={closeModal} />
      </Stack>
    </MotionConfig>
  );
}

/** Crossfade wrapper for the loading / error / empty / table swap. */
function Swap({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/**
 * The All / Video / Hospital row — the same segmented control as the range
 * presets above it, and the board's second scope.
 *
 * A scope, not a filter: it re-reads the cards, the chip strip and the roster
 * as a video board or a hospital board, where the status chips only ever hide
 * rows. Each segment carries the count it would show, so the split between the
 * two modes is legible without opening either one.
 *
 * The leading mark is the mode's icon rather than a colour dot — the range row
 * codes past/present/future by colour, and a second colour legend one line
 * below would compete with it for the same meaning.
 */
function ModeTabs({
  value,
  counts,
  onChange,
  clinics,
  clinicId,
  clinicCounts,
  onClinicChange,
}: {
  value: ModeKey;
  counts: Record<ModeKey, number>;
  onChange: (mode: ModeKey) => void;
  /** The doctor's saved clinics — the Hospital segment's dropdown. */
  clinics: OwnClinic[];
  clinicId: string | null;
  clinicCounts: Map<string, number>;
  onClinicChange: (id: string | null) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const picked = clinicId ? clinics.find((c) => c.id === clinicId) : null;

  return (
    <>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_e, next: ModeKey | null) => next && onChange(next)}
        aria-label="Consultation mode"
        sx={segmentedGroupSx}
      >
        {MODE_ORDER.map((key) => {
          const meta = MODE_META[key];
          const ModeIcon = meta.icon;
          /**
           * Hospital is a segment AND a menu: a doctor practising at three
           * hospitals almost never wants "all hospitals at once", they want
           * today's list for the building they are standing in. Selecting the
           * tab and choosing the hospital are therefore ONE gesture — the click
           * switches the tab and opens the list.
           */
          const isClinicTab = key === "clinic" && clinics.length > 0;
          return (
            <ToggleButton
              key={key}
              value={key}
              title={isClinicTab ? "Pick a hospital" : meta.hint}
              onClick={isClinicTab ? (e) => setAnchor(e.currentTarget) : undefined}
              aria-haspopup={isClinicTab ? "menu" : undefined}
              sx={segmentSx((t) => toneColors(t, meta.accent).solid)}
            >
              <ModeIcon size={14} />
              {/* The chosen hospital replaces the word "Hospital", so the
                  filter that is running is readable without opening anything. */}
              <Box component="span" sx={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
                {isClinicTab && picked ? picked.name : meta.short}
              </Box>
              <SegmentCount>
                {isClinicTab && picked ? (clinicCounts.get(picked.id) ?? 0) : counts[key]}
              </SegmentCount>
              {isClinicTab && <FiChevronDown size={12} style={{ opacity: 0.6 }} />}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 0.5 } } }}
      >
        <MenuItem
          selected={!clinicId}
          onClick={() => {
            onClinicChange(null);
            setAnchor(null);
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%" }}>
            <Box sx={{ flexGrow: 1, fontWeight: 600 }}>All hospitals</Box>
            <Box component="span" sx={{ color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
              {counts.clinic}
            </Box>
          </Stack>
        </MenuItem>
        {clinics.map((c) => (
          <MenuItem
            key={c.id}
            selected={clinicId === c.id}
            onClick={() => {
              onClinicChange(c.id);
              setAnchor(null);
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%", minWidth: 0 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ fontWeight: 600 }} component="div">
                  {c.name}
                </Box>
                {c.city && (
                  <Box component="div" sx={{ fontSize: 12, color: "text.secondary" }}>
                    {c.city}
                  </Box>
                )}
              </Box>
              <Box component="span" sx={{ color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
                {clinicCounts.get(c.id) ?? 0}
              </Box>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** A status pill in the legend strip — doubles as the status filter. */
function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: BookingStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  return (
    <Tooltip title={meta.hint} arrow>
      <ButtonBase
        onClick={onClick}
        aria-pressed={active}
        sx={(t) => {
          const c = toneColors(t, meta.tone);
          return {
            gap: 0.875,
            px: 1.25,
            py: 0.625,
            borderRadius: `${t.tokens.radius.pill}px`,
            border: 1,
            borderColor: active ? c.line : t.palette.divider,
            bgcolor: active ? c.soft : t.palette.background.paper,
            color: active ? c.ink : t.palette.text.secondary,
            fontSize: 12.5,
            fontWeight: 600,
            transition: t.transitions.create(["background-color", "border-color", "color"], {
              duration: t.tokens.duration.fast,
            }),
            "& > svg": { color: c.solid, flexShrink: 0 },
            "&:hover": { bgcolor: active ? c.soft : t.palette.action.hover },
          };
        }}
      >
        <StatusIcon size={14} />
        {meta.short}
        <Box component="span" sx={{ fontWeight: 500, opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
          {count}
        </Box>
      </ButtonBase>
    </Tooltip>
  );
}

/**
 * The follow-up filter chip — the same pill as {@link StatusChip}, down to the
 * padding, type and transition, so it reads as one more control in that row
 * rather than a different kind of thing.
 *
 * `colorHex` tints it with one category's own colour when a single category is
 * shown; the aggregate chip omits it and takes the app's primary, because no
 * one category owns "all follow-ups".
 */
function FollowUpFilterChip({
  label,
  colorHex,
  count,
  active,
  onClick,
}: {
  label: string;
  colorHex?: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={`Show only patients tagged for ${label.toLowerCase()}`} arrow>
      <ButtonBase
        onClick={onClick}
        aria-pressed={active}
        sx={(t) => {
          const c = chipColors(t, colorHex ?? t.palette.primary.main);
          return {
            gap: 0.875,
            px: 1.25,
            py: 0.625,
            borderRadius: `${t.tokens.radius.pill}px`,
            border: 1,
            borderColor: active ? c.line : t.palette.divider,
            bgcolor: active ? c.soft : t.palette.background.paper,
            color: active ? c.ink : t.palette.text.secondary,
            fontSize: 12.5,
            fontWeight: 600,
            transition: t.transitions.create(["background-color", "border-color", "color"], {
              duration: t.tokens.duration.fast,
            }),
            "&:hover": { bgcolor: active ? c.soft : t.palette.action.hover },
          };
        }}
      >
        {/* Carries the colour even when the chip is off, so it is identifiable
            before it is selected — the job the status icon does. */}
        <Box
          component="span"
          sx={(t) => ({
            width: 9,
            height: 9,
            borderRadius: "50%",
            flexShrink: 0,
            bgcolor: chipColors(t, colorHex ?? t.palette.primary.main).solid,
          })}
        />
        {label}
        <Box component="span" sx={{ fontWeight: 500, opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
          {count}
        </Box>
      </ButtonBase>
    </Tooltip>
  );
}

/** Referred IN sorts before referred OUT, and both before rows with neither. */
function referralSortValue(a: Appointment): number {
  if (a.referrals?.incoming) return 0;
  if (a.referrals?.outgoing?.length) return 1;
  return 2;
}

/**
 * The Referral cell: which doctor sent this patient here, and which doctor they
 * were sent on to.
 *
 * DIRECTION is the whole point of the cell, so it is carried three ways at
 * once — the arrow, the word ("From"/"To") and the colour — rather than by
 * colour alone. A doctor scanning a roster has to know instantly whether a name
 * is someone who trusted them with a patient or someone they owe a patient to.
 */
function ReferralCell({ referrals }: { referrals?: BookingReferrals | null }) {
  const incoming = referrals?.incoming ?? null;
  const outgoing = referrals?.outgoing ?? [];
  if (!incoming && outgoing.length === 0) {
    return (
      <Box component="span" sx={{ color: "text.disabled", fontSize: 13 }}>
        —
      </Box>
    );
  }

  const line = (
    key: string,
    dir: "in" | "out",
    peer: ReferralPeer | null,
    reason: string | null,
    extra: number,
  ) => (
    <Stack key={key} direction="row" spacing={0.75} sx={{ alignItems: "flex-start", minWidth: 0 }}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          mt: "2px",
          flexShrink: 0,
          color: dir === "in" ? "success.main" : "secondary.main",
        }}
      >
        {dir === "in" ? <FiCornerDownLeft size={12} /> : <FiCornerUpRight size={12} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" noWrap sx={{ display: "block", fontWeight: 600, lineHeight: 1.3 }}>
          <Box component="span" sx={{ color: dir === "in" ? "success.main" : "secondary.main" }}>
            {dir === "in" ? "From " : "To "}
          </Box>
          {peer?.name ?? "Doctor"}
          {extra > 0 && (
            <Box component="span" sx={{ color: "text.disabled", fontWeight: 500 }}>
              {" "}
              +{extra}
            </Box>
          )}
        </Typography>
        {/* The specialty says WHY at a glance; the reason text is the case
            itself and lives in the appointment, not in a roster cell. */}
        {(peer?.specialization || reason) && (
          <Typography
            variant="caption"
            color="text.disabled"
            noWrap
            sx={{ display: "block", lineHeight: 1.3 }}
            title={reason ?? undefined}
          >
            {peer?.specialization ?? reason}
          </Typography>
        )}
      </Box>
    </Stack>
  );

  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      {incoming && line(incoming.id, "in", incoming.fromDoctor, incoming.reason, 0)}
      {outgoing[0] &&
        line(outgoing[0].id, "out", outgoing[0].toDoctor, outgoing[0].reason, outgoing.length - 1)}
    </Stack>
  );
}

/** "4 Sept" — an expected follow-up's day, where a booking would show a time. */
const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * The badge for a row that is a follow-up date rather than a booking.
 *
 * Outlined and dashed, where every real status is filled: the doctor has to be
 * able to tell at a glance that this is a patient they are EXPECTING, not one
 * with an appointment. Nobody should ring a patient about a slot that was never
 * booked.
 */
function ExpectedBadge() {
  return (
    <Box
      sx={(t) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.125,
        py: 0.5,
        borderRadius: `${t.tokens.radius.pill}px`,
        border: "1px dashed",
        borderColor: t.palette.divider,
        color: "text.secondary",
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      })}
    >
      <FiTag size={13} />
      Expected
    </Box>
  );
}

/** The status badge in a roster row. `live` adds the derived in-window pulse. */
function StatusBadge({ status, live }: { status: BookingStatus; live: boolean }) {
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  return (
    <Box
      sx={(t) => {
        const c = toneColors(t, meta.tone);
        return {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.125,
          py: 0.5,
          borderRadius: `${t.tokens.radius.pill}px`,
          border: 1,
          borderColor: c.line,
          bgcolor: c.soft,
          color: c.ink,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        };
      }}
    >
      {live && <PulseDot tone="info" size={6} />}
      <StatusIcon size={13} />
      {meta.label}
    </Box>
  );
}

/** A dot with a soft outward beat — the only motion on the board. */
function PulseDot({ tone, size }: { tone: "info" | "warning"; size: number }) {
  return (
    <Box
      sx={(t) => ({
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        bgcolor: t.palette[tone].main,
        animation: "apptPulse 2s infinite",
        "@keyframes apptPulse": {
          "0%": { boxShadow: `0 0 0 0 ${alpha(t.palette[tone].main, 0.45)}` },
          "70%": { boxShadow: `0 0 0 7px ${alpha(t.palette[tone].main, 0)}` },
          "100%": { boxShadow: `0 0 0 0 ${alpha(t.palette[tone].main, 0)}` },
        },
      })}
    />
  );
}

/**
 * The signature line: where "now" falls in the day. Sits between the last slot
 * that has started and the next one that hasn't, so the doctor can see at a
 * glance what is behind them and what is still to come.
 */
function NowRow({ now }: { now: number }) {
  const label = new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <TableRow
      component={motion.tr}
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: easeOut }}
      sx={{ height: 30, "& td": { p: 0, border: 0 } }}
    >
      <TableCell colSpan={COL_COUNT}>
        <Stack direction="row" sx={{ alignItems: "center", px: 2 }}>
          <Box
            sx={(t) => ({
              display: "inline-flex",
              alignItems: "center",
              gap: 0.875,
              flexShrink: 0,
              mr: 1.5,
              px: 1.25,
              py: 0.375,
              borderRadius: `${t.tokens.radius.pill}px`,
              border: 1,
              borderColor: alpha(t.palette.warning.main, 0.38),
              bgcolor: alpha(t.palette.warning.main, t.palette.mode === "dark" ? 0.18 : 0.12),
              color: t.palette.mode === "dark" ? t.palette.warning.light : t.palette.warning.dark,
              fontSize: 11.5,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            })}
          >
            <PulseDot tone="warning" size={7} />
            now · {label}
          </Box>
          {/* The rail draws itself outward from the marker. */}
          <Box
            component={motion.div}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, ease: easeOut, delay: 0.1 }}
            sx={(t) => ({
              flexGrow: 1,
              height: 2,
              borderRadius: 1,
              transformOrigin: "left center",
              background: `linear-gradient(90deg, ${alpha(t.palette.warning.main, 0.55)}, transparent)`,
            })}
          />
        </Stack>
      </TableCell>
    </TableRow>
  );
}

/** A sortable header cell. */
function SortCell({
  sortKey,
  sort,
  onSort,
  align,
  children,
}: {
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  align?: "right";
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  return (
    <TableCell align={align} sortDirection={active ? sort.dir : false}>
      <TableSortLabel active={active} direction={active ? sort.dir : "asc"} onClick={() => onSort(sortKey)}>
        {children}
      </TableSortLabel>
    </TableCell>
  );
}

/** One appointment. The whole row is the target — clicking opens the detail dialog. */
function AppointmentRow({
  appt,
  today,
  live,
  delay,
  onOpen,
}: {
  appt: BoardAppointment;
  today: string;
  live: boolean;
  /** Stagger offset so the roster cascades in rather than appearing at once. */
  delay: number;
  onOpen: () => void;
}) {
  const modeMeta = MODE_META[appt.mode];
  const ModeIcon = modeMeta.icon;
  // An expected follow-up has no place: nothing is booked, so there is nothing
  // to say beyond that.
  const loc = appt.expected
    ? { primary: "Not booked yet", secondary: null, muted: true }
    : locationLines(appt);
  const pay = paymentLabel(appt.paymentMode, appt.payment?.status, appt.payment);
  // Both lines are omitted entirely when the patient never completed their
  // profile — an empty line reads as a rendering fault.
  const patientLine = [appt.patient.age != null ? `${appt.patient.age} yrs` : null, appt.patient.phone]
    .filter(Boolean)
    .join(" · ");
  // City and state only. The street line is on the record page; here it pushed
  // the first column past half the table and forced the rest off-screen.
  const placeLine = [appt.patient.city, appt.patient.state].filter(Boolean).join(", ");
  // Cancelled work is still worth seeing, but it isn't the day's work.
  const restOpacity = appt.status === "cancelled" ? 0.66 : 1;

  return (
    <TableRow
      hover
      tabIndex={0}
      role="button"
      onClick={onOpen}
      onKeyDown={(e: ReactKeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      component={motion.tr}
      /*
       * `layout="position"` (not full `layout`) on purpose: it translates the
       * row to its new slot when the sort flips, without re-measuring cell
       * widths — which is what makes framer's layout animations tear inside a
       * <table>, where the browser owns column sizing.
       */
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: restOpacity, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.28, ease: easeOut, delay }}
      sx={{
        cursor: "pointer",
        "& td": { py: 1.25, borderColor: "divider" },
        "&:hover .row-chevron": { color: "secondary.main" },
      }}
    >
      <TableCell sx={{ maxWidth: 250 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          {/* The photo when the patient has uploaded one, their initials when
              not — Avatar falls back to its children if the image 404s, so a
              dead URL degrades to the tinted monogram rather than a broken
              image icon. */}
          <Avatar
            variant="rounded"
            src={appt.patient.photoUrl ?? undefined}
            alt={appt.patient.name ?? "Patient"}
            sx={(t) => ({
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: `${t.tokens.radius.xs}px`,
              bgcolor: t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.08) : t.palette.grey[100],
              color: t.palette.text.secondary,
              fontSize: 12,
              fontWeight: 700,
            })}
          >
            {initials(appt.patient.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {appt.patient.name ?? "Patient"}
            </Typography>
            {/*
              Who arranged it. Absent on a booking the patient made themselves,
              so the direct flow's rows look exactly as they did before.
            */}
            {appt.bookedBy && (
              <Typography variant="caption" color="secondary.main" noWrap sx={{ display: "block", fontWeight: 600 }}>
                via {appt.bookedBy.name}
              </Typography>
            )}
            {/*
              Age · phone, then where they're from. Two lines, not five fields
              on one: the row already carries eight columns. Hidden below md —
              cramming an address into a 360px row makes every row unreadable
              to save one tap.
            */}
            {(patientLine || placeLine) && (
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                {patientLine && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}
                  >
                    {patientLine}
                  </Typography>
                )}
                {placeLine && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    noWrap
                    sx={{ display: "block" }}
                    title={placeLine}
                  >
                    {placeLine}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
          {/* An expected follow-up has a DAY but no time — nobody has picked
              one yet — so the day is the headline instead of a dash. */}
          {appt.expected ? dayLabel(appt.date) : timeLabel(appt.startTime) || "—"}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {relativeDayLabel(appt.date, today)}
        </Typography>
      </TableCell>

      {/* Icon, wording and accent all come from MODE_META, so a row and the
          mode tab that opens it can never disagree. */}
      <TableCell>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            sx={(t) => {
              const c = toneColors(t, modeMeta.accent);
              return {
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                width: 26,
                height: 26,
                borderRadius: `${t.tokens.radius.xs}px`,
                bgcolor: t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.08) : t.palette.grey[100],
                color: c.solid,
              };
            }}
          >
            {appt.expected ? <FiTag size={13} /> : <ModeIcon size={13} />}
          </Box>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, lineHeight: 1.25 }}>
            {appt.expected ? "Follow-up due" : modeMeta.label}
          </Typography>
        </Stack>
      </TableCell>

      {/* Where it was taken. The hospital name used to sit under
          "Consultation"; it has its own sortable column now, so a doctor
          working two hospitals can group the day by place. */}
      <TableCell sx={{ maxWidth: 150 }}>
        <Typography
          variant="body2"
          noWrap
          color={loc.muted ? "text.disabled" : "text.primary"}
          sx={{ fontWeight: loc.muted ? 400 : 600, lineHeight: 1.25 }}
        >
          {loc.primary}
        </Typography>
        {loc.secondary && (
          <Typography variant="caption" color="text.disabled" noWrap sx={{ display: "block" }}>
            {loc.secondary}
          </Typography>
        )}
      </TableCell>

      <TableCell align="right">
        {appt.expected ? (
          <Typography sx={{ fontSize: 13, color: "text.disabled" }}>—</Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
              {formatCurrency(appt.amount)}
            </Typography>
            {pay && (
              // A UPI-QR label carries the patient's reference and can run long —
              // clip it in the dense row; the full text is on hover and in the dialog.
              <Typography
                variant="caption"
                color="text.disabled"
                noWrap
                title={pay}
                sx={{ display: "block", maxWidth: 220, ml: "auto" }}
              >
                {pay}
              </Typography>
            )}
          </>
        )}
      </TableCell>

      <TableCell>
        {appt.expected ? <ExpectedBadge /> : <StatusBadge status={appt.status} live={live} />}
      </TableCell>

      {/* Who sent this patient here, and who they were sent on to. */}
      <TableCell sx={{ maxWidth: 190 }}>
        <ReferralCell referrals={appt.referrals} />
      </TableCell>

      {/* The patient's follow-up category and the day they're expected back.
          Per PATIENT, not per booking — the same chip shows on every
          appointment they have. */}
      <TableCell sx={{ maxWidth: 140 }}>
        <FollowUpChip followUp={appt.followUp} />
      </TableCell>

      <TableCell align="right" sx={{ width: 40 }}>
        <Box className="row-chevron" sx={{ display: "inline-flex", color: "text.disabled", transition: "color .15s" }}>
          <FiChevronRight size={16} />
        </Box>
      </TableCell>
    </TableRow>
  );
}
