"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FiCheck, FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { EmptyState, ErrorState, Loading } from "@/components/feedback";
import { getErrorMessage } from "@/utils/error";
import { MEDICINE_FORM_LABELS, type Medicine, type MedicineCreate, type MedicineForm } from "@/types/medicine";
import { FREQUENCY_OPTIONS, formLabel, routeForForm, TIMING_LABEL } from "@/features/prescriptions/medicine-line";
import { useAllMedicines, useCreateMedicine, useDeleteMedicine, useUpdateMedicine } from "../hooks/useMedicine";
import {
  composeStrength,
  DosageFormSelect,
  FoodSelect,
  FrequencySelect,
  MedicineNameField,
  parseStrength,
  StrengthField,
  type StrengthParts,
} from "./MedicineFields";

/**
 * Columns of the list and of the add / edit form, so a row's values sit
 * under their headings. Phones get a stacked card instead.
 */
const GRID = {
  display: "grid",
  gap: 1,
  alignItems: "center",
  gridTemplateColumns: { md: "minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1.1fr) 76px" },
} as const;

/** The add / edit form's own layout (more fields than the list's columns). */
const EDITOR_GRID = {
  display: "grid",
  gap: 1,
  alignItems: "start",
  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "minmax(0, 2fr) minmax(0, 1.6fr) minmax(0, 1.6fr)" },
} as const;

interface Draft {
  name: string;
  genericName: string;
  strength: StrengthParts;
  dosageForm: string;
  manufacturer: string;
  description: string;
  defaultFrequency: string;
  defaultTiming: string;
  /** The catalogue row picked in THIS form — dropped once its name, strength or form is changed. */
  medicineMasterId: string | null;
}

const draftOf = (m?: Medicine): Draft => ({
  name: m?.name ?? "",
  genericName: m?.genericName ?? "",
  strength: parseStrength(m?.strength),
  dosageForm: m?.dosageForm ?? "",
  manufacturer: m?.manufacturer ?? "",
  description: m?.description ?? "",
  defaultFrequency: m?.defaultFrequency ?? "",
  defaultTiming: m?.defaultTiming ?? "",
  medicineMasterId: null,
});

/** "500mg" and "500 mg" are the same strength — keep the stored spelling when unchanged. */
const strengthKey = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, "");

const frequencyText = (v: string | null | undefined) => (v ? FREQUENCY_OPTIONS.find((f) => f.value === v)?.value ?? v : "");

/**
 * The add / edit form: name (typed, or picked from the IHS catalogue to fill
 * strength and form), strength, dosage form and the doctor's DEFAULT frequency
 * and food direction. Duration is never stored here — it's set per patient.
 */
