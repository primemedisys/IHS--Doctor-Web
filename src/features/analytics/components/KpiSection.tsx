"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { KPI_GRID_COLUMNS, KpiCardSkeleton, KpiGrid } from "./KpiCard";

export interface SectionState {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function SectionHeader({ id, title, subtitle, action }: { id?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography id={id} variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}

export function ExploreButton({ href, label = "Explore more" }: { href: string; label?: string }) {
  return (
    <Button component={Link} href={href} size="small" variant="outlined" endIcon={<Icon name="FiArrowRight" size={14} />}>
      {label}
    </Button>
  );
}

/**
 * A titled KPI block. Loading and errors are local to the section, so one
 * failing request never blanks the page — and a failure never renders as 0.
 */
export function KpiSection({
  id,
  title,
  subtitle,
  href,
  loading,
  error,
  onRetry,
  skeletons = 4,
  columns = KPI_GRID_COLUMNS,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  skeletons?: number;
  columns?: Record<string, string>;
  children?: ReactNode;
} & SectionState) {
  return (
    <Stack component="section" aria-labelledby={id} spacing={1.25}>
      <SectionHeader id={id} title={title} subtitle={subtitle} action={href ? <ExploreButton href={href} /> : undefined} />
      {error ? (
        <Paper variant="outlined" sx={(t) => ({ borderRadius: `${t.tokens.radius.xl}px` })}>
          <ErrorState description={`We couldn't load ${title.toLowerCase()}.`} onRetry={onRetry} sx={{ py: 3 }} />
        </Paper>
      ) : loading ? (
        <KpiGrid columns={columns}>
          {Array.from({ length: skeletons }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </KpiGrid>
      ) : (
        <KpiGrid columns={columns}>{children}</KpiGrid>
      )}
    </Stack>
  );
}

/** Card wrapper for a chart: header, then loading / error / content. */
export function ChartCard({
  title,
  subtitle,
  action,
  loading,
  error,
  onRetry,
  height = 240,
  stale,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  height?: number;
  stale?: boolean;
  children?: ReactNode;
} & SectionState) {
  return (
    <Paper variant="outlined" sx={(t) => ({ borderRadius: `${t.tokens.radius.xl}px`, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" })}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ px: 1.75, py: 1.1, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", minHeight: 52 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" component="p">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      <Box sx={{ px: 1.5, py: 1.5, flex: 1, minWidth: 0, opacity: stale ? 0.6 : 1 }}>
        {error ? (
          <ErrorState description="We couldn't load this chart." onRetry={onRetry} sx={{ py: 2 }} />
        ) : loading ? (
          <Skeleton variant="rounded" height={height} />
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}
