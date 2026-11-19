"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import { AccentTile, type AccentKey } from "@/components/common/AccentTile";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { num } from "../format";
import { Sparkline } from "./charts";

export type KpiTone = "primary" | "secondary" | "success" | "warning" | "info" | "error";

/** Semantic tones keep their meaning colour; neutral tones take the icon's own accent. */
const KPI_TONE_ACCENT: Record<KpiTone, AccentKey | undefined> = {
  primary: undefined,
  secondary: undefined,
  info: undefined,
  success: "green",
  warning: "orange",
  error: "red",
};

/** The whole KPI card takes a pastel tone (not just its icon tile). */
const KPI_CARD_TONE: Record<KpiTone, CardTone> = {
  primary: "blue",
  secondary: "blue",
  success: "green",
  warning: "orange",
  info: "teal",
  error: "red",
};

export interface KpiComparison {
  /** % change vs the previous equal-length period; null = nothing to compare with (hidden). */
  value: number | null;
  /** A rise is bad (cancellations, overdue): flip the colours. */
  invert?: boolean;
  /** Tooltip, e.g. the previous period's dates. */
  hint?: string;
}

export interface KpiCardProps {
  title: string;
  icon: string;
  tone?: KpiTone;
  /** Pre-formatted. Never pass 0 for a metric that isn't recorded — use `unavailable`. */
  value?: ReactNode;
  subtitle?: ReactNode;
  caption?: ReactNode;
  captionTone?: "warning" | "error" | "success";
  comparison?: KpiComparison;
  sparkline?: number[];
  href?: string;
  linkLabel?: string;
  /** "How is this calculated?" */
  info?: string;
  /** The metric isn't recorded by IHS: show "Not tracked yet" and the API's reason. */
  unavailable?: { reason: string } | null;
  /** Placeholder data from the previous range is on screen while the new one loads. */
  stale?: boolean;
}

function ComparisonChip({ value, invert, hint }: KpiComparison) {
  if (value == null) return null;
  const good = invert ? value < 0 : value > 0;
  const tone = value === 0 ? null : good ? "success" : "error";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const chip = (
    <Box
      component="span"
      sx={(t) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        px: 0.75,
        py: 0.125,
        borderRadius: `${t.tokens.radius.xs}px`,
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: tone ? `${tone}.main` : "text.secondary",
        bgcolor: tone ? alpha(t.palette[tone].main, 0.1) : "action.hover",
      })}
    >
      <Icon name={value > 0 ? "FiArrowUpRight" : value < 0 ? "FiArrowDownRight" : "FiMinus"} size={12} />
      {sign}
      {num(Math.abs(value))}% vs prev.
    </Box>
  );
  return hint ? (
    <Tooltip title={hint} placement="top">
      {chip}
    </Tooltip>
  ) : (
    chip
  );
}

/** Small (i) with the metric's definition — keyboard-focusable. */
export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip title={text} placement="top" arrow>
      <Box
        component="span"
        tabIndex={0}
        role="img"
        aria-label={`How is this calculated? ${text}`}
        sx={{ display: "inline-grid", placeItems: "center", color: "text.secondary", cursor: "help", flexShrink: 0, "&:hover": { color: "text.primary" } }}
      >
        <Icon name="FiInfo" size={14} />
      </Box>
    </Tooltip>
  );
}

/**
 * One KPI: title, big figure, context lines, optional "vs previous" chip and
 * sparkline, and an "Explore more" link to the section's detail page.
 */
export function KpiCard({
  title,
  icon,
  tone = "secondary",
  value,
  subtitle,
  caption,
  captionTone,
  comparison,
  sparkline,
  href,
  linkLabel = "Explore more",
  info,
  unavailable,
  stale,
}: KpiCardProps) {
  const off = !!unavailable;
  const card = CARD_TONES[KPI_CARD_TONE[tone]];
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        p: 1.5,
        height: "100%",
        minHeight: 140,
        minWidth: 0,
        borderRadius: `${t.tokens.radius.xl}px`,
        bgcolor: card.bg,
        borderColor: card.border,
        opacity: stale ? 0.6 : 1,
        transition: t.transitions.create("opacity", { duration: t.tokens.duration.fast }),
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
        <AccentTile
          icon={icon}
          size={34}
          iconSize={17}
          accent={off ? "grey" : KPI_TONE_ACCENT[tone]}
          sx={{ bgcolor: "rgba(255,255,255,0.7)", color: card.fg }}
        />
        <Typography variant="body2" component="h3" sx={{ fontWeight: 700, flex: 1, minWidth: 0, lineHeight: 1.3, color: card.heading }}>
          {title}
        </Typography>
        {info && <InfoTip text={info} />}
      </Stack>

      {unavailable ? (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: card.heading, lineHeight: 1.3 }}>Not tracked yet</Typography>
          <Tooltip title={unavailable.reason} placement="bottom-start">
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {unavailable.reason}
            </Typography>
          </Tooltip>
        </Box>
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap", rowGap: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 22, md: 24 }, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", color: card.heading }}>
            {value}
          </Typography>
          {comparison && <ComparisonChip {...comparison} />}
        </Stack>
      )}

      {subtitle && !off && (
        <Typography variant="body2" sx={{ lineHeight: 1.4, color: card.fg }}>
          {subtitle}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" component="p" sx={{ color: captionTone ? `${captionTone}.main` : card.fg, fontWeight: captionTone ? 600 : 400, lineHeight: 1.4 }}>
          {caption}
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />
      {sparkline && !off && <Sparkline values={sparkline} color={card.fg} label={`${title} trend`} />}
      {href && (
        <Typography
          component={Link}
          href={href}
          variant="caption"
          sx={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            fontWeight: 700,
            color: "primary.main",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {linkLabel}
          <Icon name="FiArrowRight" size={12} />
        </Typography>
      )}
    </Paper>
  );
}

export function KpiCardSkeleton() {
  return (
    <Paper variant="outlined" sx={(t) => ({ p: 1.5, minHeight: 140, borderRadius: `${t.tokens.radius.xl}px` })}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Skeleton variant="rounded" width={34} height={34} />
        <Skeleton width="55%" />
      </Stack>
      <Skeleton width="45%" height={40} sx={{ mt: 1 }} />
      <Skeleton width="80%" />
      <Skeleton width="35%" sx={{ mt: 2 }} />
    </Paper>
  );
}

/** 4 columns ≥lg, 2 on tablets, 1 on phones; rows stretch to equal height. */
export const KPI_GRID_COLUMNS = {
  xs: "minmax(0, 1fr)",
  sm: "repeat(2, minmax(0, 1fr))",
  lg: "repeat(4, minmax(0, 1fr))",
} as const;

export function KpiGrid({ children, columns = KPI_GRID_COLUMNS }: { children: ReactNode; columns?: Record<string, string> }) {
  return <Box sx={{ display: "grid", gap: 1.5, alignItems: "stretch", gridTemplateColumns: columns }}>{children}</Box>;
}
