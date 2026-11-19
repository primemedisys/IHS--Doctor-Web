"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/utils/error";
import { emrService } from "@/features/emr/services/emr.service";
import { useCreateMedicine, useMedicines } from "@/features/medicines/hooks/useMedicine";
import type { MedicineHit } from "@/types/emr";
import type { Medicine } from "@/types/medicine";
import {
  composeStrength,
  DosageFormSelect,
  EMPTY_STRENGTH,
  FoodSelect,
  FrequencySelect,
  StrengthField,
  type StrengthParts,
} from "@/features/medicines/components/MedicineFields";
import { formLabel, hitFromMine, mergeLinkedHits, routeForForm, TIMING_LABEL } from "../medicine-line";

/** Query-key prefix of the picker's server search (invalidated after "Add new medicine"). */
export const MED_SEARCH_KEY = ["doctor", "emr", "med-search"] as const;

type Option =
  | { kind: "hit"; hit: MedicineHit; label: string }
  | { kind: "add"; label: string }
  | { kind: "error"; label: string };

/** "BD · After food" — a saved medicine's defaults, as shown in the dropdown. */
const defaultsText = (h: MedicineHit) =>
  [h.defaultFrequency, h.defaultTiming ? TIMING_LABEL[h.defaultTiming] ?? h.defaultTiming : null].filter(Boolean).join(" · ");

const optionKey = (o: Option) =>
  o.kind === "hit" ? `${o.hit.source}-${o.hit.source === "mine" ? o.hit.medicineId : o.hit.catalogueId}` : o.kind;

/**
 * Medicine search for a prescription line — the doctor's own list ("My
 * medicines") and the IHS medicine catalogue, searched on the SERVER by name,
 * generic name and strength. With nothing typed it offers the doctor's own
 * list. Keyboard: ↑/↓ to move, Enter to pick; Enter on text with no result
 * opens "Add new medicine". The listbox renders in a portal, so a scrolling
 * table can't clip it.
 */
