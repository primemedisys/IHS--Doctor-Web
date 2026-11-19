"use client";

import Alert from "@mui/material/Alert";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import {
  useAllSubSpecializations,
  useCatalog,
  useCreateSubSpecialization,
  useSaveSpecialties,
  useSetLanguages,
} from "../../hooks";
import type { Language, OwnDoctorProfile, Specialization, SubSpecialization } from "@/types/doctor-portfolio";

const MAX_SPECS = 5;
const MAX_SUB_SPECS = 10;

/** Sentinel option id for the "+ Add new" row in the sub-specialty picker. */
const ADD_NEW_ID = -1;
type SubOption = SubSpecialization & { draft?: string };

const filterSubs = createFilterOptions<SubOption>();

/** Same rules as the backend Joi schema, so the doctor sees errors before saving. */
function validateNewSubName(raw: string): { name: string; error: string | null } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2) return { name, error: "Enter at least 2 characters" };
  if (name.length > 100) return { name, error: "Keep it under 100 characters" };
  if (!/^[A-Za-z0-9 &()/,.'+-]+$/.test(name)) {
    return { name, error: "Use letters, numbers, spaces and & ( ) / , . ' + - only" };
  }
  if (!/[A-Za-z]/.test(name)) return { name, error: "Include at least one letter" };
  return { name, error: null };
}

/** Loose identity used to spot duplicates: case, spacing and punctuation ignored. */
const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Step 2 — specialties, sub-specialties & languages.
 *
 * Specialties come from the shared catalog. Sub-specialty options are limited to
 * the selected specialties (grouped by parent); removing a specialty drops its
 * sub-specialties from the selection. A doctor can add a missing sub-specialty —
 * it is saved to the shared catalog (find-or-create) so other doctors can pick
 * it too. Specialties + sub-specialties save together in one action.
 */
