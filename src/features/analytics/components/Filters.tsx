"use client";

import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { MAX_DAILY_DAYS, RANGE_PRESETS, rangeDays, rangeError, rangeFor, rangeLabel, type RangePreset, type RangeValue } from "../range";
import type { DateRange, Granularity } from "../types";

/**
 * Period filter: Today / This week / This month / Last month / This year /
 * Custom. Emits IST `YYYY-MM-DD` bounds; a custom range is only emitted once
 * it's valid (both dates, from ≤ to, ≤ 366 days).
 */
export function DateRangeFilter({ value, onChange }: { value: RangeValue; onChange: (r: RangeValue) => void }) {
  const [draft, setDraft] = useState<DateRange>({ from: value.from, to: value.to });
  const error = value.preset === "custom" ? rangeError(draft) : null;

  const pickPreset = (preset: RangePreset) => {
    if (preset === "custom") {
      setDraft({ from: value.from, to: value.to });
      onChange({ preset, from: value.from, to: value.to });
      return;
    }
    onChange(rangeFor(preset));
  };

  const editDraft = (patch: Partial<DateRange>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (!rangeError(next)) onChange({ preset: "custom", ...next });
  };

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, flexWrap: "wrap", rowGap: 1 }}>
      <TextField
        select
        size="small"
        label="Period"
        value={value.preset}
        onChange={(e) => pickPreset(e.target.value as RangePreset)}
        sx={{ minWidth: 160 }}
      >
        {RANGE_PRESETS.map((p) => (
          <MenuItem key={p.value} value={p.value}>
            {p.label}
          </MenuItem>
        ))}
      </TextField>
      {value.preset === "custom" ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <TextField
            type="date"
            size="small"
            label="From"
            value={draft.from}
            onChange={(e) => editDraft({ from: e.target.value })}
            error={!!error}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, minWidth: 140 }}
          />
          <TextField
            type="date"
            size="small"
            label="To"
            value={draft.to}
            onChange={(e) => editDraft({ to: e.target.value })}
            error={!!error}
            helperText={error ?? undefined}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, minWidth: 140 }}
          />
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {rangeLabel(value)}
        </Typography>
      )}
    </Stack>
  );
}

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Day / week / month for a series. `value` = what the server actually returned. */
export function GranularityToggle({ value, range, onChange }: { value?: Granularity; range: DateRange; onChange: (g: Granularity) => void }) {
  const tooLong = rangeDays(range) > MAX_DAILY_DAYS;
  return (
    // ToggleButtonGroup clones its direct children, so the "why disabled" hint
    // sits on the group rather than wrapping the button.
    <Tooltip title={tooLong ? `Daily charts cover at most ${MAX_DAILY_DAYS} days` : ""}>
      <ToggleButtonGroup exclusive size="small" value={value ?? null} onChange={(_e, g: Granularity | null) => g && onChange(g)} aria-label="Chart granularity">
        {GRANULARITIES.map((g) => (
          <ToggleButton key={g.value} value={g.value} disabled={g.value === "day" && tooLong} sx={{ px: 1.25, py: 0.25 }}>
            {g.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Tooltip>
  );
}
