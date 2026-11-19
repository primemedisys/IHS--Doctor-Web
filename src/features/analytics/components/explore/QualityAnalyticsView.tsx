"use client";

import Box from "@mui/material/Box";
import { DEFS } from "../../definitions";
import { num, pctText, plural } from "../../format";
import { useQualityAnalytics } from "../../hooks/useAnalytics";
import { useGranularity, useRangeState } from "../../hooks/useRangeState";
import { rangeLabel, type RangeValue } from "../../range";
import { useChartColors } from "../chartColors";
import { SeriesChart } from "../charts";
import { KpiCard } from "../KpiCard";
import { ChartCard, KpiSection } from "../KpiSection";
import { CHART_GRID, ExploreShell } from "./ExploreShell";

export function QualityAnalyticsView({ initialRange }: { initialRange: RangeValue }) {
  const c = useChartColors();
  const [range, setRange] = useRangeState(initialRange);
  const [granularity, setGranularity] = useGranularity(range);
  const q = useQualityAnalytics({ from: range.from, to: range.to, granularity });
  const d = q.data;
  const s = d?.summary;
  const stale = q.isPlaceholderData;
  const failed = q.isError && !d;
  const retry = () => void q.refetch();
  const testimonials = s?.satisfaction.portfolioTestimonials?.count ?? 0;

  return (
    <ExploreShell
      title="Quality & clinical performance"
      subtitle="Clinical documentation, follow-up continuity and consultation completion."
      range={range}
      onRange={setRange}
      granularity={d?.granularity}
      onGranularity={setGranularity}
    >
      <KpiSection id="quality-kpis" title="Summary" subtitle={rangeLabel(range)} loading={q.isLoading || !s} error={failed} onRetry={retry} skeletons={8}>
        {s && (
          <>
            <KpiCard
              title="Clinical documentation"
              icon="FiFileText"
              tone="secondary"
              value={pctText(s.documentation.rate)}
              subtitle={`${num(s.documentation.withFinalizedPrescription)} of ${plural(s.documentation.completedConsultations, "consultation")} have a finalized prescription`}
              caption={s.documentation.missingPrescription > 0 ? `${plural(s.documentation.missingPrescription, "consultation")} without one` : undefined}
              captionTone="warning"
              info={DEFS.documentation}
              stale={stale}
            />
            <KpiCard
              title="Clinical notes"
              icon="FiEdit3"
              tone="info"
              value={num(s.documentation.withClinicalNote)}
              subtitle={`Completed consultations with a clinical note`}
              info={DEFS.documentation}
              stale={stale}
            />
            <KpiCard
              title="Follow-up compliance"
              icon="FiRotateCw"
              tone="success"
              value={pctText(s.followUp.rate)}
              subtitle={`${num(s.followUp.completed)} completed · ${num(s.followUp.pending)} pending · ${num(s.followUp.overdue)} overdue`}
              caption={`${plural(s.followUp.scheduled, "follow-up")} due in this period`}
              info={DEFS.followUp}
              stale={stale}
            />
            <KpiCard
              title="Completion rate"
              icon="FiCheckCircle"
              tone="success"
              value={pctText(s.completionRate)}
              subtitle="Of appointments that are over"
              info={DEFS.completionRate}
              stale={stale}
            />
            <KpiCard
              title="Overdue follow-ups"
              icon="FiAlertCircle"
              tone="warning"
              value={num(s.followUp.overdue)}
              subtitle="Due date passed with no completed visit since"
              info={DEFS.followUp}
              stale={stale}
            />
            <KpiCard
              title="Patient satisfaction"
              icon="FiStar"
              tone="warning"
              unavailable={s.satisfaction.available ? null : s.satisfaction}
              value={s.satisfaction.available ? num(s.satisfaction.averageRating) : undefined}
              caption={testimonials > 0 ? `${plural(testimonials, "testimonial")} on your profile (added by you)` : undefined}
            />
            <KpiCard
              title="Patient feedback"
              icon="FiMessageSquare"
              tone="info"
              unavailable={s.feedback.available ? null : s.feedback}
              value={s.feedback.available ? num(s.feedback.count) : undefined}
            />
            <KpiCard
              title="Waiting time"
              icon="FiWatch"
              tone="info"
              unavailable={s.waitingTime.available ? null : s.waitingTime}
              value={s.waitingTime.available ? `${num(s.waitingTime.averageMinutes)} min` : undefined}
            />
          </>
        )}
      </KpiSection>

      <Box sx={CHART_GRID}>
        <ChartCard title="Documentation" subtitle="Completed consultations vs those with a finalized prescription" loading={q.isLoading || !d} error={failed} onRetry={retry} stale={stale}>
          {d && (
            <SeriesChart
              data={d.documentation}
              granularity={d.granularity}
              emptyText="No completed consultations in this period"
              series={[
                { key: "completed", label: "Completed", color: c.pair[0] },
                { key: "documented", label: "With prescription", color: c.pair[1] },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title="Follow-ups" subtitle="By due date: scheduled, completed and overdue" loading={q.isLoading || !d} error={failed} onRetry={retry} stale={stale}>
          {d && (
            <SeriesChart
              data={d.followUps}
              granularity={d.granularity}
              emptyText="No follow-ups due in this period"
              series={[
                { key: "scheduled", label: "Scheduled", color: c.pair[0] },
                { key: "completed", label: "Completed", color: c.status.completed },
                { key: "overdue", label: "Overdue", color: c.status.pending },
              ]}
            />
          )}
        </ChartCard>
      </Box>
    </ExploreShell>
  );
}
