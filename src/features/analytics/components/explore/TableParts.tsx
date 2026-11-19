"use client";

import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { EmptyState, ErrorState } from "@/components/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { num } from "../../format";

/** Table body placeholder / error / empty rows spanning every column. */
export function TableStatus({
  columns,
  loading,
  error,
  empty,
  onRetry,
  emptyTitle,
  emptyText,
}: {
  columns: number;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: columns }).map((__, j) => (
              <TableCell key={j}>
                <Skeleton />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    );
  }
  if (error || empty) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={columns} sx={{ borderBottom: 0 }}>
            {error ? (
              <ErrorState description="We couldn't load this table." onRetry={onRetry} sx={{ py: 3 }} />
            ) : (
              <EmptyState icon="FiInbox" title={emptyTitle} description={emptyText} sx={{ py: 3 }} />
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }
  return null;
}

export function TableFooter({ page, limit, total, totalPages, onPage }: { page: number; limit: number; total: number; totalPages: number; onPage: (p: number) => void }) {
  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
      <Typography variant="caption" color="text.secondary">
        {total ? `Showing ${num(first)}–${num(last)} of ${num(total)}` : "No rows"}
      </Typography>
      <Pagination count={totalPages} page={page} onChange={onPage} />
    </Stack>
  );
}

/** Header cell style shared by the analytics tables. */
export const HEAD_SX = { fontWeight: 700, whiteSpace: "nowrap", color: "text.secondary", fontSize: 12 } as const;
