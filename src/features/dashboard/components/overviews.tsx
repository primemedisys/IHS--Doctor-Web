"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import { AccentTile, accentForIcon, type AccentKey } from "@/components/common/AccentTile";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { ErrorState } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { OnboardingNudge } from "@/features/doctor";
import { useOnboarding, useOwnProfile } from "@/features/doctor/hooks";
import { useWorkbench } from "@/features/emr/hooks";
import { istToday, timeLabel } from "@/features/emr/format";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, getInitials } from "@/utils/format";
import { formatPersonName } from "@/utils/display";
import { useDoctorDashboardSummary, useTodaySchedule } from "../hooks";
import { dashboardNavForRole, visibleNav, type DashNavItem } from "../nav";
import {
  AcquisitionOverviewSection,
  AppointmentPerformanceSection,
  DateRangeFilter,
  FinancialOverviewSection,
  OverviewTrends,
  PatientOverviewSection,
  ProductivityOverviewSection,
  QualityOverviewSection,
  effectiveGranularity,
  rangeFor,
  DEFAULT_RANGE_PRESET,
  type Granularity,
  type RangeValue,
} from "@/features/analytics";
import type { Appointment, BookingStatus } from "@/types/appointment";

// ── Greeting ──────────────────────────────────────────────────────────────────

/** Morning / afternoon / evening on the IST clock — the clock the practice runs on. */
function partOfDay(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now)) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Greeting() {
  const { user } = useAuth();
  const { data: profile } = useOwnProfile();
  // Names are sometimes stored with the title already ("Dr. Rao") — never print "Dr. Dr.".
  const name = formatPersonName(profile?.name ?? user?.name).replace(/^dr\.?\s+/i, "");
  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.25, fontSize: { xs: 20, md: 22 } }}>
        {partOfDay()}{name ? `, Dr. ${name}` : ""}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Here&apos;s your practice overview and patient activity.
      </Typography>
    </Box>
  );
}

function SectionHeading({ id, title, action }: { id?: string; title: string; action?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
      <Typography id={id} variant="subtitle2" component="h2" sx={{ fontWeight: 700, letterSpacing: "0.01em" }}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}

// ── Shortcut cards (one per sidebar item) ─────────────────────────────────────

const SHORTCUT_TONE: Partial<Record<AccentKey, CardTone>> = {
  navy: "blue",
  green: "green",
  red: "red",
  orange: "orange",
  purple: "purple",
  teal: "teal",
  amber: "orange",
  grey: "gray",
};

function ShortcutCard({ item, badge, badgeHint }: { item: DashNavItem; badge?: string; badgeHint?: string }) {
  const label = item.shortLabel ?? item.label;
  const card = CARD_TONES[SHORTCUT_TONE[accentForIcon(item.icon)] ?? "gray"];
  return (
    <Paper
      component={Link}
      href={item.href}
      variant="outlined"
      aria-label={badgeHint ? `${item.label} (${badgeHint})` : item.label}
      title={item.label}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.6,
        px: 0.75,
        py: 1.1,
        minHeight: 78,
        borderRadius: (t) => `${t.tokens.radius.lg}px`,
        textAlign: "center",
        textDecoration: "none",
        bgcolor: card.bg,
        borderColor: card.border,
        color: card.heading,
        transition: (t) => t.transitions.create(["border-color", "box-shadow", "transform", "background-color"], { duration: 150 }),
        "&:hover": { borderColor: card.fg, bgcolor: card.bg, boxShadow: `0 4px 12px ${card.border}` },
        "&:focus-visible": { outline: "2px solid", outlineColor: card.fg, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } },
      }}
    >
      <AccentTile icon={item.icon} size={34} iconSize={16} sx={{ bgcolor: "rgba(255,255,255,0.7)", color: card.fg }} />
      <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.25, fontSize: 12.5, color: card.heading }}>
        {label}
      </Typography>
      {badge != null && (
        <Box
          title={badgeHint}
          sx={{
            position: "absolute",
            top: 5,
            right: 5,
            minWidth: 18,
            height: 18,
            px: 0.5,
            borderRadius: 999,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontSize: 10.5,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
          }}
        >
          {badge}
        </Box>
      )}
    </Paper>
  );
}

