"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { WeeklySlot, WeeklySlotInput } from "@/types/clinic";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DURATIONS = [10, 15, 20, 30, 45, 60];
const DEFAULT_ROW = {
  enabled: false,
  startTime: "10:00",
  endTime: "13:00",
  slotDurationMinutes: 15,
  maxBookings: null as number | null,
};

interface DayRow {
  enabled: boolean;
  startTime: string;
  endTime: string;
  /** Expected minutes per patient — the waiting estimate, not a slot length. */
  slotDurationMinutes: number;
  /** NULL = unlimited, which is the default and the point of the queue. */
  maxBookings: number | null;
}

/** Seed 7 day-rows from the API slots (one window per day — the first wins). */
function seedRows(slots: WeeklySlot[]): DayRow[] {
  return DAY_LABELS.map((_, dow) => {
    const slot = slots.find((s) => s.dayOfWeek === dow && s.isActive !== false);
    return slot
      ? {
          enabled: true,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotDurationMinutes: slot.avgConsultMinutes ?? slot.slotDurationMinutes,
          maxBookings: slot.maxBookings ?? null,
        }
      : { ...DEFAULT_ROW };
  });
}

/** Collapse the 7 day-rows into the API's replace-the-set payload. */
function toPayload(rows: DayRow[]): WeeklySlotInput[] {
  return rows
    .map((r, dow) => ({ ...r, dayOfWeek: dow }))
    .filter((r) => r.enabled)
    .map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMinutes: r.slotDurationMinutes,
      maxBookings: r.maxBookings,
    }));
}

/**
 * A weekly schedule grid, reused for a clinic's hours and the online/video
 * schedule. Enable a day, set when you open and close, roughly how long each
 * patient takes, and — if you want one — a cap.
 *
 * Since docs/consultation-queue this publishes a CONSULTING WINDOW, not a slot
 * grid: patients book the day and take a token inside it. "Avg per patient" only
 * estimates their wait, and "Max patients" is blank by default because the
 * feature exists precisely so the sixth patient is not turned away.
 *
 * Two modes:
 * - **Standalone** (pass `onSave`): renders a "Save schedule" button that PUTs
 *   the whole week — used by the Availability page tabs.
 * - **Embedded** (pass `onChange`, omit `onSave`): no button; emits the payload
 *   on every edit so a parent form (e.g. the clinic dialog) can save it as part
 *   of its own submit.
 *
 * State is seeded from `slots` once on mount. To re-seed after the server data
 * changes, callers remount via a `key` (e.g. the clinic tab keys on the id).
 */
export function WeeklyScheduleEditor({
  slots,
  onSave,
  onChange,
  saving,
}: {
  slots: WeeklySlot[];
  onSave?: (slots: WeeklySlotInput[]) => void;
  onChange?: (slots: WeeklySlotInput[]) => void;
  saving?: boolean;
}) {
  const [rows, setRows] = useState<DayRow[]>(() => seedRows(slots));

  const patch = (dow: number, next: Partial<DayRow>) => {
    const updated = rows.map((r, i) => (i === dow ? { ...r, ...next } : r));
    setRows(updated);
    onChange?.(toPayload(updated));
  };

  const invalid = rows.some((r) => r.enabled && r.endTime <= r.startTime);

  const handleSave = () => onSave?.(toPayload(rows));

  return (
    <Stack spacing={1.5}>
      {rows.map((row, dow) => (
        <Stack
          key={dow}
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { sm: "center" }, opacity: row.enabled ? 1 : 0.55 }}
        >
          <Stack direction="row" sx={{ alignItems: "center", minWidth: 150 }}>
            <Checkbox
              checked={row.enabled}
              onChange={(e) => patch(dow, { enabled: e.target.checked })}
            />
            <Typography sx={{ fontWeight: 600 }}>{DAY_LABELS[dow]}</Typography>
          </Stack>
          <TextField
            type="time"
            label="Open"
            size="small"
            value={row.startTime}
            disabled={!row.enabled}
            onChange={(e) => patch(dow, { startTime: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 150 }}
          />
          <TextField
            type="time"
            label="Close"
            size="small"
            value={row.endTime}
            disabled={!row.enabled}
            error={row.enabled && row.endTime <= row.startTime}
            onChange={(e) => patch(dow, { endTime: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 150 }}
          />
          {/* NOT a slot length. This is how long the doctor expects to spend
              with each patient, and all it does is estimate the wait for people
              in the queue — it no longer caps how many may book. */}
          <TextField
            select
            label="Avg per patient"
            size="small"
            value={row.slotDurationMinutes}
            disabled={!row.enabled}
            onChange={(e) => patch(dow, { slotDurationMinutes: Number(e.target.value) })}
            sx={{ width: 140 }}
          >
            {DURATIONS.map((d) => (
              <MenuItem key={d} value={d}>
                {d} min
              </MenuItem>
            ))}
          </TextField>
          {/* Blank = unlimited, which is the default: the whole point of the
              queue is that the sixth patient can still book. */}
          <TextField
            type="number"
            label="Max patients"
            placeholder="No limit"
            size="small"
            value={row.maxBookings ?? ""}
            disabled={!row.enabled}
            onChange={(e) => {
              const v = e.target.value.trim();
              patch(dow, { maxBookings: v === "" ? null : Math.max(1, Number(v)) });
            }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: 500 } }}
            sx={{ width: 130 }}
          />
        </Stack>
      ))}

      {invalid && (
        <Typography variant="caption" color="error" sx={{ display: "block" }}>
          Closing time must be after opening time on every enabled day.
        </Typography>
      )}
      {onSave && (
        <Box>
          <Button variant="contained" onClick={handleSave} disabled={invalid} loading={saving}>
            Save schedule
          </Button>
        </Box>
      )}
    </Stack>
  );
}
