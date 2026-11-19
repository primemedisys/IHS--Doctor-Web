"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useEmrCatalog } from "@/features/emr/hooks";
import { emrService } from "@/features/emr/services/emr.service";
import { FREQUENCY_OPTIONS, formLabel, mergeLinkedHits, TIMING_LABEL } from "@/features/prescriptions/medicine-line";
import type { MedicineHit } from "@/types/emr";
import { useAllMedicines } from "../hooks/useMedicine";

const SEARCH_KEY = ["doctor", "emr", "med-search"] as const;

// ── Strength: number + unit, stored as one string ("500 mg") ─────────────────
export const STRENGTH_UNITS = ["mg", "mcg", "g", "ml", "mg/ml", "mg/5ml", "IU", "%", "other"] as const;
export type StrengthUnit = (typeof STRENGTH_UNITS)[number];

/** The strength picker's parts. `unit: "other"` keeps `text` as free text (e.g. "250/125 mg"). */
export interface StrengthParts {
  amount: string;
  unit: StrengthUnit;
  text: string;
}

export const EMPTY_STRENGTH: StrengthParts = { amount: "", unit: "mg", text: "" };

const UNIT_RE = /^(\d+(?:\.\d+)?)\s*(mg\s*\/\s*5\s*ml|mg\s*\/\s*ml|mcg|mg|ml|g|iu|%)$/i;

/** "500 mg" / "500mg" → { 500, mg }. Anything else is kept verbatim as "other". */
export function parseStrength(value: string | null | undefined): StrengthParts {
  const s = (value ?? "").trim();
  if (!s) return { ...EMPTY_STRENGTH };
  const m = UNIT_RE.exec(s);
  if (!m) return { amount: "", unit: "other", text: s };
  const u = m[2].toLowerCase().replace(/\s+/g, "");
  const unit = (u === "iu" ? "IU" : u) as StrengthUnit;
  return { amount: m[1], unit, text: "" };
}

/** The stored strength string ("" when nothing is entered). */
export function composeStrength(p: StrengthParts): string {
  if (p.unit === "other") return p.text.trim();
  const amount = p.amount.trim().replace(/\.$/, "");
  if (!amount) return "";
  return p.unit === "%" ? `${amount}%` : `${amount} ${p.unit}`;
}

/**
 * Strength as a number and a unit — composes the single `strength` string the
 * API stores. "Other" swaps the number for free text, for strengths that don't
 * fit one number (combinations, ranges, older values).
 */
