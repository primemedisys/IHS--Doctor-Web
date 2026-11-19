"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { instantLabel } from "@/features/emr/format";
import { DEFS } from "../../definitions";
import { inr, inrCompact, num, plural } from "../../format";
import { useFinancialAnalytics } from "../../hooks/useAnalytics";
import { useGranularity, useRangeState } from "../../hooks/useRangeState";
import { METHOD_LABEL, PAYMENT_STATUS, options } from "../../labels";
import { rangeLabel, type RangeValue } from "../../range";
import type { PaymentMethodKey, PaymentStatusKey } from "../../types";
import { useChartColors } from "../chartColors";
import { DonutChart, SeriesChart } from "../charts";
import { KpiCard } from "../KpiCard";
import { ChartCard, KpiSection } from "../KpiSection";
import { CHART_GRID, ExploreShell, FilterSelect, StatusChip, TableCard } from "./ExploreShell";
import { HEAD_SX, TableFooter, TableStatus } from "./TableParts";

const LIMIT = 20;
const HEADERS = ["Transaction", "Patient", "Booking", "Service", "Method", "Billed", "Collected", "Refunded", "Status", "Date"];
const MONEY_COLS = new Set(["Billed", "Collected", "Refunded"]);

export function FinancialAnalyticsView({ initialRange }: { initialRange: RangeValue }) {
  const c = useChartColors();
  const [range, setRangeRaw] = useRangeState(initialRange);
  const [granularity, setGranularity] = useGranularity(range);
  const [method, setMethod] = useState<PaymentMethodKey | "">("");
  const [status, setStatus] = useState<PaymentStatusKey | "">("");
  const [page, setPage] = useState(1);

  const q = useFinancialAnalytics({
    from: range.from,
    to: range.to,
    granularity,
    method: method || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  });
  const d = q.data;
  const s = d?.summary;
  const stale = q.isPlaceholderData;
  const failed = q.isError && !d;
  const retry = () => void q.refetch();
  const prevHint = d ? `Compared with ${rangeLabel({ from: d.period.previousFrom, to: d.period.previousTo })}` : undefined;

  const setRange = (r: RangeValue) => {
    setRangeRaw(r);
    setPage(1);
  };

  return (
    <ExploreShell
      title="Financial analytics"
      subtitle="Collections, your share after platform fee, refunds and money still owed at the clinic."
      range={range}
      onRange={setRange}
      granularity={d?.trend.granularity}
      onGranularity={setGranularity}
    >
      <Alert severity="info" variant="outlined" icon={<Icon name="FiInfo" size={18} />}>
        <strong>Collected</strong> = successful payments; refunded payments are excluded from collected and shown separately;{" "}
        <strong>pending</strong> = cash/UPI owed at the clinic.
      </Alert>

      <KpiSection id="financial-kpis" title="Summary" subtitle={rangeLabel(range)} loading={q.isLoading || !s} error={failed} onRetry={retry} skeletons={8}>
        {s && (
          <>
            <KpiCard
              title="Collected"
              icon="FiTrendingUp"
              tone="success"
              value={inr(s.period.collected)}
              comparison={{ value: s.growth, hint: `Previous period: ${inr(s.previous.collected)}. ${prevHint ?? ""}` }}
              subtitle={`${plural(s.period.transactions, "payment")}`}
              info={DEFS.collected}
              stale={stale}
            />
            <KpiCard
              title="You receive"
              icon="FiCreditCard"
              tone="success"
              value={inr(s.period.doctorNet)}
              subtitle={`Previous period: ${inr(s.previous.doctorNet)}`}
              info={DEFS.doctorNet}
              stale={stale}
            />
            <KpiCard title="Platform commission" icon="FiPercent" tone="secondary" value={inr(s.period.commission)} info={DEFS.commission} stale={stale} />
            <KpiCard
              title="Refunded"
              icon="FiCornerUpLeft"
              tone="error"
              value={inr(s.period.refunded)}
              subtitle={plural(s.period.refundCount, "refund")}
              info={DEFS.refunded}
              stale={stale}
            />
            <KpiCard
              title="Pending at clinic"
              icon="FiAlertCircle"
              tone="warning"
              value={inr(s.pending.amount)}
              subtitle={`${plural(s.pending.count, "payment")} outstanding now`}
              caption={s.pending.overdueAmount > 0 ? `${inr(s.pending.overdueAmount)} overdue (${plural(s.pending.overdueCount, "payment")})` : undefined}
              captionTone="warning"
              info={DEFS.pending}
              stale={stale}
            />
            <KpiCard
              title="Failed transactions"
              icon="FiSlash"
              tone="error"
              value={num(s.period.failedTransactions)}
              subtitle="Patient wasn't charged"
              info={DEFS.failed}
              stale={stale}
            />
            <KpiCard
              title="Average per completed consult"
              icon="FiDivide"
              tone="info"
              value={inr(s.period.averagePerCompletedConsult)}
              subtitle={s.period.averagePerCompletedConsult == null ? "No paid completed consultations yet" : undefined}
              info={DEFS.averagePerConsult}
              stale={stale}
            />
            <KpiCard
              title="By payment method"
              icon="FiLayers"
              tone="secondary"
              value={inr(s.period.methods.online + s.period.methods.cash + s.period.methods.upi)}
              subtitle={`Online ${inr(s.period.methods.online)} · Cash ${inr(s.period.methods.cash)} · UPI ${inr(s.period.methods.upi)}`}
              info={DEFS.methods}
              stale={stale}
            />
            <KpiCard title="Today" icon="FiSun" tone="info" value={inr(s.today)} subtitle="Collected today (IST)" stale={stale} />
            <KpiCard title="Last 7 days" icon="FiCalendar" tone="info" value={inr(s.last7Days)} subtitle="Including today" stale={stale} />
            <KpiCard title="Year to date" icon="FiBarChart2" tone="info" value={inr(s.yearToDate)} subtitle="Since 1 January" stale={stale} />
            <KpiCard
              title="Consultation revenue"
              icon="FiActivity"
              tone="secondary"
              value={inr(s.period.consultation.total)}
              subtitle={`Clinic ${inr(s.period.consultation.clinic)} · Video ${inr(s.period.consultation.video)}`}
              info={DEFS.consultationRevenue}
              stale={stale}
            />
            <KpiCard title="Procedure revenue" icon="FiTool" unavailable={s.procedureRevenue.available ? null : s.procedureRevenue} value={s.procedureRevenue.available ? inr(s.procedureRevenue.amount) : undefined} />
            <KpiCard title="Surgery revenue" icon="FiScissors" unavailable={s.surgeryRevenue.available ? null : s.surgeryRevenue} value={s.surgeryRevenue.available ? inr(s.surgeryRevenue.amount) : undefined} />
            <KpiCard title="Contract revenue" icon="FiBriefcase" unavailable={s.contractRevenue.available ? null : s.contractRevenue} value={s.contractRevenue.available ? inr(s.contractRevenue.amount) : undefined} />
          </>
        )}
      </KpiSection>

      <Box sx={{ ...CHART_GRID, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 1fr)" } }}>
        <ChartCard
          title="Revenue trend"
          subtitle="Collected, what you receive, and refunds (on the day issued)"
          action={
            <Button component={Link} href={ROUTES.dashboard.earnings} size="small" endIcon={<Icon name="FiArrowRight" size={14} />}>
              Earnings
            </Button>
          }
          loading={q.isLoading || !d}
          error={failed}
          onRetry={retry}
          stale={stale}
        >
          {d && (
            <SeriesChart
              data={d.trend.revenue}
              granularity={d.trend.granularity}
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
        <ChartCard title="Payment methods" subtitle="Collected in this period" loading={q.isLoading || !s} error={failed} onRetry={retry} stale={stale}>
          {s && (
            <DonutChart
              format={inr}
              centerLabel="collected"
              emptyText="Nothing collected in this period"
              items={[
                { key: "online", label: METHOD_LABEL.online, value: s.period.methods.online, color: c.categorical[0] },
                { key: "cash", label: METHOD_LABEL.cash, value: s.period.methods.cash, color: c.categorical[1] },
                { key: "upi", label: METHOD_LABEL.upi, value: s.period.methods.upi, color: c.categorical[2] },
              ]}
            />
          )}
        </ChartCard>
      </Box>

      <TableCard
        title="Transactions"
        subtitle="Payments dated by when money moved (paid / refunded), or when created if never settled"
        filters={
          <>
            <FilterSelect
              label="Method"
              value={method}
              options={options(METHOD_LABEL)}
              onChange={(v) => {
                setMethod(v);
                setPage(1);
              }}
            />
            <FilterSelect
              label="Status"
              value={status}
              options={options(PAYMENT_STATUS)}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
          </>
        }
        footer={d && d.total > 0 ? <TableFooter page={d.page} limit={d.limit} total={d.total} totalPages={d.totalPages} onPage={setPage} /> : undefined}
      >
        <TableContainer sx={{ overflowX: "auto", opacity: stale ? 0.6 : 1 }}>
          <Table size="small" sx={{ minWidth: 1040 }}>
            <TableHead>
              <TableRow>
                {HEADERS.map((h) => (
                  <TableCell key={h} sx={HEAD_SX} align={MONEY_COLS.has(h) ? "right" : "left"}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            {d && d.transactions.length > 0 ? (
              <TableBody>
                {d.transactions.map((t) => {
                  const st = PAYMENT_STATUS[t.status] ?? { label: t.status, tone: "default" as const };
                  return (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          #{t.id}
                        </Typography>
                        {t.gatewayReference && (
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                            {t.gatewayReference}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{t.patient?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Typography
                          component={Link}
                          href={`${ROUTES.dashboard.appointments}?appointment=${encodeURIComponent(t.bookingId)}`}
                          variant="body2"
                          sx={{ color: "primary.main", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
                        >
                          #{t.bookingId}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{t.serviceType}</TableCell>
                      <TableCell>{METHOD_LABEL[t.method] ?? t.method}</TableCell>
                      <TableCell align="right">{inr(t.billed)}</TableCell>
                      <TableCell align="right">{inr(t.collected)}</TableCell>
                      <TableCell align="right">{t.refunded ? inr(t.refunded) : "—"}</TableCell>
                      <TableCell>
                        <StatusChip label={st.label} tone={st.tone} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{instantLabel(t.date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ) : (
              <TableStatus
                columns={HEADERS.length}
                loading={q.isLoading}
                error={q.isError}
                empty={!!d && d.transactions.length === 0}
                onRetry={retry}
                emptyTitle="No transactions found"
                emptyText="Try another method, status or period."
              />
            )}
          </Table>
        </TableContainer>
      </TableCard>
    </ExploreShell>
  );
}
