"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { dayLabel, timeLabel } from "@/features/emr/format";
import { OVERVIEW_FOLDS, foldGroups, foldPoint, groupCount } from "../acquisition";
import { inr, inrCompact, num, pctText, plural } from "../format";
import { useAnalyticsOverview, useAnalyticsTrends } from "../hooks/useAnalytics";
import { rangeLabel, withRange, type RangeValue } from "../range";
import type { AnalyticsOverview, Granularity } from "../types";
import { ACQ_SERIES, acqColor, useChartColors } from "./chartColors";
import { DonutChart, SeriesChart } from "./charts";
import { GranularityToggle } from "./Filters";
import { KpiCard } from "./KpiCard";
import { ChartCard, KpiSection, SectionHeader } from "./KpiSection";
import { DEFS } from "../definitions";

export interface OverviewProps {
  range: RangeValue;
  granularity?: Granularity;
}

const A = ROUTES.dashboard.analytics;

/** The single overview request, plus the flags every section needs. */
function useOverview(range: RangeValue) {
  const q = useAnalyticsOverview({ from: range.from, to: range.to });
  const d = q.data;
  return {
    d,
    state: { loading: q.isLoading || !d, error: q.isError, onRetry: () => void q.refetch() },
    stale: q.isPlaceholderData,
    prevHint: d ? `Compared with ${rangeLabel({ from: d.period.previousFrom, to: d.period.previousTo })}` : undefined,
  };
}

/** Sparklines reuse the charts' trends request (same key → no extra call). */
function useSpark(range: RangeValue, granularity?: Granularity) {
  return useAnalyticsTrends({ from: range.from, to: range.to, granularity }).data;
}

const shortDay = (d: string) => dayLabel(d, { year: undefined });

// ── 1. Patients ─────────────────────────────────────────────────────────────

export function PatientOverviewSection({ range, granularity }: OverviewProps) {
  const { d, state, stale, prevHint } = useOverview(range);
  const t = useSpark(range, granularity);
  const href = withRange(A.patients, range);
  const p = d?.patients;
  return (
    <KpiSection
      id="kpi-patients"
      title="Patient Overview"
      subtitle="Understand your patient base, patient activity, and consultation relationships."
      href={href}
      {...state}
    >
      {p && (
        <>
          <KpiCard
            title="Total patients"
            icon="FiUsers"
            tone="secondary"
            value={num(p.total)}
            subtitle={`${num(p.new)} new this period`}
            comparison={{ value: p.newGrowth, hint: `New patients: ${num(p.newPrevious)} in the previous period. ${prevHint ?? ""}` }}
            caption={`${num(p.active)} active in the last ${p.activeWindowDays} days`}
            sparkline={t?.patients.map((x) => x.new)}
            info={DEFS.totalPatients}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Today's patients"
            icon="FiUserCheck"
            tone="info"
            value={num(p.today.patients)}
            subtitle={`${num(p.today.completed)} completed · ${num(p.today.remaining)} remaining`}
            info={DEFS.todayPatients}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Returning patients"
            icon="FiRepeat"
            tone="success"
            value={num(p.returning)}
            subtitle={`${pctText(p.returningPercent)} of ${plural(p.seenInPeriod, "patient")} seen this period`}
            info={DEFS.returning}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Patient cancellations"
            icon="FiXCircle"
            tone="error"
            value={num(p.cancellations.count)}
            subtitle={`${pctText(p.cancellations.rate)} of ${plural(p.cancellations.eligible, "booking")}`}
            info={DEFS.cancellations}
            href={href}
            stale={stale}
          />
        </>
      )}
    </KpiSection>
  );
}

// ── 2. Appointments ─────────────────────────────────────────────────────────

export function nextAppointmentText(next: AnalyticsOverview["appointments"]["upcoming"]["next"]): string {
  if (!next) return "Nothing booked after today";
  const when = `${shortDay(next.date)}${next.time ? `, ${timeLabel(next.time)}` : ""}`;
  const how = next.mode === "video" ? "Video" : next.token != null ? `Token ${next.token}` : "Clinic";
  return `Next: ${when} · ${next.patientName ?? "Patient"} · ${how}`;
}