export function MedicinePicker({
  value,
  onPick,
  label = "Medicine",
  error,
  disabled,
  autoFocus,
}: {
  /** The line's current printed label ("" when nothing is chosen). */
  value: string;
  onPick: (hit: MedicineHit) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  // Only text the doctor typed is a search; the line's own label is not.
  const typed = editing && input.trim() !== value.trim() ? input.trim() : "";
  const term = useDebounce(typed, 250);
  const settling = typed !== term; // still debouncing → treat as loading

  const mine = useMedicines();
  const search = useQuery({
    queryKey: [...MED_SEARCH_KEY, term],
    queryFn: () => emrService.searchMedicines(term),
    enabled: term.length >= 2,
    staleTime: 60_000,
  });

  const options = useMemo<Option[]>(() => {
    if (typed.length < 2) {
      return (mine.data ?? []).slice(0, 15).map((m) => ({ kind: "hit" as const, hit: hitFromMine(m), label: m.name }));
    }
    const out: Option[] = [];
    if (search.isError) out.push({ kind: "error", label: "Couldn't search medicines — keep typing to retry." });
    // An own medicine and the catalogue row it's linked to are one medicine — offered once, as the own one.
    for (const hit of mergeLinkedHits(search.data ?? [], mine.data)) out.push({ kind: "hit", hit, label: hit.name });
    if (!settling && !search.isFetching) out.push({ kind: "add", label: `Add new medicine "${typed}"` });
    return out;
  }, [typed, mine.data, search.data, search.isError, search.isFetching, settling]);

  const loading = typed.length >= 2 && (settling || search.isFetching);
  const noMatches = typed.length >= 2 && !loading && !search.isError && !(search.data ?? []).length;

  return (
    <>
      <Autocomplete<Option, false, false, true>
        freeSolo
        size="small"
        disabled={disabled}
        openOnFocus
        autoHighlight
        handleHomeEndKeys
        options={options}
        filterOptions={(x) => x}
        loading={loading}
        loadingText="Searching medicines…"
        noOptionsText={typed.length < 2 ? "Type at least 2 letters to search the catalogue" : "No medicines found"}
        groupBy={(o) => (o.kind !== "hit" ? " " : o.hit.source === "mine" ? "My medicines" : "IHS medicine catalogue")}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.label)}
        getOptionKey={(o) => (typeof o === "string" ? o : optionKey(o))}
        getOptionDisabled={(o) => o.kind === "error"}
        value={null}
        inputValue={editing ? input : value}
        onFocus={() => {
          setEditing(true);
          setInput(value);
        }}
        onBlur={() => setEditing(false)}
        onInputChange={(_e, v, reason) => {
          if (reason === "input" || reason === "clear") setInput(v);
        }}
        onChange={(_e, o) => {
          if (o == null) return;
          // Enter on typed text (the highlight can be lost while results
          // refresh): take the top search result when there is one; with no
          // result, offer to add it. Never silently keep unmatched text.
          if (typeof o === "string") {
            const top = typed.length >= 2 && !loading ? options.find((x) => x.kind === "hit") : undefined;
            if (top && top.kind === "hit") {
              onPick(top.hit);
              setEditing(false);
              (document.activeElement as HTMLElement | null)?.blur();
            } else if (o.trim().length >= 2 && !loading) {
              setAdding(o.trim());
            }
            return;
          }
          if (o.kind === "add") return setAdding(typed);
          if (o.kind === "hit") {
            onPick(o.hit);
            setEditing(false);
            (document.activeElement as HTMLElement | null)?.blur();
          }
        }}
        renderOption={(props, o) => {
          const { key, ...rest } = props as typeof props & { key: string };
          if (o.kind === "add") {
            return (
              <li key={key} {...rest}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "primary.main" }}>
                  <Icon name="FiPlus" />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Add new medicine
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {noMatches ? `No match for "${typed}" — add it to My Medicines` : "Not the one you need? Add it to My Medicines"}
                    </Typography>
                  </Box>
                </Stack>
              </li>
            );
          }
          if (o.kind === "error") {
            return (
              <li key={key} {...rest}>
                <Typography variant="body2" color="error.main">{o.label}</Typography>
              </li>
            );
          }
          const h = o.hit;
          return (
            <li key={key} {...rest}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {h.name}
                  {h.strength ? (
                    <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}> · {h.strength}</Box>
                  ) : null}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" noWrap>
                  {[formLabel(h.dosageForm), h.genericName, h.manufacturer].filter(Boolean).join(" · ") || " "}
                  {h.source === "mine" && defaultsText(h) ? (
                    <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
                      {" "}· Default: {defaultsText(h)}
                    </Box>
                  ) : null}
                </Typography>
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder="Search name, generic or strength"
            required
            autoFocus={autoFocus}
            error={Boolean(error)}
            helperText={error}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                startAdornment: (
                  <>
                    <Box component="span" sx={{ display: "inline-flex", color: "text.secondary", ml: 0.5 }}>
                      <Icon name="FiSearch" size={14} />
                    </Box>
                    {params.slotProps.input.startAdornment}
                  </>
                ),
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={14} /> : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        slotProps={{ popper: { sx: { minWidth: 320 } }, listbox: { sx: { maxHeight: 320 } } }}
      />
      {adding != null && (
        <AddMedicineDialog
          initialName={adding}
          onClose={() => setAdding(null)}
          onAdded={(m) => {
            setAdding(null);
            onPick(hitFromMine(m));
          }}
          onUseCatalogue={(hit) => {
            setAdding(null);
            onPick(hit);
          }}
        />
      )}
    </>
  );
}

/** Read `{ error: { code, details } }` off an axios error. */
function apiError(e: unknown): { code?: string; details?: { medicineId?: string } } {
  return ((e as { response?: { data?: { error?: unknown } } })?.response?.data?.error ?? {}) as {
    code?: string;
    details?: { medicineId?: string };
  };
}

const sameKey = (name: string, strength: string | null | undefined) =>
  `${name.trim().toLowerCase().replace(/\s+/g, " ")}|${(strength ?? "").trim().toLowerCase().replace(/\s+/g, "")}`;

/** The shared catalogue's identity: name + strength (spacing/case ignored) + dosage form. */
const sameCatalogueMedicine = (hit: MedicineHit, name: string, strength: string, dosageForm: string) =>
  hit.source === "catalogue" && sameKey(hit.name, hit.strength) === sameKey(name, strength) && (hit.dosageForm ?? "") === dosageForm;

/**
 * "Add new medicine" — the EXISTING doctor medicine API (POST /doctor/medicines,
 * the "My Medicines" list). It is the doctor's own list, usable straight away;
 * the server also links it to the shared IHS catalogue (matching row, or a new
 * one) from its name, strength and dosage form. A medicine already on the list
 * is offered instead of creating a second copy (the server enforces the same
 * rule). On save the new medicine is picked for the line.
 */
