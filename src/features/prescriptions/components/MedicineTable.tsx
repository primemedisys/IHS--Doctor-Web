"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FiArrowDown, FiArrowUp, FiPlus, FiX } from "react-icons/fi";
import {
  DURATION_UNITS,
  MEDICINE_ROUTES,
  MEDICINE_TIMINGS,
  type DurationUnit,
  type MedicineColumn,
  type PrescriptionItem,
} from "@/types/prescription";
import { formLabel, fromHit } from "../medicine-line";
import { MedicinePicker } from "./MedicinePicker";
import { COLUMN_LABELS, DURATION_UNIT_LABELS, ROUTE_LABELS, TIMING_LABELS } from "./rx-format";

const MAX_ITEMS = 30;

export const emptyItem = (): PrescriptionItem => ({
  medicineId: null,
  medicineMasterId: null,
  medicineName: "",
  strength: null,
  dosageForm: null,
  dosage: null,
  route: "oral",
  frequency: null,
  timing: "after_food",
  durationDays: null,
  durationUnit: "day",
  notes: null,
});

const COLUMN_WEIGHT: Record<MedicineColumn, number> = {
  medicineName: 2.4,
  dosage: 1,
  route: 1,
  frequency: 1,
  timing: 1.15,
  durationDays: 1.75,
  notes: 1.5,
};

const COLUMN_MIN_PX: Record<MedicineColumn, number> = {
  medicineName: 170,
  dosage: 92,
  route: 104,
  frequency: 96,
  timing: 118,
  durationDays: 158,
  notes: 130,
};

const COLUMN_HINT: Partial<Record<MedicineColumn, string>> = {
  medicineName: "e.g. Paracetamol",
  dosage: "500 mg",
  frequency: "OD / BD / TDS",
  notes: "Optional",
};

const templateColumns = (columns: MedicineColumn[]) =>
  `${columns.map((c) => `minmax(${COLUMN_MIN_PX[c]}px, ${COLUMN_WEIGHT[c]}fr)`).join(" ")} auto`;

const minRowPx = (columns: MedicineColumn[]) =>
  columns.reduce((sum, c) => sum + COLUMN_MIN_PX[c], 0) + 128;

export interface MedicineTableProps {
  items: PrescriptionItem[];
  columns: MedicineColumn[];
  onChange: (items: PrescriptionItem[]) => void;
  disabled?: boolean;
}