export function AppointmentPerformanceSection({ range, granularity }: OverviewProps) {
  const { d, state, stale } = useOverview(range);
  const t = useSpark(range, granularity);
  const href = withRange(A.appointments, range);
  const a = d?.appointments;
  return (
    <KpiSection
      id="kpi-appointments"
      title="Appointment Performance"
      subtitle="Monitor consultation schedules, booking activity, completion and waiting time."
      href={href}
      {...state}
    >
      {a && (
        <>
          <KpiCard
            title="Today's appointments"
            icon="FiCalendar"
            tone="info"
            value={num(a.today.total)}
            subtitle={`${num(a.today.clinic)} clinic · ${num(a.today.video)} video`}
            caption={a.today.serving > 0 ? `${num(a.today.serving)} being seen now` : undefined}
            info={DEFS.todayAppointments}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Upcoming appointments"
            icon="FiArrowRightCircle"
            tone="secondary"
            value={num(a.upcoming.count)}
            subtitle={nextAppointmentText(a.upcoming.next)}
            caption={a.upcoming.awaitingPayment > 0 ? `${num(a.upcoming.awaitingPayment)} awaiting payment` : undefined}
            captionTone="warning"
            info={DEFS.upcoming}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Completed consultations"
            icon="FiCheckCircle"
            tone="success"
            value={num(a.period.completed)}
            subtitle={`Clinic ${num(a.period.completedClinic)} · Video ${num(a.period.completedVideo)} · ${pctText(a.period.completionRate)} completion`}
            caption={a.period.notMarkedComplete > 0 ? `${plural(a.period.notMarkedComplete, "past appointment")} not marked complete` : undefined}
            captionTone="warning"
            sparkline={t?.appointments.map((x) => x.completed)}
            info={DEFS.completed}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Pending / in queue"
            icon="FiClock"
            tone="warning"
            value={num(a.today.queued + a.today.awaitingPayment)}
            subtitle={`${num(a.today.queued)} in today's queue · ${num(a.today.awaitingPayment)} awaiting payment`}
            caption="Booked tokens not yet called — arrival isn't recorded"
            info={DEFS.queue}
            href={href}
            stale={stale}
          />
        </>
      )}
    </KpiSection>
  );
}

// ── 3. Financial ────────────────────────────────────────────────────────────

export function FinancialOverviewSection({ range, granularity }: OverviewProps) {
  const { d, state, stale, prevHint } = useOverview(range);
  const t = useSpark(range, granularity);
  const href = withRange(A.financial, range);
  const f = d?.financial;
  return (
    <KpiSection
      id="kpi-financial"
      title="Financial Overview"
      subtitle="Understand consultation income, procedure revenue, collections and outstanding payments."
      href={href}
      {...state}
    >
      {f && (
        <>
          <KpiCard
            title="Collected this period"
            icon="FiTrendingUp"
            tone="success"
            value={inr(f.period.collected)}
            comparison={{ value: f.growth, hint: `Previous period: ${inr(f.previous.collected)}. ${prevHint ?? ""}` }}
            subtitle={`You receive ${inr(f.period.doctorNet)} after platform fee`}
            caption={`${plural(f.period.transactions, "payment")} · ${inr(f.yearToDate)} this year`}
            sparkline={t?.revenue.map((x) => x.collected)}
            info={DEFS.collected}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Consultation revenue"
            icon="FiActivity"
            tone="secondary"
            value={inr(f.period.consultation.total)}
            subtitle={`Clinic ${inr(f.period.consultation.clinic)} · Video ${inr(f.period.consultation.video)}`}
            caption={f.period.refunded > 0 ? `${inr(f.period.refunded)} refunded (${plural(f.period.refundCount, "payment")})` : undefined}
            captionTone="error"
            info={DEFS.consultationRevenue}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Procedure revenue"
            icon="FiTool"
            tone="info"
            unavailable={f.procedureRevenue.available ? null : f.procedureRevenue}
            value={f.procedureRevenue.available ? inr(f.procedureRevenue.amount) : undefined}
            href={href}
          />
          <KpiCard
            title="Pending payments"
            icon="FiAlertCircle"
            tone="warning"
            value={inr(f.pending.amount)}
            subtitle={`${plural(f.pending.count, "payment")} due at your clinic`}
            caption={f.pending.overdueAmount > 0 ? `${inr(f.pending.overdueAmount)} overdue (${plural(f.pending.overdueCount, "payment")})` : undefined}
            captionTone="warning"
            info={DEFS.pending}
            href={href}
            stale={stale}
          />
        </>
      )}
    </KpiSection>
  );
}

