"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/feedback";

export interface TrendPoint {
  /** Already-formatted axis label. The caller maps opaque bucket keys. */
  label: string;
  value: number;
}

export interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
  color?: "primary" | "secondary" | "success";
  /** Format the Y axis / tooltip value. */
  format?: (v: number) => string;
  /** Shown when every point is zero — a flat line at zero reads as "broken". */
  zeroLabel?: string;
}

/**
 * Theme-aware area chart for dashboard trends (earnings, revenue).
 *
 * Takes `{ label, value }` rather than the old `{ month, value }`: the series
 * can now be bucketed by day, and the caller owns turning an opaque IST bucket
 * key into a human label.
 */
export function TrendChart({
  data,
  height = 260,
  color = "primary",
  format,
  zeroLabel = "No activity in this period",
}: TrendChartProps) {
  const theme = useTheme();
  const stroke = theme.palette[color].main;
  const gradientId = `dash-${color}`;
  const fmt = format ?? ((v: number) => String(v));

  // The server zero-fills, so this shouldn't happen — but a chart component has
  // no business assuming its caller got that right.
  if (!data.length) {
    return <EmptyState icon="FiTrendingUp" title="Nothing to chart" description="No data for this period." />;
  }

  const allZero = data.every((d) => d.value === 0);

  return (
    <Box sx={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.12} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} axisLine={false} width={52} tickFormatter={fmt} />
          <Tooltip
            formatter={(value) => fmt(Number(value))}
            contentStyle={{
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.tokens.radius.sm,
              color: theme.palette.text.primary,
            }}
          />
          <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2.5} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>

      {/* A flat line pinned to zero, with no explanation, looks like a bug.
          Keep the axes (they carry the range) and say what's going on. */}
      {allZero && (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <Typography variant="body2" color="text.secondary">
            {zeroLabel}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
