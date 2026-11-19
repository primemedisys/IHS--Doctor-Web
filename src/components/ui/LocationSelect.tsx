"use client";

import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";
import { useMemo } from "react";
import { FiMapPin } from "react-icons/fi";
import { citiesByState, stateCodesWithCities } from "@/data/cities";
import { states } from "@/data";

export interface LocationValue {
  stateCode?: string;
  city?: string;
}

export interface LocationSelectProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Stack the two selects vertically (sidebar) vs. side-by-side. */
  direction?: "row" | "column";
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

/**
 * State → City/Area cascade. Picking a state reveals that state's areas and
 * clears any previously selected city; picking a city keeps the state. Only
 * states that actually have listed areas are offered.
 */
export function LocationSelect({ value, onChange, direction = "row", size = "small", sx }: LocationSelectProps) {
  const stateOptions = useMemo(
    () =>
      states
        .filter((s) => stateCodesWithCities.includes(s.code))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const cityOptions = useMemo(() => (value.stateCode ? citiesByState(value.stateCode) : []), [value.stateCode]);

  return (
    <Stack direction={direction} spacing={1.5} sx={{ width: "100%", ...sx }}>
      <TextField
        select
        fullWidth
        size={size}
        label="State"
        value={value.stateCode ?? ""}
        onChange={(e) => onChange({ stateCode: e.target.value || undefined, city: undefined })}
        slotProps={{ select: { displayEmpty: true } }}
      >
        <MenuItem value="">
          <em>All states</em>
        </MenuItem>
        {stateOptions.map((s) => (
          <MenuItem key={s.code} value={s.code}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        fullWidth
        size={size}
        label="City / area"
        value={value.city ?? ""}
        disabled={!value.stateCode}
        helperText={!value.stateCode ? "Select a state first" : undefined}
        onChange={(e) => onChange({ stateCode: value.stateCode, city: e.target.value || undefined })}
        slotProps={{
          select: { displayEmpty: true },
          input: { startAdornment: value.stateCode ? <FiMapPin style={{ marginRight: 8, opacity: 0.6 }} /> : null },
        }}
      >
        <MenuItem value="">
          <em>All areas</em>
        </MenuItem>
        {cityOptions.map((c) => (
          <MenuItem key={c.slug} value={c.slug}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