/**
 * Exactly the sidebar's items (same list, same live-gating), minus Overview —
 * the page the doctor is already on. Counts appear only where a real number is
 * already loaded on this page; nothing is estimated.
 */
function ShortcutGrid() {
  const { user } = useAuth();
  const { data: onboarding } = useOnboarding();
  const isLive = onboarding?.verificationStatus === "approved";
  const summary = useDoctorDashboardSummary();
  // Badge-only: the Workbench page's first render uses this same key (today,
  // pending, no search), so opening it from the shortcut is instant.
  const wb = useWorkbench(istToday(), "pending", "", { enabled: isLive });

  if (!user) return null;
  const items = visibleNav(dashboardNavForRole(user.role), isLive).filter((i) => i.href !== ROUTES.dashboard.root);

  const counts: Partial<Record<string, { n: number; hint: string; capped?: boolean }>> = {};
  if (summary.data) counts[ROUTES.dashboard.appointments] = { n: summary.data.appointments.today, hint: "appointments today" };
  if (wb.data && wb.data.date === istToday()) {
    counts[ROUTES.dashboard.workbench] = { n: wb.data.counts.pending, hint: "pending consultations today" };
    counts[ROUTES.dashboard.patients] = { n: wb.data.all.rows.length, hint: "patients", capped: wb.data.all.capped };
  }

  return (
    <Stack spacing={1}>
      <SectionHeading id="shortcuts-heading" title="Quick shortcuts" />
      <Box
        component="nav"
        aria-labelledby="shortcuts-heading"
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "repeat(3, minmax(0, 1fr))",
            sm: "repeat(4, minmax(0, 1fr))",
            md: "repeat(6, minmax(0, 1fr))",
            xl: `repeat(${Math.min(items.length, 12)}, minmax(0, 1fr))`,
          },
        }}
      >
        {items.map((item) => {
          const c = counts[item.href];
          const badge = c && c.n > 0 ? `${c.n > 99 ? "99" : c.n}${c.capped || c.n > 99 ? "+" : ""}` : undefined;
          return <ShortcutCard key={item.href} item={item} badge={badge} badgeHint={badge ? `${badge} ${c?.hint}` : undefined} />;
        })}
      </Box>
    </Stack>
  );
}