export function AddMedicineDialog({
  initialName,
  onClose,
  onAdded,
  onUseCatalogue,
}: {
  initialName: string;
  onClose: () => void;
  onAdded: (m: Medicine) => void;
  /** Pick the shared-catalogue medicine instead of adding a copy. */
  onUseCatalogue?: (hit: MedicineHit) => void;
}) {
  const qc = useQueryClient();
  const mine = useMedicines();
  const create = useCreateMedicine();
  const [name, setName] = useState(initialName);
  const [genericName, setGenericName] = useState("");
  const [strengthParts, setStrengthParts] = useState<StrengthParts>(EMPTY_STRENGTH);
  const [dosageForm, setDosageForm] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [description, setDescription] = useState("");
  const [defaultFrequency, setDefaultFrequency] = useState("");
  const [defaultTiming, setDefaultTiming] = useState("");
  const [tried, setTried] = useState(false);

  const strength = composeStrength(strengthParts);
  const nameError = name.trim().length < 2 ? "Enter the medicine name (at least 2 letters)" : "";
  const formError = !dosageForm ? "Choose the dosage form" : "";
  const existing = (mine.data ?? []).find(
    (m) => sameKey(m.name, m.strength) === sameKey(name, strength) && (!m.dosageForm || !dosageForm || m.dosageForm === dosageForm),
  );
  // Already in the SHARED catalogue (added by another doctor or a pharmacy)?
  const nameTerm = useDebounce(name.trim(), 300);
  const catalogue = useQuery({
    queryKey: [...MED_SEARCH_KEY, nameTerm],
    queryFn: () => emrService.searchMedicines(nameTerm),
    enabled: nameTerm.length >= 2,
    staleTime: 60_000,
  });
  const inCatalogue = dosageForm
    ? (catalogue.data ?? []).find((h) => sameCatalogueMedicine(h, name, strength, dosageForm))
    : undefined;

  const save = () => {
    setTried(true);
    if (nameError || formError || existing) return;
    create.mutate(
      {
        name: name.trim(),
        genericName: genericName.trim() || null,
        strength: strength || null,
        dosageForm,
        form: routeForForm(dosageForm) ?? "other",
        manufacturer: manufacturer.trim() || null,
        description: description.trim() || null,
        defaultFrequency: defaultFrequency || null,
        defaultTiming: defaultTiming || null,
      },
      {
        onSuccess: (m) => {
          qc.invalidateQueries({ queryKey: MED_SEARCH_KEY });
          toast.success(`${m.name} added to My Medicines`);
          onAdded(m);
        },
        onError: async (e) => {
          const err = apiError(e);
          if (err.code === "MEDICINE_DUPLICATE" && err.details?.medicineId) {
            const fresh = await mine.refetch();
            const dup = fresh.data?.find((m) => m.id === err.details?.medicineId);
            if (dup) {
              toast.info(`${dup.name} is already in My Medicines — selected it.`);
              return onAdded(dup);
            }
          }
          toast.error(getErrorMessage(e));
        },
      },
    );
  };

  return (
    <Dialog open onClose={create.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Add new medicine</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Medicine name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              error={tried && Boolean(nameError)}
              helperText={tried ? nameError : "Brand or generic name, e.g. Dolo 650"}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              size="small"
              label="Generic name"
              placeholder="e.g. Paracetamol"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <StrengthField value={strengthParts} onChange={setStrengthParts} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <DosageFormSelect
                value={dosageForm}
                onChange={setDosageForm}
                required
                error={tried && formError ? formError : undefined}
              />
            </Box>
          </Stack>
          <TextField
            size="small"
            label="Manufacturer"
            placeholder="Optional"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
          <TextField
            size="small"
            multiline
            minRows={2}
            maxRows={5}
            label="Description"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <Stack direction="row" spacing={1}>
            <FrequencySelect value={defaultFrequency} onChange={setDefaultFrequency} />
            <FoodSelect value={defaultTiming} onChange={setDefaultTiming} />
          </Stack>
          {existing ? (
            <Alert
              severity="info"
              sx={{ py: 0 }}
              action={
                <Button size="small" onClick={() => onAdded(existing)}>
                  Use it
                </Button>
              }
            >
              {existing.name}
              {existing.strength ? ` ${existing.strength}` : ""} is already in My Medicines.
            </Alert>
          ) : inCatalogue ? (
            <Alert
              severity="info"
              sx={{ py: 0 }}
              action={
                onUseCatalogue ? (
                  <Button size="small" onClick={() => onUseCatalogue(inCatalogue)}>
                    Use it
                  </Button>
                ) : undefined
              }
            >
              {inCatalogue.name}
              {inCatalogue.strength ? ` ${inCatalogue.strength}` : ""} ({formLabel(inCatalogue.dosageForm)}) is already in
              the shared IHS catalogue. Use it, or add it to My Medicines — it links to that same entry, no duplicate is
              created.
            </Alert>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Saved to your own list (My Medicines) with these defaults, and added to the shared IHS medicine catalogue so
              every IHS doctor can prescribe it. A different strength or dosage form is a separate medicine. This does not
              add pharmacy stock — availability is managed by each pharmacy.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={create.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={create.isPending || Boolean(existing)}>
          {create.isPending ? "Saving…" : "Add medicine"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
