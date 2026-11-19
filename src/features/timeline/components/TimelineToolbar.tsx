"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { type Theme } from "@mui/material/styles";
import { FiX } from "react-icons/fi";
import type { TimelineFilters, TimelineSort } from "@/types/timeline";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Most years the Year filter will ever offer — a guard against a bad stored date. */
const MAX_YEARS = 40;

export interface TimelineToolbarProps {
  filters: TimelineFilters;
  /** Years the patient actually has consultations in (from the API). */
  years: number[];
  total: number;
  onChange: (next: TimelineFilters) => void;
}

/**
 * Year · Month · Sort, on one bar. The `years` list comes from the server and
 * covers the WHOLE history — deriving it from the loaded rows would hide any
 * year beyond the row cap.
 *
 * The three selects are one sizing rule and their labels are always shrunk.
 * Before, an unset Year/Month showed its label sitting inside the box like
 * placeholder text while the always-set Sort showed a floating label, so three
 * identical controls read as three different kinds of field — and at narrow
 * widths they wrapped into a ragged stagger because the row both wrapped and
 * space-between'd. They now share a flex basis and wrap as a tidy grid.
 */
export function TimelineToolbar({ filters, years, total, onChange }: TimelineToolbarProps) {
  const isFiltered = Boolean(filters.year || filters.month);

  /**
   * A CONTINUOUS run of years, newest first — every year from the earliest
   * consultation through to this one, not just the years that happen to hold
   * data.
   *
   * Listing only years with consultations made the dropdown collapse to one or
   * two entries and left holes mid-history, so a gap year read as "that year is
   * missing from your records" rather than "nothing happened then". A year with
   * no consultations is still selectable and lands on the page's existing
   * "No consultations in this period" empty state, which says so plainly.
   *
   * Bounded at BOTH ends: `MAX_YEARS` stops one bad date (a row stamped 1900)
   * from generating a century of options, and the current year is always the
   * top entry even when the newest consultation is older than today.
   */
  const currentYear = new Date().getFullYear();
  const newest = Math.max(currentYear, ...years.filter(Number.isFinite));
  const earliest = years.length ? Math.min(...years.filter(Number.isFinite)) : currentYear;
  const span = Math.min(newest - earliest, MAX_YEARS - 1);
  const yearOptions = Array.from({ length: span + 1 }, (_, i) => newest - i);

  /**
   * The dropdown as a proper scrollable popup: capped at ~8 rows so a patient
   * with twenty years of history gets a scrollable panel anchored under the
   * field, instead of a list tall enough to run off the screen. `disablePortal`
   * is deliberately NOT set — the menu must escape the toolbar's stacking
   * context or it clips against the cards below.
   */
  const menuProps = {
    // `slotProps.paper`, NOT the older `PaperProps` — this MUI version no
    // longer consumes that name and forwards it to the underlying DOM node,
    // which React then warns about as an unknown attribute.
    slotProps: {
      paper: {
        sx: {
          maxHeight: 320,
          mt: 0.5,
          borderRadius: (t: Theme) => `${t.tokens.radius.md}px`,
          // A visible scrollbar is the affordance here — without it a capped
          // list looks like the options simply end.
          overflowY: "auto",
        },
      },
    },
    anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
    transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
  };

  const select = {
    size: "small" as const,
    select: true,
    // Grow to fill the bar but never below a readable width; all three share
    // the same basis so they stay equal to each other at every breakpoint.
    sx: { flex: "1 1 150px", minWidth: 150, maxWidth: { sm: 210 }, bgcolor: "background.paper" },
    slotProps: {
      inputLabel: { shrink: true },
      // `displayEmpty` is what makes the unset state render "All years" /
      // "All months". Without it MUI draws NOTHING for an empty value, so with
      // the label floated out of the box those two fields sat visibly blank
      // next to a Sort field that always shows its value.
      select: { MenuProps: menuProps, displayEmpty: true },
    },
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: (t) => `${t.tokens.radius.lg}px`,
        borderColor: "divider",
        bgcolor: "grey.50",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: { sm: "center" }, gap: 1.5 }}
      >
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5, flexGrow: 1, minWidth: 0 }}>
          <TextField
            {...select}
            label="Year"
            value={filters.year ?? ""}
            onChange={(e) => onChange({ ...filters, year: e.target.value ? Number(e.target.value) : undefined })}
          >
            <MenuItem value="">All years</MenuItem>
            {yearOptions.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>

          <TextField
            {...select}
            label="Month"
            value={filters.month ?? ""}
            onChange={(e) => onChange({ ...filters, month: e.target.value ? Number(e.target.value) : undefined })}
          >
            <MenuItem value="">All months</MenuItem>
            {MONTHS.map((m, i) => (
              <MenuItem key={m} value={i + 1}>{m}</MenuItem>
            ))}
          </TextField>

          <TextField
            {...select}
            label="Sort"
            value={filters.sort ?? "newest"}
            onChange={(e) => onChange({ ...filters, sort: e.target.value as TimelineSort })}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
          </TextField>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexShrink: 0, justifyContent: { xs: "space-between", sm: "flex-end" } }}
        >
          {/* Clearing is only offered when something is actually filtered —
              a dead "Clear" button beside an unfiltered list is furniture. */}
          {isFiltered && (
            <Button
              size="small"
              color="inherit"
              startIcon={<FiX size={14} />}
              onClick={() => onChange({ sort: filters.sort })}
              sx={{ textTransform: "none", fontWeight: 700, color: "text.secondary" }}
            >
              Clear
            </Button>
          )}
          <Chip
            size="small"
            variant="outlined"
            label={`${total} consultation${total === 1 ? "" : "s"}`}
            sx={{ fontWeight: 700, bgcolor: "background.paper" }}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
