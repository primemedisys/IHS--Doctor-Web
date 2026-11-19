"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { chipColors, dueLabel, followUpDateLabel, isOverdue } from "../format";
import type { PatientFollowUp } from "@/types/followUp";

/**
 * A patient's follow-up, wherever it is shown — the board, the roster, the
 * composer. ONE definition, so the doctor's colour means the same thing on
 * every screen.
 *
 * The label is always rendered as TEXT, never colour alone: the hue is the
 * doctor's own and carries no meaning the app can rely on, and colour-only
 * encoding fails WCAG 1.4.1 regardless.
 */
export function FollowUpChip({
  followUp,
  showDate = true,
  size = "medium",
}: {
  followUp: PatientFollowUp | null | undefined;
  showDate?: boolean;
  size?: "small" | "medium";
}) {
  if (!followUp?.status) {
    return (
      <Box component="span" sx={{ color: "text.disabled", fontSize: 13 }}>
        —
      </Box>
    );
  }

  const { status, followUpOn, note } = followUp;
  const date = followUpDateLabel(followUpOn);
  const due = dueLabel(followUpOn);
  const overdue = isOverdue(followUpOn);
  const small = size === "small";

  const chip = (
    <Box sx={{ minWidth: 0 }}>
      <Box
        component="span"
        sx={(t) => {
          const c = chipColors(t, status.colorHex);
          return {
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: small ? 1 : 1.125,
            py: small ? 0.25 : 0.5,
            borderRadius: `${t.tokens.radius.pill}px`,
            border: 1,
            borderColor: c.line,
            bgcolor: c.soft,
            color: c.ink,
            fontSize: small ? 11.5 : 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            // An archived status still renders on the patients that carry it —
            // hiding it would blank the column for them with no explanation.
            opacity: status.isActive ? 1 : 0.65,
          };
        }}
      >
        <Box
          component="span"
          sx={(t) => ({
            width: 7,
            height: 7,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: chipColors(t, status.colorHex).solid,
          })}
        />
        {status.label}
      </Box>

      {/* The date is half the fact — "OPD FU" alone doesn't say when. When none
          was set it says so, rather than leaving a gap that reads as a
          rendering fault. */}
      {showDate && (
        <Typography
          sx={{
            mt: 0.25,
            fontSize: 11.5,
            fontWeight: overdue ? 700 : 500,
            color: overdue ? "error.main" : date ? "text.secondary" : "text.disabled",
            fontStyle: date ? "normal" : "italic",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {date ? `${date}${due ? ` · ${due}` : ""}` : "no date set"}
        </Typography>
      )}
    </Box>
  );

  const hint = [
    note,
    status.isActive ? null : "This status has been archived",
    !date ? "No follow-up date set" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return hint ? (
    <Tooltip title={hint} arrow>
      {chip}
    </Tooltip>
  ) : (
    chip
  );
}
