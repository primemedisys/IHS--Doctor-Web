"use client";

import Box from "@mui/material/Box";
import { DEFS } from "../../definitions";
import { num, pctText, plural } from "../../format";
import { useProductivityAnalytics } from "../../hooks/useAnalytics";
import { useGranularity, useRangeState } from "../../hooks/useRangeState";
import { rangeLabel, type RangeValue } from "../../range";
import { useChartColors } from "../chartColors";
import { SeriesChart } from "../charts";
import { KpiCard } from "../KpiCard";
import { ChartCard, KpiSection } from "../KpiSection";
import { CHART_GRID, ExploreShell } from "./ExploreShell";

export function ProductivityAnalyticsView({ initialRange }: { initialRange: RangeValue }) {
  const c = useChartColors();
  const [range, setRange] = useRangeState(initialRange);
  const [granularity, setGranularity] = useGranularity(range);
  const q = useProductivityAnalytics({ from: range.from, to: range.to, granularity });
  const d = q.data;
  const s = d?.summary;
  const stale = q.isPlaceholderData;
  const failed = q.isError && !d;
  const retry = () => void q.refetch();
  const chart = { loading: q.isLoading || !d, error: failed, onRetry: retry, stale };
  const anyMinutes = !!d && d.series.some((x) => x.averageMinutes != null);

  return (
    <ExploreShell
      title="Doctor productivity"
      subtitle="Daily workload, consultation time and how closely you keep to your schedule."
      range={range}
      onRange={setRange}
      granularity={d?.granularity}
      onGranularity={setGranularity}
    >
      <KpiSection id="productivity-kpis" title="Summary" subtitle={rangeLabel(range)} loading={q.isLoading || !s} error={failed} onRetry={retry} skeletons={8}>
        {s && (
          <>
            <KpiCard title="Patients per day" icon="FiUsers" tone="secondary" value={num(s.patientsPerDay)} subtitle="Per working day" info={DEFS.patientsPerDay} stale={stale} />
            <KpiCard
              title="Consultations per day"
              icon="FiActivity"
              tone="info"
              value={num(s.consultationsPerDay)}
              subtitle={`OPD ${num(s.opd)} · Video ${num(s.video)}`}
              info={DEFS.consultsPerDay}
              stale={stale}
            />
            <KpiCard title="Completed consultations" icon="FiCheckCircle" tone="success" value={num(s.consultations)} subtitle={`${pctText(s.completionRate)} completion rate`} info={DEFS.completionRate} stale={stale} />
            <KpiCard title="Working days" icon="FiCalendar" tone="primary" value={num(s.workingDays)} subtitle="Days with a completed consultation" info={DEFS.workingDays} stale={stale} />
            <KpiCard
              title="Average consultation time"
              icon="FiClock"
              tone="primary"
              unavailable={s.consultDuration.available ? null : s.consultDuration}
              value={s.consultDuration.available ? `${num(s.consultDuration.averageMinutes)} min` : undefined}
              subtitle={s.consultDuration.available ? `Measured on ${plural(s.consultDuration.measured, "consultation")}` : undefined}
              info={DEFS.consultDuration}
              stale={stale}
            />
            <KpiCard
              title="Schedule adherence"
              icon="FiTarget"
              tone="success"
              unavailable={s.scheduleAdherence.available ? null : s.scheduleAdherence}
              value={s.scheduleAdherence.available ? pctText(s.scheduleAdherence.rate) : undefined}
              subtitle={
                s.scheduleAdherence.available
                  ? `${num(s.scheduleAdherence.onTime)} of ${plural(s.scheduleAdherence.sessions, "session")} started within ${s.scheduleAdherence.toleranceMinutes} min`
                  : undefined
              }
              caption={
                s.scheduleAdherence.available && s.scheduleAdherence.averageStartDelayMinutes != null
                  ? `Average start delay ${num(s.scheduleAdherence.averageStartDelayMinutes)} min`
                  : undefined
              }
              info={DEFS.adherence}
              stale={stale}
            />
            <KpiCard
              title="Schedule utilization"
              icon="FiPieChart"
              tone="secondary"
              unavailable={s.utilization.available ? null : s.utilization}
              value={s.utilization.available ? pctText(s.utilization.rate) : undefined}
              subtitle={s.utilization.available ? `${num(s.utilization.booked)} booked of ${plural(s.utilization.capacity, "slot")}` : undefined}
              caption="Based on your current weekly schedule"
              info={DEFS.utilization}
              stale={stale}
            />
          </>
        )}
      </KpiSection>

      <Box sx={CHART_GRID}>
        <ChartCard title="Consultations and patients" subtitle="Completed consultations and unique patient-days" {...chart}>
          {d && (
            <SeriesChart
              data={d.series}
              granularity={d.granularity}
              emptyText="No completed consultations in this period"
              series={[
                { key: "consultations", label: "Consultations", color: c.pair[0] },
                { key: "patients", label: "Patients", color: c.pair[1] },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title="Clinic vs video" subtitle="Completed consultations by mode" {...chart}>
          {d && (
            <SeriesChart
              data={d.series}
              granularity={d.granularity}
              emptyText="No completed consultations in this period"
              series={[
                { key: "clinic", label: "Clinic (OPD)", color: c.pair[0], stack: "m" },
                { key: "video", label: "Video", color: c.pair[1], stack: "m" },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title="Consultations per working day" subtitle="Completed consultations ÷ working days in each period" {...chart}>
          {d && (
            <SeriesChart
              data={d.series}
              granularity={d.granularity}
              decimals
              emptyText="No completed consultations in this period"
              series={[{ key: "consultationsPerDay", label: "Per day", color: c.line, kind: "line" }]}
            />
          )}
        </ChartCard>
        <ChartCard title="Average consultation time" subtitle="Minutes, where a start and end were recorded" {...chart}>
          {d && (
            <SeriesChart
              data={d.series}
              granularity={d.granularity}
              decimals
              format={(v) => `${num(v)} min`}
              emptyText={anyMinutes ? "No timings in this period" : "No consultation in this period has a start and end time recorded"}
              series={[{ key: "averageMinutes", label: "Minutes", color: c.line, kind: "line" }]}
            />
          )}
        </ChartCard>
      </Box>
    </ExploreShell>
  );
}
