"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { useDoctorDashboardSummary } from "@/features/dashboard/hooks";
import { dayLabel } from "@/features/emr/format";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFS } from "../../definitions";
import { num, pctText, plural } from "../../format";
import { usePatientsAnalytics } from "../../hooks/useAnalytics";
import { useGranularity, useRangeState } from "../../hooks/useRangeState";
import { rangeLabel, type RangeValue } from "../../range";
import type { PatientSegment } from "../../types";
import { useChartColors } from "../chartColors";
import { SeriesChart } from "../charts";
import { KpiCard } from "../KpiCard";
import { ChartCard, KpiSection } from "../KpiSection";
import { ExploreShell, StatusChip, TableCard } from "./ExploreShell";
import { HEAD_SX, TableFooter, TableStatus } from "./TableParts";

const LIMIT = 20;
const SEGMENTS: { value: PatientSegment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "returning", label: "Returning" },
];

export function PatientsAnalyticsView({ initialRange }: { initialRange: RangeValue }) {
  const c = useChartColors();
  const [range, setRangeRaw] = useRangeState(initialRange);
  const [granularity, setGranularity] = useGranularity(range);
  const [segment, setSegment] = useState<PatientSegment>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const term = useDebounce(search.trim(), 400);

  const q = usePatientsAnalytics({ from: range.from, to: range.to, granularity, segment, search: term, page, limit: LIMIT });
  const allTime = useDoctorDashboardSummary();
  const d = q.data;
  const s = d?.summary;
  const stale = q.isPlaceholderData;

  const setRange = (r: RangeValue) => {
    setRangeRaw(r);
    setPage(1);
  };

  return (
    <ExploreShell
      title="Patient analytics"
      subtitle="Your patient base, new vs returning patients, and each patient's history with you."
      range={range}
      onRange={setRange}
      granularity={d?.timeline.granularity}
      onGranularity={setGranularity}
    >
      <KpiSection id="patients-kpis" title="Summary" subtitle={rangeLabel(range)} loading={q.isLoading || !s} error={q.isError && !s} onRetry={() => void q.refetch()} skeletons={8}>
        {s && (
          <>
            <KpiCard title="Total patients" icon="FiUsers" value={num(s.total)} subtitle="All time" info={DEFS.totalPatients} stale={stale} />
            <KpiCard
              title="Consulted patients"
              icon="FiUserCheck"
              tone="success"
              value={allTime.data ? num(allTime.data.consultedPatients) : "—"}
              subtitle="All time, with a completed consultation"
              info={DEFS.consulted}
            />
            <KpiCard
              title="Active patients"
              icon="FiActivity"
              tone="info"
              value={num(s.active)}
              subtitle={`Seen in the last ${s.activeWindowDays} days`}
              info={DEFS.activePatients}
              stale={stale}
            />
            <KpiCard
              title="New patients"
              icon="FiUserPlus"
              value={num(s.new)}
              comparison={{ value: s.newGrowth, hint: `${num(s.newPrevious)} in the previous period` }}
              subtitle={`${num(s.newPrevious)} in the previous period`}
              info={DEFS.newPatients}
              stale={stale}
            />
            <KpiCard
              title="Returning patients"
              icon="FiRepeat"
              tone="success"
              value={num(s.returning)}
              subtitle={`${pctText(s.returningPercent)} of patients seen`}
              info={DEFS.returning}
              stale={stale}
            />
            <KpiCard title="Patients seen" icon="FiEye" tone="info" value={num(s.seenInPeriod)} subtitle="In this period" info={DEFS.seenInPeriod} stale={stale} />
            <KpiCard
              title="Today's patients"
              icon="FiCalendar"
              tone="info"
              value={num(s.today.patients)}
              subtitle={`${num(s.today.completed)} completed · ${num(s.today.remaining)} remaining`}
              info={DEFS.todayPatients}
              stale={stale}
            />
            <KpiCard
              title="Cancellations"
              icon="FiXCircle"
              tone="error"
              value={num(s.cancellations.count)}
              subtitle={`${pctText(s.cancellations.rate)} of ${plural(s.cancellations.eligible, "booking")}`}
              info={DEFS.cancellations}
              stale={stale}
            />
          </>
        )}
      </KpiSection>

      <ChartCard
        title="New vs returning patients"
        subtitle="Unique patients seen per period, split by whether it was their first visit with you"
        loading={q.isLoading || !d}
        error={q.isError && !d}
        onRetry={() => void q.refetch()}
        stale={stale}
      >
        {d && (
          <SeriesChart
            data={d.timeline.patients}
            granularity={d.timeline.granularity}
            emptyText="No patients seen in this period"
            series={[
              { key: "new", label: "New", color: c.pair[0], stack: "p" },
              { key: "returning", label: "Returning", color: c.pair[1], stack: "p" },
            ]}
          />
        )}
      </ChartCard>

      <TableCard
        title="Patients"
        subtitle="Everyone with a booking dated in this period (visits and dates are all-time with you)"
        filters={
          <>
            <Tabs
              value={segment}
              onChange={(_e, v: PatientSegment) => {
                setSegment(v);
                setPage(1);
              }}
              sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0 } }}
            >
              {SEGMENTS.map((sg) => (
                <Tab key={sg.value} value={sg.value} label={sg.label} />
              ))}
            </Tabs>
            <Box sx={{ flex: 1 }} />
            <TextField
              size="small"
              placeholder="Search by name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon name="FiSearch" size={15} />
                    </InputAdornment>
                  ),
                },
                htmlInput: { "aria-label": "Search patients by name", maxLength: 100 },
              }}
              sx={{ minWidth: { sm: 240 } }}
            />
          </>
        }
        footer={d && d.total > 0 ? <TableFooter page={d.page} limit={d.limit} total={d.total} totalPages={d.totalPages} onPage={setPage} /> : undefined}
      >
        <TableContainer sx={{ overflowX: "auto", opacity: stale ? 0.6 : 1 }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {["Patient", "First visit", "Last visit", "Visits", "Completed", "Cancelled", "Upcoming", "Source", ""].map((h, i) => (
                  <TableCell key={i} sx={HEAD_SX} align={i >= 3 && i <= 5 ? "right" : "left"}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            {d && d.patients.length > 0 ? (
              <TableBody>
                {d.patients.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.registrationNumber}
                        {p.isNew ? " · " : ""}
                      </Typography>
                      {p.isNew && <StatusChip label="New" tone="info" />}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{dayLabel(p.firstVisit)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{dayLabel(p.lastVisit)}</TableCell>
                    <TableCell align="right">{num(p.visits)}</TableCell>
                    <TableCell align="right">{num(p.completed)}</TableCell>
                    <TableCell align="right">{num(p.cancelled)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{p.upcoming ? dayLabel(p.upcoming) : "—"}</TableCell>
                    <TableCell>{p.acquisitionSource?.label ?? "—"}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} href={ROUTES.dashboard.emrPatient(p.id)} size="small" variant="outlined">
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableStatus
                columns={9}
                loading={q.isLoading}
                error={q.isError}
                empty={!!d && d.patients.length === 0}
                onRetry={() => void q.refetch()}
                emptyTitle="No patients found"
                emptyText={term ? `No patient named "${term}" in this period.` : "No patients have a booking in this period."}
              />
            )}
          </Table>
        </TableContainer>
      </TableCard>
    </ExploreShell>
  );
}