// ── 4. Quality ──────────────────────────────────────────────────────────────

export function testimonialCaption(q: AnalyticsOverview["quality"]): string | undefined {
  const n = q.satisfaction.portfolioTestimonials?.count ?? 0;
  return n > 0 ? `${plural(n, "testimonial")} on your profile (added by you)` : undefined;
}

export function QualityOverviewSection({ range }: OverviewProps) {
  const { d, state, stale } = useOverview(range);
  const href = withRange(A.quality, range);
  const q = d?.quality;
  const wait = d?.appointments.waitingTime;
  return (
    <KpiSection
      id="kpi-quality"
      title="Quality & Clinical Performance"
      subtitle="Measure patient satisfaction, clinical documentation and continuity of care."
      href={href}
      {...state}
    >
      {q && wait && (
        <>
          <KpiCard
            title="Patient satisfaction"
            icon="FiStar"
            tone="warning"
            unavailable={q.satisfaction.available ? null : q.satisfaction}
            value={q.satisfaction.available ? num(q.satisfaction.averageRating) : undefined}
            caption={testimonialCaption(q)}
            href={href}
          />
          <KpiCard
            title="Waiting time"
            icon="FiWatch"
            tone="info"
            unavailable={wait.available ? null : wait}
            value={wait.available ? `${num(wait.averageMinutes)} min` : undefined}
            href={href}
          />
          <KpiCard
            title="Clinical documentation"
            icon="FiFileText"
            tone="secondary"
            value={pctText(q.documentation.rate)}
            subtitle={`${num(q.documentation.withFinalizedPrescription)} of ${plural(q.documentation.completedConsultations, "consultation")} have a finalized prescription`}
            caption={`${num(q.documentation.withClinicalNote)} with a clinical note`}
            info={DEFS.documentation}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Follow-up compliance"
            icon="FiRotateCw"
            tone="success"
            value={pctText(q.followUp.rate)}
            subtitle={`${num(q.followUp.completed)} completed · ${num(q.followUp.pending)} pending · ${num(q.followUp.overdue)} overdue`}
            caption={`${plural(q.followUp.scheduled, "follow-up")} due in this period`}
            info={DEFS.followUp}
            href={href}
            stale={stale}
          />
        </>
      )}
    </KpiSection>
  );
}

// ── 5. Productivity ─────────────────────────────────────────────────────────

export function ProductivityOverviewSection({ range }: OverviewProps) {
  const { d, state, stale } = useOverview(range);
  const href = withRange(A.productivity, range);
  const p = d?.productivity;
  const dur = d?.appointments.consultDuration;
  return (
    <KpiSection
      id="kpi-productivity"
      title="Doctor Productivity"
      subtitle="Understand daily workload, consultation efficiency and schedule performance."
      href={href}
      {...state}
    >
      {p && dur && (
        <>
          <KpiCard
            title="Patients per day"
            icon="FiUsers"
            tone="secondary"
            value={num(p.patientsPerDay)}
            subtitle={p.workingDays ? `Across ${plural(p.workingDays, "working day")}` : "No completed consultations in this period"}
            info={DEFS.patientsPerDay}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Consultations per day"
            icon="FiActivity"
            tone="info"
            value={num(p.consultationsPerDay)}
            subtitle={`${plural(p.consultations, "consultation")} · OPD ${num(p.opd)} · Video ${num(p.video)}`}
            caption={
              p.utilization.available
                ? `Schedule utilization ${pctText(p.utilization.rate)} (${num(p.utilization.booked)} of ${num(p.utilization.capacity)} slots, ${p.utilization.basis})`
                : undefined
            }
            info={DEFS.consultsPerDay}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Average consultation time"
            icon="FiClock"
            tone="primary"
            unavailable={dur.available ? null : dur}
            value={dur.available ? `${num(dur.averageMinutes)} min` : undefined}
            subtitle={dur.available ? `Measured on ${plural(dur.measured, "consultation")}` : undefined}
            info={DEFS.consultDuration}
            href={href}
            stale={stale}
          />
          <KpiCard
            title="Schedule adherence"
            icon="FiTarget"
            tone="success"
            unavailable={p.scheduleAdherence.available ? null : p.scheduleAdherence}
            value={p.scheduleAdherence.available ? pctText(p.scheduleAdherence.rate) : undefined}
            subtitle={
              p.scheduleAdherence.available
                ? `${num(p.scheduleAdherence.onTime)} of ${plural(p.scheduleAdherence.sessions, "session")} started within ${p.scheduleAdherence.toleranceMinutes} min`
                : undefined
            }
            caption={
              p.scheduleAdherence.available && p.scheduleAdherence.averageStartDelayMinutes != null
                ? `Average start delay ${num(p.scheduleAdherence.averageStartDelayMinutes)} min`
                : undefined
            }
            info={DEFS.adherence}
            href={href}
            stale={stale}
          />
        </>
      )}
    </KpiSection>
  );
}