export function SpecialtiesStep({ profile }: { profile: OwnDoctorProfile }) {
  const { specializations: specCatalog, languages: langCatalog } = useCatalog();
  const subCatalog = useAllSubSpecializations();
  const saveSpecialties = useSaveSpecialties();
  const createSub = useCreateSubSpecialization();
  const setLangs = useSetLanguages();

  const [specs, setSpecs] = useState<Specialization[]>(profile.specializations);
  const [subSpecs, setSubSpecs] = useState<SubSpecialization[]>(profile.subSpecializations);
  const [langs, setLangs2] = useState<Language[]>(profile.languages);
  const [notice, setNotice] = useState<string | null>(null);

  // "+ Add new" inline form.
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<number | "">("");
  const [newError, setNewError] = useState<string | null>(null);

  // Re-seed local state when the server data changes (e.g. after a save).
  // Adjust-state-during-render rather than an effect (React's recommended
  // pattern; the effect version tripped the no-setState-in-effect rule).
  const [seenSpecs, setSeenSpecs] = useState(profile.specializations);
  if (profile.specializations !== seenSpecs) {
    setSeenSpecs(profile.specializations);
    setSpecs(profile.specializations);
  }
  const [seenSubSpecs, setSeenSubSpecs] = useState(profile.subSpecializations);
  if (profile.subSpecializations !== seenSubSpecs) {
    setSeenSubSpecs(profile.subSpecializations);
    setSubSpecs(profile.subSpecializations);
  }
  const [seenLangs, setSeenLangs] = useState(profile.languages);
  if (profile.languages !== seenLangs) {
    setSeenLangs(profile.languages);
    setLangs2(profile.languages);
  }

  const specNameById = useMemo(() => new Map(specs.map((s) => [s.id, s.name])), [specs]);

  // Only sub-specialties of the selected specialties, grouped in selection order.
  const subOptions = useMemo<SubOption[]>(() => {
    const order = new Map(specs.map((s, i) => [s.id, i]));
    return (subCatalog.data ?? [])
      .filter((s) => order.has(s.specializationId))
      .sort(
        (a, b) =>
          (order.get(a.specializationId) ?? 0) - (order.get(b.specializationId) ?? 0) ||
          a.name.localeCompare(b.name)
      );
  }, [subCatalog.data, specs]);

  const handleSpecChange = (_e: unknown, value: Specialization[]) => {
    const next = value.slice(0, MAX_SPECS);
    const keep = new Set(next.map((s) => s.id));
    const kept = subSpecs.filter((s) => keep.has(s.specializationId));
    const dropped = subSpecs.length - kept.length;
    setSpecs(next);
    setSubSpecs(kept);
    setNotice(
      dropped > 0
        ? `Removed ${dropped} sub-specialt${dropped === 1 ? "y" : "ies"} that no longer match your specialties.`
        : null
    );
    if (newParentId !== "" && !keep.has(newParentId)) setNewParentId(next[0]?.id ?? "");
    if (next.length === 0) setAdding(false);
  };

  const openAddForm = (draft: string) => {
    setNewName(draft);
    setNewError(null);
    setNewParentId((current) => (current !== "" && specNameById.has(current) ? current : specs[0]?.id ?? ""));
    setAdding(true);
  };

  /** Add to the selection; returns false (with a notice) when the cap is hit. */
  const selectSub = (sub: SubSpecialization): boolean => {
    if (subSpecs.some((s) => s.id === sub.id)) return true;
    if (subSpecs.length >= MAX_SUB_SPECS) {
      setNotice(`You can list up to ${MAX_SUB_SPECS} sub-specialties. Remove one to add "${sub.name}".`);
      return false;
    }
    setSubSpecs([...subSpecs, sub]);
    return true;
  };

  const submitNewSub = () => {
    if (newParentId === "") {
      setNewError("Choose the specialty it belongs to");
      return;
    }
    const { name, error } = validateNewSubName(newName);
    if (error) {
      setNewError(error);
      return;
    }
    // Already in the catalog under this parent? Select it instead of creating.
    const existing = (subCatalog.data ?? []).find(
      (s) => s.specializationId === newParentId && nameKey(s.name) === nameKey(name)
    );
    if (existing) {
      if (selectSub(existing)) setNotice(`"${existing.name}" already exists — selected it for you.`);
      setAdding(false);
      return;
    }
    const parentId = newParentId;
    createSub.mutate(
      { specializationId: parentId, name },
      {
        onSuccess: ({ subSpecialization }) => {
          selectSub(subSpecialization);
          setAdding(false);
          setNewName("");
        },
      }
    );
  };

  const sameIds = (a: { id: number }[], b: { id: number }[]) =>
    a.length === b.length && a.every((x) => b.some((y) => y.id === x.id));
  const dirty = !sameIds(specs, profile.specializations) || !sameIds(subSpecs, profile.subSpecializations);

  const save = () => {
    // Older records may hold a sub-specialty whose parent is no longer listed;
    // the server rejects those, so drop them (and say so) rather than fail.
    const keep = new Set(specs.map((s) => s.id));
    const valid = subSpecs.filter((s) => keep.has(s.specializationId));
    if (valid.length !== subSpecs.length) {
      setSubSpecs(valid);
      setNotice(
        `Removed ${subSpecs.length - valid.length} sub-specialt${subSpecs.length - valid.length === 1 ? "y" : "ies"} that didn't belong to your specialties.`
      );
    }
    saveSpecialties.mutate({
      specializationIds: specs.map((s) => s.id),
      subSpecializationIds: valid.map((s) => s.id),
    });
  };

  return (
    <Stack spacing={2.5}>
      <Autocomplete
        multiple
        options={specCatalog.data ?? []}
        loading={specCatalog.isLoading}
        value={specs}
        onChange={handleSpecChange}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Specialties"
            placeholder={`Add up to ${MAX_SPECS}`}
            helperText="At least one is required"
          />
        )}
      />

      <Autocomplete<SubOption, true>
        multiple
        disabled={specs.length === 0}
        options={subOptions}
        loading={subCatalog.isLoading}
        value={subSpecs}
        groupBy={(o) => (o.id === ADD_NEW_ID ? "Can't find it?" : specNameById.get(o.specializationId) ?? "")}
        filterOptions={(options, params) => {
          const filtered = filterSubs(options, params);
          const typed = params.inputValue.trim();
          const exact = typed && filtered.some((o) => nameKey(o.name) === nameKey(typed));
          filtered.push({
            id: ADD_NEW_ID,
            name: typed && !exact ? `+ Add "${typed}"` : "+ Add New Subspecialization",
            slug: "",
            specializationId: 0,
            draft: exact ? "" : typed,
          });
          return filtered;
        }}
        onChange={(_e, value, _reason, details) => {
          if (details?.option.id === ADD_NEW_ID) {
            openAddForm(details.option.draft ?? "");
            return;
          }
          setSubSpecs(value.filter((v) => v.id !== ADD_NEW_ID).slice(0, MAX_SUB_SPECS));
        }}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Sub-specialties"
            placeholder={specs.length ? "Search or add" : undefined}
            helperText={
              specs.length
                ? `Optional — up to ${MAX_SUB_SPECS}, from your selected specialties`
                : "Select a specialty first"
            }
          />
        )}
      />

      {adding && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Add a new sub-specialty</Typography>
            <Typography variant="body2" color="text.secondary">
              It is saved to the shared list so other doctors in this specialty can pick it too.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                size="small"
                label="Belongs to"
                value={newParentId}
                onChange={(e) => setNewParentId(Number(e.target.value))}
                sx={{ minWidth: 200 }}
                disabled={specs.length <= 1}
              >
                {specs.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Sub-specialty name"
                value={newName}
                autoFocus
                fullWidth
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!createSub.isPending) submitNewSub();
                  }
                }}
                error={Boolean(newError)}
                helperText={newError ?? " "}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" loading={createSub.isPending} onClick={submitNewSub}>
                Add sub-specialty
              </Button>
              <Button size="small" disabled={createSub.isPending} onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {notice && (
        <Alert severity="info" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Button
          variant="contained"
          disabled={specs.length === 0 || adding}
          loading={saveSpecialties.isPending}
          onClick={save}
        >
          Save specialties
        </Button>
        {dirty && !saveSpecialties.isPending && (
          <Typography variant="caption" color="text.secondary">
            Unsaved changes
          </Typography>
        )}
      </Stack>

      <Autocomplete
        multiple
        options={langCatalog.data ?? []}
        loading={langCatalog.isLoading}
        value={langs}
        onChange={(_e, value) => setLangs2(value.slice(0, 10))}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField {...params} label="Languages" placeholder="Languages you consult in" />
        )}
      />
      <Stack direction="row">
        <Button
          variant="outlined"
          disabled={langs.length === 0}
          loading={setLangs.isPending}
          onClick={() => setLangs.mutate(langs.map((l) => l.id))}
        >
          Save languages
        </Button>
      </Stack>
    </Stack>
  );
}