export function MedicineTable({ items, columns, onChange, disabled }: MedicineTableProps) {
  const set = (i: number, next: Partial<PrescriptionItem>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...next } : it)));

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () => onChange([...items, emptyItem()]);

  const grid = templateColumns(columns);

  return (
    <Stack spacing={1.5}>
      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No medicines yet — add the first one below.
        </Typography>
      )}

      {items.length > 0 && (
        <Box sx={{ overflowX: { xs: "visible", md: "auto" }, mx: { md: -0.5 }, px: { md: 0.5 }, pb: { md: 0.5 } }}>
          <Box sx={{ minWidth: { xs: "auto", md: minRowPx(columns) } }}>
            <Box
              sx={{
                display: { xs: "none", md: "grid" },
                gridTemplateColumns: grid,
                gap: 1,
                px: 0.25,
                pb: 0.75,
                mb: 0.5,
                borderBottom: "2px solid",
                borderColor: "divider",
              }}
            >
              {columns.map((c) => (
                <Typography
                  key={c}
                  variant="caption"
                  sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}
                >
                  {COLUMN_LABELS[c]}
                </Typography>
              ))}
              <Box sx={{ width: 120 }} />
            </Box>

            <Stack spacing={{ xs: 1.5, md: 1 }}>
              {items.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: grid },
                    gap: { xs: 1.25, md: 1 },
                    alignItems: { md: "start" },
                    border: { xs: "1px solid", md: "none" },
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: { xs: 1.5, md: 0 },
                    bgcolor: { xs: "background.paper", md: "transparent" },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ display: { xs: "block", md: "none" }, fontWeight: 700, color: "text.secondary" }}
                  >
                    Medicine {i + 1}
                  </Typography>

                  {columns.map((c) => (
                    <MedicineCell
                      key={c}
                      column={c}
                      item={item}
                      disabled={disabled}
                      onChange={(next) => set(i, next)}
                      onEnter={i === items.length - 1 ? add : undefined}
                    />
                  ))}

                  <Stack direction="row" sx={{ justifyContent: { xs: "flex-end", md: "flex-start" } }}>
                    <IconButton size="small" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${item.medicineName || "row"} up`}>
                      <FiArrowUp />
                    </IconButton>
                    <IconButton size="small" disabled={disabled || i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${item.medicineName || "row"} down`}>
                      <FiArrowDown />
                    </IconButton>
                    <IconButton size="small" disabled={disabled} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${item.medicineName || "row"}`}>
                      <FiX />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      )}

      <Button
        size="small"
        variant="outlined"
        startIcon={<FiPlus />}
        onClick={add}
        disabled={disabled || items.length >= MAX_ITEMS}
        sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
      >
        {items.length ? "Add another medicine" : "Add medicine"}
      </Button>
      {items.length >= MAX_ITEMS && (
        <Typography variant="caption" color="text.secondary">
          Maximum {MAX_ITEMS} medicines per prescription.
        </Typography>
      )}
    </Stack>
  );
}

function CellLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      component="span"
      color="text.secondary"
      sx={{ display: { xs: "block", md: "none" }, mb: 0.25, fontWeight: 600 }}
    >
      {children}
    </Typography>
  );
}

function MedicineCell({
  column,
  item,
  onChange,
  onEnter,
  disabled,
}: {
  column: MedicineColumn;
  item: PrescriptionItem;
  onChange: (next: Partial<PrescriptionItem>) => void;
  onEnter?: () => void;
  disabled?: boolean;
}) {
  const label = COLUMN_LABELS[column];
  const common = { size: "small" as const, fullWidth: true, disabled };

  if (column === "medicineName") {
    // Strength and dosage form come from the picked record; the "Dosage"
    // column stays the prescribed dose and is never filled from strength.
    const details = [item.strength, formLabel(item.dosageForm)].filter(Boolean).join(" · ");
    return (
      <Box sx={{ minWidth: 0 }}>
        <CellLabel>{label}</CellLabel>
        <MedicinePicker
          value={item.medicineName}
          label={label}
          disabled={disabled}
          onPick={(hit) => onChange(fromHit(hit, item))}
        />
        {details && (
          <Box component="span" sx={{ display: "block", mt: 0.25, px: 0.5, fontSize: 11, color: "text.secondary" }}>
            {details}
          </Box>
        )}
      </Box>
    );
  }

  if (column === "route") {
    return (
      <Box>
        <CellLabel>{label}</CellLabel>
        <TextField {...common} select value={item.route} onChange={(e) => onChange({ route: e.target.value as PrescriptionItem["route"] })}>
          {MEDICINE_ROUTES.map((r) => (
            <MenuItem key={r} value={r}>
              {ROUTE_LABELS[r]}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  if (column === "timing") {
    return (
      <Box>
        <CellLabel>{label}</CellLabel>
        <TextField
          {...common}
          select
          value={item.timing ?? ""}
          onChange={(e) => onChange({ timing: (e.target.value || null) as PrescriptionItem["timing"] })}
        >
          <MenuItem value="">
            <em>—</em>
          </MenuItem>
          {MEDICINE_TIMINGS.map((t) => (
            <MenuItem key={t} value={t}>
              {TIMING_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  if (column === "durationDays") {
    return (
      <Box>
        <CellLabel>{label}</CellLabel>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(64px, 1fr) 96px", gap: 0.75 }}>
          <TextField
            {...common}
            type="number"
            placeholder="0"
            value={item.durationDays ?? ""}
            onChange={(e) =>
              onChange({ durationDays: e.target.value === "" ? null : Number(e.target.value) })
            }
            slotProps={{ htmlInput: { min: 1, max: 365, "aria-label": "Duration count" } }}
            sx={{
              "& input[type=number]": { MozAppearance: "textfield" },
              "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
              },
            }}
          />
          <TextField
            {...common}
            select
            value={item.durationUnit ?? "day"}
            onChange={(e) => onChange({ durationUnit: e.target.value as DurationUnit })}
            slotProps={{ htmlInput: { "aria-label": "Duration unit" } }}
          >
            {DURATION_UNITS.map((u) => (
              <MenuItem key={u} value={u}>
                {DURATION_UNIT_LABELS[u]}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
    );
  }

  const key = column as "dosage" | "frequency" | "notes";
  return (
    <Box>
      <CellLabel>{label}</CellLabel>
      <TextField
        {...common}
        placeholder={COLUMN_HINT[column]}
        value={item[key] ?? ""}
        onChange={(e) => onChange({ [key]: e.target.value || null })}
        slotProps={{ htmlInput: { "aria-label": label } }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </Box>
  );
}