// ── 6. Acquisition ──────────────────────────────────────────────────────────

/** Five cards from 4 columns would orphan one — 5 across on wide screens. */
const FIVE_COLUMNS = {
  xs: "minmax(0, 1fr)",
  sm: "repeat(2, minmax(0, 1fr))",
  md: "repeat(3, minmax(0, 1fr))",
  lg: "repeat(5, minmax(0, 1fr))",
};

export function AcquisitionOverviewSection({ range }: OverviewProps) {
  const { d, state, stale, prevHint } = useOverview(range);
  const c = useChartColors();
  const href = withRange(A.acquisition, range);
  const acq = d?.acquisition;
  const cards = acq ? foldGroups(acq, OVERVIEW_FOLDS) : [];
  const slices = acq
    ? foldGroups(acq, ACQ_SERIES).map((g) => ({ key: g.key, label: g.label, value: g.count, color: acqColor(c, g.key as (typeof ACQ_SERIES)[number]["key"]) }))
    : [];
  const topSources = cards
    .flatMap((g) => g.sources.map((s) => ({ ...s, group: g.label })))
    .sort((x, y) => y.count - x.count)
    .slice(0, 6);

  return (
    <Stack spacing={1.5}>
      <KpiSection
        id="kpi-acquisition"
        title="Patient Acquisition & Marketing Insights"
        subtitle="Understand which channels bring patients to your practice."
        href={href}
        skeletons={5}
        columns={FIVE_COLUMNS}
        {...state}
      >
        {acq &&
          cards.map((g) => {
            const meta = OVERVIEW_FOLDS.find((f) => f.key === g.key);
            const notAsked = groupCount(acq, "not_captured");
            const notSure = groupCount(acq, "undisclosed");
            return (
              <KpiCard
                key={g.key}
                title={g.label}
                icon={meta?.icon ?? "FiCircle"}
                tone="secondary"
                value={num(g.count)}
                subtitle={`${pctText(g.percent)} of ${plural(acq.newPatients, "new patient")}`}
                comparison={{ value: g.change, hint: `${num(g.previous)} in the previous period. ${prevHint ?? ""}` }}
                caption={g.key === "other" ? `Includes ${num(notAsked)} not asked · ${num(notSure)} not sure` : undefined}
                info={g.key === "other" ? DEFS.acquisitionOther : DEFS.acquisition}
                href={href}
                stale={stale}
              />
            );
          })}
      </KpiSection>
      {acq && !state.error && (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" } }}>
          <ChartCard title="New patients by source" subtitle={rangeLabel(range)} stale={stale}>
            <DonutChart items={slices} centerLabel="new patients" emptyText="No new patients in this period" />
          </ChartCard>
          <ChartCard title="Top sources" subtitle="What new patients told us when booking" stale={stale}>
            {topSources.length ? (
              <Stack component="ol" spacing={0.75} sx={{ m: 0, p: 0, listStyle: "none" }}>
                {topSources.map((s) => (
                  <Stack key={s.source} component="li" direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {s.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.group}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {num(s.count)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                No source answers in this period yet. Patients who booked before the question existed appear as &quot;Not asked&quot;.
              </Typography>
            )}
          </ChartCard>
        </Box>
      )}
    </Stack>
  );
}

// ── 7. Analytics (charts) ───────────────────────────────────────────────────

export function OverviewTrends({
  range,
  granularity,
  onGranularity,
  aside,
}: OverviewProps & { onGranularity: (g: Granularity) => void; aside?: ReactNode }) {
  const c = useChartColors();
  const q = useAnalyticsTrends({ from: range.from, to: range.to, granularity });
  const t = q.data;
  const g = t?.granularity;
  const [apptView, setApptView] = useState<"status" | "mode">("status");
  const chartState = { loading: q.isLoading || !t, error: q.isError, onRetry: () => void q.refetch(), stale: q.isPlaceholderData };

  return (
    <Stack component="section" aria-labelledby="analytics-heading" spacing={1.25}>
      <SectionHeader
        id="analytics-heading"
        title="Analytics"
        subtitle={`Trends for ${rangeLabel(range)}`}
        action={<GranularityToggle value={g} range={range} onChange={onGranularity} />}
      />
      <Box sx={{ display: "grid", gap: 1.5, alignItems: "start", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 7fr) minmax(0, 5fr)" } }}>
        <ChartCard
          title="Revenue trend"
          subtitle="Collected, what you receive after platform fee, and refunds"
          action={
            <Button component={Link} href={ROUTES.dashboard.earnings} size="small" endIcon={<Icon name="FiArrowRight" size={14} />}>
              Details
            </Button>
          }
          {...chartState}
        >
          {t && (
            <SeriesChart
              data={t.revenue}
              granularity={g}
              format={inrCompact}
              emptyText="No payments in this period"
              series={[
                { key: "collected", label: "Collected", color: c.pair[0], kind: "area" },
                { key: "doctorNet", label: "You receive", color: c.pair[1], kind: "line" },
                { key: "refunded", label: "Refunded", color: c.negative, kind: "bar" },
              ]}
            />
          )}
        </ChartCard>
        {aside}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
          "& > :last-child": { gridColumn: { md: "1 / -1", xl: "auto" } },
        }}
      >
        <ChartCard
          title="Appointment trend"
          subtitle={apptView === "status" ? "By status" : "Clinic vs video (booked, excl. cancelled)"}
          action={
            <ToggleButtonGroup exclusive size="small" value={apptView} onChange={(_e, v: "status" | "mode" | null) => v && setApptView(v)} aria-label="Appointment chart view">
              <ToggleButton value="status" sx={{ px: 1, py: 0.25 }}>
                Status
              </ToggleButton>
              <ToggleButton value="mode" sx={{ px: 1, py: 0.25 }}>
                Mode
              </ToggleButton>
            </ToggleButtonGroup>
          }
          {...chartState}
        >
          {t && (
            <SeriesChart
              data={t.appointments}
              granularity={g}
              height={220}
              emptyText="No appointments in this period"
              series={
                apptView === "status"
                  ? [
                      { key: "completed", label: "Completed", color: c.status.completed, stack: "s" },
                      { key: "pending", label: "Pending", color: c.status.pending, stack: "s" },
                      { key: "cancelled", label: "Cancelled", color: c.status.cancelled, stack: "s" },
                      { key: "noShow", label: "No-show", color: c.status.noShow, stack: "s" },
                    ]
                  : [
                      { key: "clinic", label: "Clinic", color: c.pair[0], stack: "m" },
                      { key: "video", label: "Video", color: c.pair[1], stack: "m" },
                    ]
              }
            />
          )}
        </ChartCard>
        <ChartCard title="Patient growth" subtitle="New vs returning patients, and unique patients seen" {...chartState}>
          {t && (
            <SeriesChart
              data={t.patients}
              granularity={g}
              height={220}
              emptyText="No patients seen in this period"
              series={[
                { key: "new", label: "New", color: c.pair[0] },
                { key: "returning", label: "Returning", color: c.pair[1] },
                { key: "unique", label: "Unique patients", color: c.categorical[2], kind: "line" },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title="Acquisition by source" subtitle="New patients by how they found you" {...chartState}>
          {t && (
            <SeriesChart
              data={t.acquisition.map(foldPoint)}
              granularity={g}
              height={220}
              emptyText="No new patients in this period"
              series={ACQ_SERIES.map((s) => ({ key: s.key, label: s.label, color: acqColor(c, s.key), stack: "a" }))}
            />
          )}
        </ChartCard>
      </Box>
    </Stack>
  );
}