export function StrengthField({ value, onChange }: { value: StrengthParts; onChange: (v: StrengthParts) => void }) {
  const other = value.unit === "other";
  return (
    <Stack direction="row" spacing={0.75} sx={{ minWidth: 0 }}>
      {other ? (
        <TextField
          size="small"
          fullWidth
          label="Strength"
          placeholder="e.g. 250/125 mg"
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      ) : (
        <TextField
          size="small"
          fullWidth
          label="Strength"
          placeholder="e.g. 500"
          value={value.amount}
          onChange={(e) => {
            const amount = e.target.value.replace(",", ".");
            if (/^\d{0,7}(\.\d{0,4})?$/.test(amount)) onChange({ ...value, amount });
          }}
          slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": "Strength amount" } }}
        />
      )}
      <TextField
        size="small"
        select
        label="Unit"
        value={value.unit}
        onChange={(e) => {
          const unit = e.target.value as StrengthUnit;
          // Switching to / from "other" carries the current value across.
          if (unit === "other") return onChange({ amount: "", unit, text: composeStrength(value) || value.text });
          if (!other) return onChange({ ...value, unit });
          const parsed = parseStrength(value.text);
          onChange({ amount: parsed.unit === "other" ? "" : parsed.amount, unit, text: value.text });
        }}
        sx={{ width: 96, flexShrink: 0 }}
      >
        {STRENGTH_UNITS.map((u) => (
          <MenuItem key={u} value={u}>
            {u === "other" ? "Other" : u}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

// ── Dosage form ──────────────────────────────────────────────────────────────
/** The forms doctors pick most, first; "other" always last. Every API value stays offered. */
const COMMON_FORMS = ["tablet", "capsule", "syrup", "injection", "ointment", "drops", "cream"];

export function orderDosageForms(forms: string[]): string[] {
  const common = COMMON_FORMS.filter((f) => forms.includes(f));
  const rest = forms.filter((f) => !COMMON_FORMS.includes(f) && f !== "other");
  return [...common, ...rest, ...(forms.includes("other") ? ["other"] : [])];
}

/** Dosage form — the IHS catalogue's own vocabulary (tablet, capsule, syrup, …), served by the API. */
export function DosageFormSelect({
  value,
  onChange,
  required,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  const catalog = useEmrCatalog();
  return (
    <TextField
      size="small"
      select
      fullWidth
      label="Dosage form"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      helperText={error}
    >
      <MenuItem value="">—</MenuItem>
      {orderDosageForms(catalog.data?.dosageForms ?? []).map((f) => (
        <MenuItem key={f} value={f}>
          {formLabel(f)}
        </MenuItem>
      ))}
    </TextField>
  );
}

/**
 * Default frequency — the same abbreviations a prescription line uses (OD,
 * BD, TDS, …). A saved value that isn't in the standard list (typed on an
 * older prescription) is still offered, so editing never silently drops it.
 */
export function FrequencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = value && !FREQUENCY_OPTIONS.some((f) => f.value === value);
  return (
    <TextField size="small" select fullWidth label="Frequency" value={value} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">—</MenuItem>
      {custom && <MenuItem value={value}>{value}</MenuItem>}
      {FREQUENCY_OPTIONS.map((f) => (
        <MenuItem key={f.value} value={f.value}>
          {f.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Default food direction — the existing timing values (Before / After food, With food, Any time). */
export function FoodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const catalog = useEmrCatalog();
  return (
    <TextField size="small" select fullWidth label="Food direction" value={value} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">—</MenuItem>
      {(catalog.data?.medicineTimings ?? []).map((t) => (
        <MenuItem key={t} value={t}>
          {TIMING_LABEL[t] ?? formLabel(t)}
        </MenuItem>
      ))}
    </TextField>
  );
}

/**
 * Medicine name: type it, or search the IHS catalogue and pick one to fill
 * name, generic name, strength, dosage form and manufacturer. Medicines already
 * in My Medicines (including the catalogue rows they're linked to) are shown
 * but can't be picked again (the API refuses the duplicate too).
 */
export function MedicineNameField({
  value,
  onChange,
  onPickCatalogue,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onPickCatalogue: (hit: MedicineHit) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const term = useDebounce(value.trim(), 250);
  const own = useAllMedicines();
  const search = useQuery({
    queryKey: [...SEARCH_KEY, term],
    queryFn: () => emrService.searchMedicines(term),
    enabled: term.length >= 2,
    staleTime: 60_000,
  });
  const options = term.length >= 2 ? mergeLinkedHits(search.data ?? [], own.data) : [];

  return (
    <Autocomplete<MedicineHit, false, false, true>
      freeSolo
      size="small"
      options={options}
      filterOptions={(x) => x}
      loading={search.isFetching}
      inputValue={value}
      onInputChange={(_e, v, reason) => {
        if (reason === "input" || reason === "clear") onChange(v);
      }}
      onChange={(_e, o) => {
        if (o && typeof o !== "string" && o.source === "catalogue") onPickCatalogue(o);
      }}
      getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
      getOptionKey={(o) => (typeof o === "string" ? o : `${o.source}-${o.source === "mine" ? o.medicineId : o.catalogueId}`)}
      getOptionDisabled={(o) => o.source === "mine"}
      groupBy={(o) => (o.source === "mine" ? "Already in My Medicines" : "IHS medicine catalogue — pick to fill the details")}
      renderOption={(props, o) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <li key={key} {...rest}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {o.name}
                {o.strength ? <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}> · {o.strength}</Box> : null}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" noWrap>
                {[formLabel(o.dosageForm), o.genericName, o.manufacturer].filter(Boolean).join(" · ") || " "}
              </Typography>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Medicine name"
          placeholder="e.g. Paracetamol"
          required
          autoFocus={autoFocus}
          error={Boolean(error)}
          helperText={error}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, maxLength: 200 },
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {search.isFetching ? <CircularProgress color="inherit" size={14} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      noOptionsText="No catalogue match — just type the name"
      slotProps={{ popper: { sx: { minWidth: 300 } } }}
    />
  );
}
