"use client";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback";
import { formatCompactNumber, formatCurrency } from "@/utils/format";
import { EarningsLedger } from "./EarningsLedger";
import { TrendChart } from "./TrendChart";
import { useEarningsSeries, useEarningsSummary } from "../hooks";
import { PERIOD_KEYS, PERIOD_LABELS, bucketLabel, periodFor, type PeriodKey } from "../periods";

/** One headline figure. `value` is pre-formatted so absence renders as "—". */
function Tile({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant={strong ? "h4" : "h5"} sx={{ fontWeight: 700, mt: 0.25 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function TileSkeletons() {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Grid key={i} size={{ xs: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="70%" height={40} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * The doctor's earnings module — real money, from `payments`.
 *
 * Everything on this page used to be fabricated: a hardcoded six-month series
 * and a bare `₹38,000` "Next payout" literal with no table behind it. Four
 * decisions replaced it:
 *
 *   1. NET is the headline; gross is secondary. The doctor is paid net, and a
 *      large gross figure is money they budget against but never receive.
 *   2. Commission is SHOWN, not hidden. A platform that takes a cut and doesn't
 *      display it invites the support ticket.
 *   3. There is NO "Next payout" card. No `payouts` table exists and Razorpay
 *      Route settlement isn't wired, so the platform does not record what it owes
 *      a doctor. What ships instead is "Awaiting collection" — real cash owed by
 *      PATIENTS at the clinic — labelled as exactly that.
 *   4. The ledger below makes the total auditable.
 */
export function EarningsView() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("6m");
  const period = useMemo(() => periodFor(periodKey), [periodKey]);

  const summary = useEarningsSummary(period);
  const series = useEarningsSeries(period);

  const points = (series.data?.buckets ?? []).map((b) => ({
    label: bucketLabel(b.bucket),
    value: b.net,
  }));

  const s = summary.data;
  const commissionPct =
    s && s.gross > 0 ? `${Math.round((s.commission / s.gross) * 100)}% of gross` : undefined;

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Earnings
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={periodKey}
          onChange={(_e, v: PeriodKey | null) => v && setPeriodKey(v)}
        >
          {PERIOD_KEYS.map((k) => (
            <ToggleButton key={k} value={k}>
              {PERIOD_LABELS[k]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {/* A failed fetch must never render ₹0 — indistinguishable from a real
          zero, and far more alarming. Branch before reading `summary.data`. */}
      {summary.isError ? (
        <ErrorState onRetry={() => summary.refetch()} />
      ) : summary.isLoading || !s ? (
        <TileSkeletons />
      ) : (
        <>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Tile strong label="Net earnings" value={formatCurrency(s.net)} hint="What you're paid" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Tile label="Gross" value={formatCurrency(s.gross)} hint="Charged to patients" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Tile label="Platform commission" value={formatCurrency(s.commission)} hint={commissionPct} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Tile
                label="Consults paid"
                value={String(s.consults)}
                // null at zero consults — render "—", never ₹NaN and never ₹0.
                hint={s.averagePerConsult == null ? "—" : `avg ${formatCurrency(s.averagePerConsult)}`}
              />
            </Grid>
          </Grid>

          {s.refunded > 0 && (
            <Alert severity="info" variant="outlined">
              {formatCurrency(s.refunded)} refunded in this period. Refunds are counted when they&apos;re
              issued, so an earlier month&apos;s totals stay as they were reported.
            </Alert>
          )}

          {s.awaitingCollection > 0 && (
            <Alert severity="warning" variant="outlined">
              <strong>Awaiting collection: {formatCurrency(s.awaitingCollection)}</strong> — cash owed
              by patients at your clinic, not yet marked paid. This is not a platform payout; automatic
              settlement isn&apos;t live yet.
            </Alert>
          )}
        </>
      )}

      <Card>
        <CardHeader title="Net earnings trend" subheader="After platform commission" />
        <CardContent>
          {series.isError ? (
            <ErrorState onRetry={() => series.refetch()} />
          ) : series.isLoading ? (
            <Skeleton variant="rectangular" height={260} />
          ) : (
            <TrendChart
              data={points}
              color="success"
              format={(v) => `₹${formatCompactNumber(v)}`}
              zeroLabel="No earnings in this period"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Transactions" subheader="Every paid consult, so the totals above add up" />
        <CardContent>
          <EarningsLedger period={period} />
        </CardContent>
      </Card>
    </Stack>
  );
}