function MedicineEditor({
  initial,
  isNew,
  saving,
  onSave,
  onCancel,
}: {
  initial: Draft;
  isNew: boolean;
  saving: boolean;
  onSave: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const nameError = d.name.trim().length < 2 ? "Enter the medicine name (at least 2 letters)" : "";
  // New entries need a dosage form; an older entry saved without one may stay that way.
  const formError = isNew && !d.dosageForm ? "Choose the dosage form" : "";

  const submit = () => {
    setTried(true);
    if (nameError || formError) return;
    onSave(d);
  };

  return (
    <Stack spacing={1.25}>
      <Box sx={EDITOR_GRID}>
        <MedicineNameField
          value={d.name}
          autoFocus
          error={tried ? nameError : undefined}
          onChange={(name) => set({ name, medicineMasterId: null })}
          onPickCatalogue={(hit) =>
            setD((prev) => ({
              ...prev,
              name: hit.name,
              genericName: hit.genericName ?? "",
              strength: parseStrength(hit.strength),
              dosageForm: hit.dosageForm ?? prev.dosageForm,
              manufacturer: hit.manufacturer ?? "",
              medicineMasterId: hit.catalogueId,
            }))
          }
        />
        <TextField
          size="small"
          fullWidth
          label="Generic name"
          placeholder="e.g. Paracetamol"
          value={d.genericName}
          onChange={(e) => set({ genericName: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
        <StrengthField value={d.strength} onChange={(strength) => set({ strength, medicineMasterId: null })} />
        <DosageFormSelect
          value={d.dosageForm}
          required={isNew}
          error={tried && formError ? formError : undefined}
          onChange={(dosageForm) => set({ dosageForm, medicineMasterId: null })}
        />
        <FrequencySelect value={d.defaultFrequency} onChange={(defaultFrequency) => set({ defaultFrequency })} />
        <FoodSelect value={d.defaultTiming} onChange={(defaultTiming) => set({ defaultTiming })} />
        <TextField
          size="small"
          fullWidth
          label="Manufacturer"
          placeholder="Optional"
          value={d.manufacturer}
          onChange={(e) => set({ manufacturer: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          label="Description"
          placeholder="Optional — notes for yourself, e.g. common uses"
          value={d.description}
          onChange={(e) => set({ description: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          sx={{ gridColumn: { sm: "1 / -1", md: "2 / -1" } }}
        />
      </Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button size="small" variant="contained" startIcon={<FiCheck />} onClick={submit} loading={saving} sx={{ textTransform: "none", fontWeight: 700 }}>
          {isNew ? "Add medicine" : "Save"}
        </Button>
        <Button size="small" color="inherit" startIcon={<FiX />} onClick={onCancel} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>
          Cancel
        </Button>
        <Typography variant="caption" color="text.secondary">
          Frequency and food direction are defaults — they fill in when you pick this medicine and can be changed on each
          prescription. Duration is always entered per patient.
        </Typography>
      </Stack>
    </Stack>
  );
}

/**
 * The API body for a draft (`original` = the entry being edited). A blank
 * optional field clears it (null). `medicineMasterId` is sent only when a
 * catalogue row was picked in this form — otherwise the server links the
 * catalogue row matching name, strength and form itself.
 */
function bodyOf(d: Draft, original?: Medicine): MedicineCreate {
  const composed = composeStrength(d.strength);
  const strength = original && strengthKey(original.strength) === strengthKey(composed) ? original.strength : composed || null;
  return {
    name: d.name.trim(),
    genericName: d.genericName.trim() || null,
    strength,
    // An older entry with no dosage form keeps its stored route until one is chosen.
    ...(d.dosageForm ? { dosageForm: d.dosageForm, form: (routeForForm(d.dosageForm) ?? "other") as MedicineForm } : original ? {} : { dosageForm: null }),
    manufacturer: d.manufacturer.trim() || null,
    description: d.description.trim() || null,
    defaultFrequency: d.defaultFrequency || null,
    defaultTiming: d.defaultTiming || null,
    ...(d.medicineMasterId ? { medicineMasterId: d.medicineMasterId } : {}),
  };
}

function Cell({ label, children, muted }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" }, lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="body2" noWrap sx={{ color: muted ? "text.disabled" : "text.primary" }}>
        {children}
      </Typography>
    </Box>
  );
}

function MedicineRow({ med }: { med: Medicine }) {
  const update = useUpdateMedicine();
  const remove = useDeleteMedicine();
  const [editing, setEditing] = useState(false);

  const save = (d: Draft) =>
    update.mutate(
      { id: med.id, body: bodyOf(d, med) },
      {
        onSuccess: () => {
          toast.success("Medicine updated");
          setEditing(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );

  const del = () => {
    remove.mutate(med.id, {
      onSuccess: () => toast.success("Medicine removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const form = med.dosageForm ? formLabel(med.dosageForm) : MEDICINE_FORM_LABELS[med.form];
  const timing = med.defaultTiming ? TIMING_LABEL[med.defaultTiming] ?? formLabel(med.defaultTiming) : "";
  const details = [med.genericName, med.manufacturer].filter(Boolean).join(" · ");

  return (
    <Paper
      variant="outlined"
      data-medicine-id={med.id}
      sx={(t) => ({
        px: 1.5,
        py: editing ? 1.5 : 0.75,
        borderRadius: `${t.tokens.radius.md}px`,
        opacity: med.isActive ? 1 : 0.6,
        transition: t.transitions.create(["border-color", "background-color"], { duration: 150 }),
        "&:hover": { borderColor: "primary.main" },
      })}
    >
      {editing ? (
        <MedicineEditor initial={draftOf(med)} isNew={false} saving={update.isPending} onSave={save} onCancel={() => setEditing(false)} />
      ) : (
        <Box sx={{ ...GRID, gridTemplateColumns: { xs: "1fr 1fr", md: GRID.gridTemplateColumns.md } }}>
          <Box sx={{ minWidth: 0, gridColumn: { xs: "1 / 2", md: "auto" } }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {med.name}
            </Typography>
            {details && (
              <Typography variant="caption" color="text.secondary" component="div" noWrap title={details}>
                {details}
              </Typography>
            )}
            {med.category && <Chip size="small" variant="outlined" label={med.category} sx={{ height: 18, fontSize: 10.5, mt: 0.25 }} />}
          </Box>
          <Stack direction="row" sx={{ justifyContent: "flex-end", gridColumn: { xs: "2 / 3", md: "6 / 7" }, gridRow: { xs: "1", md: "1" } }}>
            <Tooltip title="Edit">
              <IconButton onClick={() => setEditing(true)} aria-label={`Edit ${med.name}`} size="small">
                <FiEdit2 size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton onClick={del} disabled={remove.isPending} aria-label={`Remove ${med.name}`} size="small" sx={{ color: "error.main" }}>
                <FiTrash2 size={15} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Cell label="Strength" muted={!med.strength}>{med.strength || "—"}</Cell>
          <Cell label="Dosage form">{form}</Cell>
          <Cell label="Frequency" muted={!med.defaultFrequency}>{frequencyText(med.defaultFrequency) || "—"}</Cell>
          <Cell label="Food direction" muted={!timing}>{timing || "—"}</Cell>
        </Box>
      )}
    </Paper>
  );
}

export function MedicineManager() {
  const { data: medicines = [], isLoading, isError, refetch } = useAllMedicines();
  const create = useCreateMedicine();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = medicines.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.genericName && m.genericName.toLowerCase().includes(q)) ||
      (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
      (m.strength && m.strength.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    );
  });

  const add = (d: Draft) =>
    create.mutate(bodyOf(d), {
      onSuccess: () => {
        toast.success("Medicine added");
        setAdding(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  const categories = [...new Set(medicines.map((m) => m.category).filter(Boolean))];

  return (
    <Stack spacing={1.75}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
            My Medicines
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your medicines with their default frequency and food direction. Pick one while writing a prescription and
            these fill in automatically — you only review them and enter the duration.
          </Typography>
        </Box>
        {!adding && (
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => setAdding(true)} sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0 }}>
            Add medicine
          </Button>
        )}
      </Stack>

      {adding && (
        <Paper variant="outlined" sx={(t) => ({ p: 1.5, borderRadius: `${t.tokens.radius.md}px`, borderColor: "primary.main" })}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            New medicine
          </Typography>
          <MedicineEditor initial={draftOf()} isNew saving={create.isPending} onSave={add} onCancel={() => setAdding(false)} />
        </Paper>
      )}

      {medicines.length > 3 && (
        <TextField
          size="small"
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <FiSearch style={{ marginRight: 8, opacity: 0.5 }} /> } }}
          sx={{ maxWidth: 360 }}
        />
      )}

      {categories.length > 0 && search === "" && (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
          {categories.map((cat) => (
            <Chip key={cat} size="small" variant="outlined" label={cat} onClick={() => setSearch(cat as string)} sx={{ textTransform: "none" }} />
          ))}
        </Stack>
      )}

      {isLoading ? (
        <Loading label="Loading your medicines..." />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <Paper variant="outlined">
          <EmptyState
            icon="FiFileText"
            title={search ? "No medicines match your search" : "No medicines yet"}
            description={search ? "Try a different search term." : "Add the medicines you commonly prescribe, with their usual frequency and food direction."}
            action={
              !search ? (
                <Button variant="contained" startIcon={<FiPlus />} onClick={() => setAdding(true)}>
                  Add medicine
                </Button>
              ) : undefined
            }
          />
        </Paper>
      ) : (
        <Stack spacing={0.75}>
          <Box sx={{ ...GRID, display: { xs: "none", md: "grid" }, px: 1.5, color: "text.secondary" }}>
            {["Medicine", "Strength", "Dosage form", "Frequency", "Food direction", ""].map((h) => (
              <Typography key={h || "actions"} variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {h}
              </Typography>
            ))}
          </Box>
          {filtered.map((m) => (
            <MedicineRow key={m.id} med={m} />
          ))}
        </Stack>
      )}

      {filtered.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {filtered.length} medicine{filtered.length === 1 ? "" : "s"}
        </Typography>
      )}
    </Stack>
  );
}
