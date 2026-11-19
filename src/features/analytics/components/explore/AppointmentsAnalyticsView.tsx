"use client";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { dayLabel, timeLabel } from "@/features/emr/format";
import { DEFS } from "../../definitions";
import { inr, num, pctText, plural } from "../../format";
import { useAppointmentsAnalytics } from "../../hooks/useAnalytics";
import { useGranularity, useRangeState } from "../../hooks/useRangeState";
import { BOOKING_STATUS, MODE_LABEL, PAYMENT_STATUS, options } from "../../labels";
import { rangeLabel, type RangeValue } from "../../range";
import type { BookingStatusKey, ConsultMode } from "../../types";
import { useChartColors } from "../chartColors";
import { DonutChart, SeriesChart } from "../charts";
import { KpiCard } from "../KpiCard";
import { ChartCard, KpiSection } from "../KpiSection";
import { CHART_GRID, ExploreShell, FilterSelect, StatusChip, TableCard } from "./ExploreShell";
import { HEAD_SX, TableFooter, TableStatus } from "./TableParts";

const LIMIT = 20;
const HEADERS = ["Date", "Token", "Patient", "Mode", "Clinic", "Status", "Rescheduled", "Consult", "Amount", "Payment"];

export function AppointmentsAnalyticsView({ initialRange }: { initialRange: RangeValue }) {
  const c = useChartColors();
  const router = useRouter();
  const [range, setRangeRaw] = useRangeState(initialRange);
  const [granularity, setGranularity] = useGranularity(range);
  const [status, setStatus] = useState<BookingStatusKey | "">("");
  const [mode, setMode] = useState<ConsultMode | "">("");
  const [page, setPage] = useState(1);

  const q = useAppointmentsAnalytics({
    from: range.from,
    to: range.to,
    granularity,
    status: status || undefined,
    mode: mode || undefined,
    page,
    limit: LIMIT,
  });
  const d = q.data;
  const s = d?.summary;
  const stale = q.isPlaceholderData;
  const failed = q.isError && !d;
  const retry = () => void q.refetch();

  const setRange = (r: RangeValue) => {
    setRangeRaw(r);
    setPage(1);
  };
  const open = (id: string) => router.push(`${ROUTES.dashboard.appointments}?appointment=${encodeURIComponent(id)}`);

  return (
    <ExploreShell
      title="Appointment analytics"
      subtitle="Bookings, completion, no-shows, consultation time and your clinic vs video mix."
      range={range}
      onRange={setRange}
      granularity={d?.trend.granularity}
      onGranularity={setGranularity}
    >
      <KpiSection id="appointments-kpis" title="Summary" subtitle={rangeLabel(range)} loading={q.isLoading || !s} error={failed} onRetry={retry} skeletons={8}>
        {s && (
          <>
            <KpiCard
              title="Total appointments"
              icon="FiCalendar"
              tone="info"
              value={num(s.period.total)}
              subtitle={`Clinic ${num(s.period.clinic)} (${pctText(s.period.clinicRate)}) · Video ${num(s.period.video)} (${pctText(s.period.videoRate)})`}
              info={DEFS.totalAppointments}
              stale={stale}
            />
            <KpiCard
              title="Completed"
              icon="FiCheckCircle"
              tone="success"
              value={num(s.period.completed)}
              subtitle={`${pctText(s.period.completionRate)} completion rate`}
              caption={`Clinic ${num(s.period.completedClinic)} · Video ${num(s.period.completedVideo)}`}
              info={DEFS.completed}
              stale={stale}
            />
            <KpiCard
              title="No-shows"
              icon="FiUserX"
              tone="warning"
              value={num(s.period.noShow)}
              subtitle={`${pctText(s.period.noShowRate)} no-show rate`}
              info={DEFS.noShow}
              stale={stale}
            />
            <KpiCard title="Cancelled" icon="FiXCircle" tone="error" value={num(s.period.cancelled)} subtitle="By you or the patient" info={DEFS.cancellations} stale={stale} />
            <KpiCard title="Rescheduled" icon="FiRefreshCw" tone="secondary" value={num(s.period.rescheduled)} subtitle="Moved to a new slot" info={DEFS.rescheduled} stale={stale} />
            <KpiCard
              title="Not marked complete"
              icon="FiAlertCircle"
              tone="warning"
              value={num(s.period.notMarkedComplete)}
              subtitle="Past confirmed appointments still open"
              info={DEFS.notMarkedComplete}
              stale={stale}
            />
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
              title="Waiting time"
              icon="FiWatch"
              tone="info"
              unavailable={s.waitingTime.available ? null : s.waitingTime}
              value={s.waitingTime.available ? `${num(s.waitingTime.averageMinutes)} min` : undefined}
            />
          </>
        )}
      </KpiSection>

      <Box sx={{ ...CHART_GRID, "& > :last-child": { gridColumn: { lg: "1 / -1" } } }}>
        <ChartCard title="Appointment trend" subtitle="By status" loading={q.isLoading || !d} error={failed} onRetry={retry} stale={stale}>
          {d && (
            <SeriesChart
              data={d.trend.appointments}
              granularity={d.trend.granularity}
              emptyText="No appointments in this period"
              series={[
                { key: "completed", label: "Completed", color: c.status.completed, stack: "s" },
                { key: "pending", label: "Pending", color: c.status.pending, stack: "s" },
                { key: "cancelled", label: "Cancelled", color: c.status.cancelled, stack: "s" },
                { key: "noShow", label: "No-show", color: c.status.noShow, stack: "s" },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title="Status breakdown" subtitle="Every appointment dated in this period" loading={q.isLoading || !s} error={failed} onRetry={retry} stale={stale}>
          {s && (
            <DonutChart
              centerLabel="appointments"
              emptyText="No appointments in this period"
              items={[
                { key: "completed", label: BOOKING_STATUS.completed.label, value: s.period.byStatus.completed, color: c.status.completed },
                { key: "confirmed", label: BOOKING_STATUS.confirmed.label, value: s.period.byStatus.confirmed, color: c.pair[0] },
                { key: "pending_payment", label: BOOKING_STATUS.pending_payment.label, value: s.period.byStatus.pending_payment, color: c.status.pending },
                { key: "cancelled", label: BOOKING_STATUS.cancelled.label, value: s.period.byStatus.cancelled, color: c.status.cancelled },
                { key: "no_show", label: BOOKING_STATUS.no_show.label, value: s.period.byStatus.no_show, color: c.status.noShow },
              ]}
            />
          )}
        </ChartCard>
        <ChartCard title="Clinic vs video" subtitle="Booked appointments (excl. cancelled) per period" loading={q.isLoading || !d} error={failed} onRetry={retry} stale={stale}>
          {d && (
            <SeriesChart
              data={d.trend.appointments}
              granularity={d.trend.granularity}
              emptyText="No appointments in this period"
              series={[
                { key: "clinic", label: "Clinic", color: c.pair[0], stack: "m" },
                { key: "video", label: "Video", color: c.pair[1], stack: "m" },
              ]}
            />
          )}
        </ChartCard>
      </Box>

      <TableCard
        title="Appointments"
        subtitle="Select a row to open the appointment"
        filters={
          <>
            <FilterSelect
              label="Status"
              value={status}
              options={options(BOOKING_STATUS)}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
            <FilterSelect
              label="Mode"
              value={mode}
              options={options(MODE_LABEL)}
              onChange={(v) => {
                setMode(v);
                setPage(1);
              }}
            />
          </>
        }
        footer={d && d.total > 0 ? <TableFooter page={d.page} limit={d.limit} total={d.total} totalPages={d.totalPages} onPage={setPage} /> : undefined}
      >
        <TableContainer sx={{ overflowX: "auto", opacity: stale ? 0.6 : 1 }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                {HEADERS.map((h) => (
                  <TableCell key={h} sx={HEAD_SX} align={h === "Consult" || h === "Amount" ? "right" : "left"}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            {d && d.appointments.length > 0 ? (
              <TableBody>
                {d.appointments.map((a) => {
                  const st = BOOKING_STATUS[a.status] ?? { label: a.status, tone: "default" as const };
                  const pay = a.paymentStatus ? PAYMENT_STATUS[a.paymentStatus] : null;
                  return (
                    <TableRow
                      key={a.id}
                      hover
                      tabIndex={0}
                      role="link"
                      aria-label={`Open appointment ${a.id}`}
                      onClick={() => open(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(a.id);
                        }
                      }}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2">{dayLabel(a.date)}</Typography>
                        {a.sessionStart && (
                          <Typography variant="caption" color="text.secondary">
                            {timeLabel(a.sessionStart)}
                            {a.sessionEnd ? `–${timeLabel(a.sessionEnd)}` : ""}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{a.token ?? "—"}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{a.patient?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                          <Icon name={a.mode === "video" ? "FiVideo" : "FiMapPin"} size={13} />
                          {MODE_LABEL[a.mode]}
                        </Box>
                      </TableCell>
                      <TableCell>{a.clinic?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusChip label={st.label} tone={st.tone} />
                      </TableCell>
                      <TableCell>{a.rescheduled ? "Yes" : "—"}</TableCell>
                      <TableCell align="right">{a.consultMinutes != null ? `${num(a.consultMinutes)} min` : "—"}</TableCell>
                      <TableCell align="right">{inr(a.amount)}</TableCell>
                      <TableCell>{pay ? <StatusChip label={pay.label} tone={pay.tone} /> : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ) : (
              <TableStatus
                columns={HEADERS.length}
                loading={q.isLoading}
                error={q.isError}
                empty={!!d && d.appointments.length === 0}
                onRetry={retry}
                emptyTitle="No appointments found"
                emptyText="Try another status, mode or period."
              />
            )}
          </Table>
        </TableContainer>
      </TableCard>
    </ExploreShell>
  );
}
