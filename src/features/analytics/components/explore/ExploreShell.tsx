"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import { PageTitle } from "@/components/typography";
import { ROUTES } from "@/constants/routes";
import { GranularityToggle, DateRangeFilter } from "../Filters";
import type { RangeValue } from "../../range";
import type { Granularity } from "../../types";

/**
 * Frame for every Explore More page: back link, title, period filter (and
 * granularity when the page has series), then the page body.
 */
export function ExploreShell({
  title,
  subtitle,
  range,
  onRange,
  granularity,
  onGranularity,
  children,
}: {
  title: string;
  subtitle: string;
  range: RangeValue;
  onRange: (r: RangeValue) => void;
  /** The granularity the server actually used (shown as selected). */
  granularity?: Granularity;
  onGranularity?: (g: Granularity) => void;
  children: ReactNode;
}) {
  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Box>
        <Button component={Link} href={ROUTES.dashboard.root} size="small" startIcon={<Icon name="FiArrowLeft" size={14} />} sx={{ ml: -1, mb: 0.5 }}>
          Overview
        </Button>
        <PageTitle title={title} subtitle={subtitle} />
      </Box>
      <Paper
        variant="outlined"
        sx={(t) => ({
          p: 1.5,
          borderRadius: `${t.tokens.radius.lg}px`,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 1.5,
          alignItems: { md: "center" },
          justifyContent: "space-between",
        })}
      >
        <DateRangeFilter value={range} onChange={onRange} />
        {onGranularity && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Chart by
            </Typography>
            <GranularityToggle value={granularity} range={range} onChange={onGranularity} />
          </Stack>
        )}
      </Paper>
      {children}
    </Stack>
  );
}

/** A labelled select for table filters; "" = all. */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T | "") => void;
  allLabel?: string;
}) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value as T | "")} sx={{ minWidth: 160 }}>
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export type ChipTone = "default" | "success" | "warning" | "error" | "info";

export function StatusChip({ label, tone }: { label: string; tone: ChipTone }) {
  return <Chip size="small" color={tone} variant={tone === "default" ? "outlined" : "filled"} label={label} sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: 11.5 } }} />;
}

/** Table frame: filters row, scrollable table, footer (count + pagination). */
export function TableCard({ title, subtitle, filters, footer, children }: { title: string; subtitle?: string; filters?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={(t) => ({ borderRadius: `${t.tokens.radius.lg}px`, overflow: "hidden", minWidth: 0 })}>
      <Stack spacing={1.25} sx={{ p: 1.75, borderBottom: 1, borderColor: "divider" }}>
        <Box>
          <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {filters && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            {filters}
          </Stack>
        )}
      </Stack>
      {children}
      {footer && <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>{footer}</Box>}
    </Paper>
  );
}

/** Two charts side by side on wide screens. */
export const CHART_GRID = { display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" } } as const;
