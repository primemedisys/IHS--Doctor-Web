"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import type { Theme } from "@mui/material/styles";
import type { VitalStatus, VitalStatusInfo } from "@/types/appointment";

/**
 * Presentation ONLY. Every threshold lives in the backend
 * (`config/vitalsRanges.js`) and arrives on the wire — if a clinical number
 * ever appears in this file, the implementation has gone wrong: the same table
 * renders in the patient and doctor apps, and two copies would eventually
 * disagree about one reading.
 *
 * Severity, not direction (docs/vitals-reference-ranges §3): a dangerously LOW
 * SpO₂ or temperature is `critical` and therefore RED, because painting an
 * emergency the same calm blue as an athlete's resting pulse would mislead.
 */
const STYLE: Record<
  VitalStatus,
  { color: (t: Theme) => string; arrow: "↑" | "↓" | null; weight: number; ring: boolean }
> = {
  // `unknown` deliberately renders EXACTLY like `normal` — it means "not
  // evaluated", and must never read as a verdict.
  normal: { color: (t) => t.palette.text.primary, arrow: null, weight: 400, ring: false },
  unknown: { color: (t) => t.palette.text.primary, arrow: null, weight: 400, ring: false },
  low: { color: (t) => t.palette.info.main, arrow: "↓", weight: 700, ring: false },
  borderline: { color: (t) => t.palette.warning.main, arrow: null, weight: 700, ring: false },
  high: { color: (t) => t.palette.error.main, arrow: "↑", weight: 700, ring: false },
  critical: { color: (t) => t.palette.error.main, arrow: null, weight: 800, ring: true },
};

/** Human range for the tooltip, e.g. "normal is 60–100 bpm" / "normal is < 130/85". */
function rangeText(info: VitalStatusInfo, unit: string): string | null {
  const n = info.normal;
  if (!n) return null;
  if (n.display) return `normal is ${n.display}`;
  if (n.min == null || n.max == null) return null;
  return `normal is ${n.min}–${n.max}${unit ? ` ${unit}` : ""}`;
}

export interface VitalValueCellProps {
  value: number | string | null;
  unit?: string;
  status?: VitalStatusInfo;
}

/**
 * One vitals value with its band. The arrow is NOT decoration: colour alone
 * fails WCAG 1.4.1, and roughly 1 in 12 men has a red–green deficiency, so
 * direction must survive without it.
 */
export function VitalValueCell({ value, unit = "", status }: VitalValueCellProps) {
  const empty = value == null || value === "";
  const info = status ?? { status: "unknown" as const };
  const s = STYLE[info.status] ?? STYLE.unknown;
  const plain = info.status === "normal" || info.status === "unknown";

  if (empty) return <Box component="span" sx={{ color: "text.disabled" }}>—</Box>;

  const body = (
    <Box
      component="span"
      sx={{
        color: s.color,
        fontWeight: s.weight,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        // A ring, not just heavier red — `critical` must be distinguishable
        // from `high` without relying on font weight alone.
        ...(s.ring && {
          px: 0.75,
          py: 0.1,
          borderRadius: 1,
          border: 1,
          borderColor: "error.main",
        }),
      }}
    >
      {String(value)}
      {s.arrow && (
        <Box component="span" aria-hidden sx={{ fontSize: "0.9em", lineHeight: 1 }}>
          {s.arrow}
        </Box>
      )}
      {info.status === "critical" && (
        <Box component="span" aria-hidden sx={{ fontSize: "0.85em", lineHeight: 1 }}>
          ⚠
        </Box>
      )}
    </Box>
  );

  // Nothing to explain for a normal or un-evaluated reading — a tooltip on
  // every cell is noise that trains people to ignore the ones that matter.
  if (plain) return body;

  const range = rangeText(info, unit);
  const label = [info.label, range].filter(Boolean).join(" — ");

  return (
    <Tooltip title={label || "Outside the usual range"}>
      <Box component="span" aria-label={`${value} ${unit} — ${label}`}>
        {body}
      </Box>
    </Tooltip>
  );
}

/** The five bands, for the legend under the table. */
export const VITAL_LEGEND: { status: VitalStatus; label: string }[] = [
  { status: "normal", label: "Normal" },
  { status: "low", label: "Below range" },
  { status: "borderline", label: "Borderline" },
  { status: "high", label: "Above range" },
  { status: "critical", label: "Needs attention" },
];

export { STYLE as VITAL_STATUS_STYLE };
