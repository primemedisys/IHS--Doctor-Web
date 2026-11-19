"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { foldGroups, foldPoint, type FoldedGroup } from "../../acquisition";
import { DEFS } from "../../definitions";
import { num, pctText, plural } from "../../format";
import { useAcquisitionAnalytics } from "../../hooks/useAnalytics";
import { useGranularity, useRangeState } from "../../hooks/useRangeState";
import { rangeLabel, type RangeValue } from "../../range";
import type { AcquisitionKpis } from "../../types";
import { ACQ_SERIES, acqColor, useChartColors, type AcqSeriesKey } from "../chartColors";
import { DonutChart, SeriesChart } from "../charts";
import { KpiCard, KpiGrid } from "../KpiCard";
import { ChartCard, KpiSection } from "../KpiSection";
import { CHART_GRID, ExploreShell } from "./ExploreShell";

const ICONS: Record<AcqSeriesKey, string> = {
  google: "FiSearch",
  social: "FiShare2",
  referral: "FiUserPlus",
  ihs: "FiGlobe",
  other: "FiMoreHorizontal",
  not_captured: "FiHelpCircle",
};

function SourceList({ g }: { g: FoldedGroup }) {
  if (g.key === "not_captured") return <>Booked before the question existed, or skipped it</>;
  if (!g.sources.length) return <>No detailed answers yet</>;
  return (
    <Stack component="span" spacing={0.25} sx={{ display: "flex" }}>
      {g.sources.slice(0, 4).map((s) => (
        <Box component="span" key={s.source} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <span>{s.label}</span>
          <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
            {num(s.count)}
          </Box>
        </Box>
      ))}
      {g.sources.length > 4 && <span>+{g.sources.length - 4} more</span>}
    </Stack>
  );
}

export function AcquisitionAnalyticsView({ initialRange }: { initialRange: RangeValue }) {
  const c = useChartColors();
  const [range, setRange] = useRangeState(initialRange);
  const [granularity, setGranularity] = useGranularity(range);
  const q = useAcquisitionAnalytics({ from: range.from, to: range.to, granularity });
  const d = q.data;
  const stale = q.isPlaceholderData;
  const failed = q.isError && !d;
  const retry = () => void q.refetch();
  const chart = { loading: q.isLoading || !d, error: failed, onRetry: retry, stale };

  const slices = (k: AcquisitionKpis) =>
    foldGroups(k, ACQ_SERIES).map((g) => ({ key: g.key, label: g.label, value: g.count, color: acqColor(c, g.key as AcqSeriesKey) }));
  const groups = d ? foldGroups(d.summary, ACQ_SERIES) : [];

  return (
    <ExploreShell
      title="Patient acquisition"
      subtitle="Which channels bring new patients to your practice, from what they tell us when they first book."
      range={range}
      onRange={setRange}
      granularity={d?.granularity}
      onGranularity={setGranularity}
    >
      <Typography variant="body2" color="text.secondary">
        Patients who weren&apos;t asked (booked before this feature) appear as &quot;Not asked&quot;. A patient&apos;s first answer is their
        original source with you and is never overwritten.
      </Typography>

      <KpiSection id="acq-totals" title="Summary" subtitle={rangeLabel(range)} loading={q.isLoading || !d} error={failed} onRetry={retry} skeletons={3}>
        {d && (
          <>
            <KpiCard title="New patients" icon="FiUserPlus" value={num(d.summary.newPatients)} subtitle="First visit with you in this period" info={DEFS.newPatients} stale={stale} />
            <KpiCard
              title="Booking answers"
              icon="FiMessageCircle"
              tone="info"
              value={num(d.bookingAnswersInPeriod)}
              subtitle={`Bookings that answered "How did you hear about us?"`}
              info={DEFS.bookingAnswers}
              stale={stale}
            />
            <KpiCard
              title="New patients, all time"
              icon="FiUsers"
              tone="primary"
              value={num(d.allTime.newPatients)}
              subtitle={`${plural(d.allTime.groups.find((g) => g.group === "not_captured")?.count ?? 0, "patient")} not asked`}
              stale={stale}
            />
          </>
        )}
      </KpiSection>

      {d && !failed && (
        <Stack component="section" spacing={1.25} aria-label="Sources">
          <KpiGrid columns={{ xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }}>
            {groups.map((g) => (
              <KpiCard
                key={g.key}
                title={g.label}
                icon={ICONS[g.key as AcqSeriesKey]}
                tone="secondary"
                value={num(g.count)}
                subtitle={`${pctText(g.percent)} of new patients · ${num(g.previous)} in the previous period`}
                comparison={{ value: g.change }}
                caption={<SourceList g={g} />}
                info={g.key === "other" ? DEFS.acquisitionOther : DEFS.acquisition}
                stale={stale}
              />
            ))}
          </KpiGrid>
        </Stack>
      )}

      <Box sx={CHART_GRID}>
        <ChartCard title="This period" subtitle={`New patients by source, ${rangeLabel(range)}`} {...chart}>
          {d && <DonutChart items={slices(d.summary)} centerLabel="new patients" emptyText="No new patients in this period" />}
        </ChartCard>
        <ChartCard title="All time" subtitle="Every patient's original source with you" {...chart}>
          {d && <DonutChart items={slices(d.allTime)} centerLabel="patients" emptyText="No patients yet" />}
        </ChartCard>
        <ChartCard title="New patients by source" subtitle="Stacked by source, per period" {...chart}>
          {d && (
            <SeriesChart
              data={d.monthly.map(foldPoint)}
              granularity={d.granularity}
              emptyText="No new patients in this period"
              series={ACQ_SERIES.map((s) => ({ key: s.key, label: s.label, color: acqColor(c, s.key), stack: "a" }))}
            />
          )}
        </ChartCard>
        <ChartCard title="New vs returning" subtitle="Unique patients seen per period" {...chart}>
          {d && (
            <SeriesChart
              data={d.newVsReturning}
              granularity={d.granularity}
              emptyText="No patients seen in this period"
              series={[
                { key: "new", label: "New", color: c.pair[0], stack: "p" },
                { key: "returning", label: "Returning", color: c.pair[1], stack: "p" },
              ]}
            />
          )}
        </ChartCard>
      </Box>
    </ExploreShell>
  );
}
