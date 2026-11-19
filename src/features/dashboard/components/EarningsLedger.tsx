"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/feedback";
import { formatCurrency, formatDate } from "@/utils/format";
import { useEarningsTransactions } from "../hooks";
import type { Period } from "@/types/dashboard";

/**
 * The per-consult earnings ledger.
 *
 * This table exists so the headline "Net earnings" figure is AUDITABLE: a doctor
 * who distrusts it can page through the rows and add them up. Summing `net`
 * across every page equals the summary's `net` for the same range — that
 * invariant is the acceptance test for the whole earnings module.
 */
export function EarningsLedger({ period }: { period: Period }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData, refetch } = useEarningsTransactions(period, page);

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (isLoading && !data) {
    return (
      <Stack spacing={1}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={44} />
        ))}
      </Stack>
    );
  }

  const rows = data?.rows ?? [];
  if (!rows.length) {
    return (
      <EmptyState
        icon="FiFileText"
        title="No paid consults in this period"
        description="Each successful payment appears here with its commission and your net."
      />
    );
  }

  return (
    <Stack spacing={2}>
      {/* Dim, don't unmount, while the next page loads: keepPreviousData holds
          the rows so the table doesn't flash empty and collapse the page. */}
      <TableContainer sx={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 120ms" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Patient</TableCell>
              {/* "Payment", not "Type": this is the PAYMENT mode (online|offline),
                  not the booking mode (video|clinic). A clinic visit can be paid
                  online, and labelling it "Type" makes a doctor read their video
                  consults as clinic visits. */}
              <TableCell>Payment</TableCell>
              <TableCell align="right">Gross</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell align="right">Net</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.date ? formatDate(r.date) : formatDate(r.paidAt)}</TableCell>
                <TableCell>{r.patientName ?? "—"}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={r.mode === "online" ? "Online" : "At clinic"}
                    color={r.mode === "online" ? "primary" : "default"}
                  />
                </TableCell>
                <TableCell align="right">{formatCurrency(r.gross)}</TableCell>
                <TableCell align="right" sx={{ color: "text.secondary" }}>
                  −{formatCurrency(r.commission)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(r.net)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {data ? `${data.total} paid consult${data.total === 1 ? "" : "s"}` : ""}
        </Typography>
        {data && data.totalPages > 1 && (
          <Pagination
            count={data.totalPages}
            page={page}
            onChange={(_e, p) => setPage(p)}
            size="small"
          />
        )}
      </Box>
    </Stack>
  );
}
