"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num, pctOf } from "../format";
import { bucketTick } from "../range";
import type { Granularity } from "../types";
import { useChartColors } from "./chartColors";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  kind?: "bar" | "line" | "area";
  /** Bars sharing a stack id are stacked. */
  stack?: string;
}

/** Legend: a swatch beside text-token ink (text never wears the series colour). */
export function ChartLegend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <Stack direction="row" component="ul" sx={{ flexWrap: "wrap", columnGap: 1.75, rowGap: 0.5, m: 0, p: 0, listStyle: "none" }}>
      {items.map((i) => (
        <Stack key={i.label} component="li" direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box
            aria-hidden
            sx={{ width: i.line ? 14 : 10, height: i.line ? 3 : 10, borderRadius: i.line ? 2 : 0.5, bgcolor: i.color, flexShrink: 0 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {i.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

type Row = { bucket: string };

export interface SeriesChartProps {
  data: Row[];
  series: SeriesDef[];
  granularity?: Granularity;
  format?: (v: number) => string;
  height?: number;
  /** Shown over the axes when every value is zero / missing. */
  emptyText?: string;
  /** Allow fractional Y ticks (averages). Counts and rupees stay whole. */
  decimals?: boolean;
}

/**
 * Bars, lines and areas over IST buckets on ONE value axis (never dual-axis —
 * a second measure of a different scale gets its own chart). The server
 * zero-fills buckets, so the data is charted as-is.
 */
export function SeriesChart({ data, series, granularity, format, height = 240, emptyText = "No activity in this period", decimals = false }: SeriesChartProps) {
  const c = useChartColors();
  const fmt = format ?? ((v: number) => num(v));
  const empty = !data.length || data.every((row) => series.every((s) => !Number((row as Record<string, unknown>)[s.key] ?? 0)));
  // Only the top segment of a stack gets the rounded data-end.
  const lastInStack = new Map<string, string>();
  series.forEach((s) => s.stack && lastInStack.set(s.stack, s.key));

  return (
    <Stack spacing={1}>
      {series.length > 1 && <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color, line: s.kind === "line" }))} />}
      <Box sx={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
            <XAxis
              dataKey="bucket"
              tickFormatter={(b: string) => bucketTick(b, granularity)}
              stroke={c.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={14}
            />
            <YAxis stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} width={52} tickFormatter={fmt} allowDecimals={decimals} />
            <Tooltip
              cursor={{ fill: c.grid, fillOpacity: 0.35 }}
              labelFormatter={(b) => bucketTick(String(b), granularity)}
              formatter={(v) => (v == null ? "—" : fmt(Number(v)))}
              contentStyle={{
                background: c.surface,
                border: `1px solid ${c.grid}`,
                borderRadius: c.radius,
                color: c.text,
                fontSize: 12,
              }}
            />
            {series.map((s) => {
              const kind = s.kind ?? "bar";
              if (kind === "line") {
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
                    connectNulls
                  />
                );
              }
              if (kind === "area") {
                return (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={s.color}
                    fillOpacity={0.1}
                    activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
                  />
                );
              }
              const top = !s.stack || lastInStack.get(s.stack) === s.key;
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  stackId={s.stack}
                  maxBarSize={24}
                  radius={top ? [4, 4, 0, 0] : 0}
                  // The 2px surface gap between stacked segments.
                  stroke={s.stack ? c.surface : undefined}
                  strokeWidth={s.stack ? 1 : 0}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
        {empty && (
          <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <Typography variant="body2" color="text.secondary" sx={{ bgcolor: "background.paper", px: 1, borderRadius: 1 }}>
              {emptyText}
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
}

export interface DonutItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Part-to-whole with the legend carrying every count and share. */
export function DonutChart({
  items,
  centerLabel,
  emptyText = "Nothing to show for this period",
  format = (v: number) => num(v),
}: {
  items: DonutItem[];
  centerLabel?: string;
  emptyText?: string;
  format?: (v: number) => string;
}) {
  const c = useChartColors();
  const total = items.reduce((a, i) => a + i.value, 0);
  if (total === 0) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 160 }}>
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      </Box>
    );
  }
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
      <Box sx={{ position: "relative", width: 168, height: 168, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items.filter((i) => i.value > 0)}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={items.filter((i) => i.value > 0).length > 1 ? 2 : 0}
              stroke={c.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {items
                .filter((i) => i.value > 0)
                .map((i) => (
                  <Cell key={i.key} fill={i.color} />
                ))}
            </Pie>
            <Tooltip
              formatter={(v) => format(Number(v))}
              contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: c.radius, color: c.text, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>{format(total)}</Typography>
            {centerLabel && (
              <Typography variant="caption" color="text.secondary">
                {centerLabel}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Stack component="ul" spacing={0.6} sx={{ m: 0, p: 0, listStyle: "none", flex: 1, minWidth: 0, width: "100%" }}>
        {items.map((i) => (
          <Stack key={i.key} component="li" direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: i.color, flexShrink: 0 }} />
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {i.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {format(i.value)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 44, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {num(pctOf(i.value, total))}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

/** A tiny trend line inside a KPI card. Flat / empty series render nothing. */
export function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${26 - ((v - min) / span) * 24}`).join(" ");
  return (
    <Box component="svg" viewBox="0 0 100 28" preserveAspectRatio="none" role="img" aria-label={label} sx={{ width: "100%", height: 28, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </Box>
  );
}