// ── Lower section: earnings + today's schedule ────────────────────────────────

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={(t) => ({ borderRadius: `${t.tokens.radius.xl}px`, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" })}>
      <Stack direction="row" spacing={1} sx={{ px: 1.75, py: 1.1, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      <Box sx={{ px: 1.5, py: 1.25, flex: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

function CompactEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center", color: "text.secondary", py: 2.5 }}>
      <Icon name={icon} size={16} />
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

const SCHEDULE_STATUS: Record<BookingStatus, { label: string; color: "default" | "warning" | "info" | "success" | "error" }> = {
  pending_payment: { label: "Awaiting payment", color: "warning" },
  confirmed: { label: "Upcoming", color: "info" },
  completed: { label: "Completed", color: "success" },
  no_show: { label: "No-show", color: "default" },
  cancelled: { label: "Cancelled", color: "default" },
};

/** Rows on the overview before "View all". */
const SCHEDULE_ROWS = 6;

function ScheduleRow({ a }: { a: Appointment }) {
  const st = SCHEDULE_STATUS[a.status] ?? { label: a.status, color: "default" as const };
  // Same rule as the workbench: an unpaid hold or a cancelled slot has no record to open.
  const canOpen = !!a.patient.id && a.status !== "pending_payment" && a.status !== "cancelled";
  const name = formatPersonName(a.patient.name) || "Patient";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 0.75, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
      <Avatar src={a.patient.photoUrl ?? undefined} sx={{ width: 30, height: 30, fontSize: 12 }}>
        {getInitials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
          {name}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary", minWidth: 0 }}>
          <Icon name={a.mode === "video" ? "FiVideo" : "FiMapPin"} size={11} />
          <Typography variant="caption" noWrap>
            {a.mode === "video" ? "Video" : "In-clinic"} · {timeLabel(a.startTime) || "—"}
            {a.amount ? ` · ${formatCurrency(a.amount)}` : ""}
          </Typography>
        </Stack>
      </Box>
      <Chip size="small" color={st.color} label={st.label} sx={{ height: 20, flexShrink: 0, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }} />
      <Tooltip title={canOpen ? "Open patient" : "The record opens once the booking is paid"}>
        <span>
          <IconButton
            size="small"
            component={canOpen ? Link : "button"}
            href={canOpen ? ROUTES.dashboard.emrPatient(a.patient.id ?? "", a.id) : undefined}
            disabled={!canOpen}
            aria-label={`Open ${name}`}
          >
            <Icon name="FiChevronRight" size={16} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

function TodayScheduleCard() {
  const today = useTodaySchedule();
  // Slot-time order, earliest first: a schedule you work forwards through.
  const rows = useMemo(
    () => [...(today.data ?? [])].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [today.data],
  );
  const extra = rows.length - SCHEDULE_ROWS;

  return (
    <SectionCard
      title="Today's schedule"
      subtitle={today.data ? `${rows.length} appointment${rows.length === 1 ? "" : "s"}` : undefined}
      action={
        <Button component={Link} href={ROUTES.dashboard.appointments} size="small" endIcon={<Icon name="FiArrowRight" size={14} />}>
          View all
        </Button>
      }
    >
      {today.isError ? (
        <ErrorState onRetry={() => today.refetch()} sx={{ py: 1 }} />
      ) : today.isLoading ? (
        <Stack spacing={0.75}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={38} />
          ))}
        </Stack>
      ) : !rows.length ? (
        <CompactEmpty icon="FiCalendar" text="No appointments today." />
      ) : (
        <>
          {rows.slice(0, SCHEDULE_ROWS).map((a) => (
            <ScheduleRow key={a.id} a={a} />
          ))}
          {extra > 0 && (
            <Button component={Link} href={ROUTES.dashboard.appointments} size="small" fullWidth sx={{ mt: 0.5 }}>
              +{extra} more today
            </Button>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardHome() {
  return <DoctorOverview />;
}

/**
 * The doctor's overview — Doctor Dashboard 2.0 (docs/doctor-dashboard-2-31-10-2026):
 *   header (greeting, onboarding nudge, period filter — default "This month");
 *   Patient Overview → Appointment Performance → Financial → Quality →
 *   Productivity KPI sections (one `/doctor/analytics/overview` request);
 *   quick shortcuts; acquisition insights; analytics charts (one
 *   `/doctor/analytics/trends` request) beside today's schedule.
 * Each section loads and fails on its own; nothing is placeholder data.
 * The patient workbench preview no longer lives here — it's one shortcut away.
 */
function DoctorOverview() {
  const [range, setRange] = useState<RangeValue>(() => rangeFor(DEFAULT_RANGE_PRESET));
  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);
  const g = effectiveGranularity(granularity, range);
  const props = { range, granularity: g };

  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
          <Greeting />
          <DateRangeFilter value={range} onChange={setRange} />
        </Stack>
        <OnboardingNudge />
      </Stack>
      <PatientOverviewSection {...props} />
      <AppointmentPerformanceSection {...props} />
      <FinancialOverviewSection {...props} />
      <QualityOverviewSection {...props} />
      <ProductivityOverviewSection {...props} />
      <ShortcutGrid />
      <AcquisitionOverviewSection {...props} />
      <OverviewTrends {...props} onGranularity={setGranularity} aside={<TodayScheduleCard />} />
    </Stack>
  );
}
