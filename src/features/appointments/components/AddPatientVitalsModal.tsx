"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error";
import { useAddPatientVitals } from "../hooks";
import { LocationAutocomplete } from "./LocationAutocomplete";
import type { PatientVitalsInput } from "@/types/appointment";

/** The six vitals a reading can carry — same set the patient logs. */
const VITAL_INPUTS: { key: keyof PatientVitalsInput; label: string; numeric: boolean; placeholder?: string }[] = [
  { key: "bloodPressure", label: "BP", numeric: false, placeholder: "120/80" },
  { key: "pulseRateBpm", label: "Pulse (bpm)", numeric: true },
  { key: "weightKg", label: "Weight (kg)", numeric: true },
  { key: "heightCm", label: "Height (cm)", numeric: true },
  { key: "temperatureF", label: "Temp (°F)", numeric: true },
  { key: "spo2Percent", label: "SpO₂ (%)", numeric: true },
];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Lets the doctor add a dated reading to the patient's health record from the
 * appointment's patient page. The reading is stored as a "clinic" (doctor)
 * column, sitting alongside the patient's own readings in the same table.
 */
export function AddPatientVitalsModal({
  open,
  bookingId,
  onClose,
}: {
  open: boolean;
  bookingId: string;
  onClose: () => void;
}) {
  const addVitals = useAddPatientVitals(bookingId);
  const [recordedOn, setRecordedOn] = useState(today());
  const [location, setLocation] = useState("");
  const [locError, setLocError] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const reset = () => {
    setRecordedOn(today());
    setLocation("");
    setLocError(false);
    setVals({});
    setNote("");
  };
  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    const draft: Record<string, string | number> = { recordedOn };
    let hasVital = false;
    for (const { key, numeric } of VITAL_INPUTS) {
      const raw = (vals[key] ?? "").trim();
      if (!raw) continue;
      if (numeric) {
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          draft[key] = n;
          hasVital = true;
        }
      } else {
        draft[key] = raw;
        hasVital = true;
      }
    }
    if (!location.trim()) {
      setLocError(true);
      toast.error("Add the location where this reading was taken.");
      return;
    }
    draft.location = location.trim();
    if (note.trim()) draft.note = note.trim();

    if (!hasVital) {
      toast.error("Add at least one vital before saving the reading.");
      return;
    }
    addVitals.mutate(draft as PatientVitalsInput, {
      onSuccess: () => {
        toast.success("Reading added");
        close();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Add a reading</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Date"
              type="date"
              value={recordedOn}
              onChange={(e) => setRecordedOn(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <LocationAutocomplete
              value={location}
              onChange={(v) => {
                setLocation(v);
                if (v.trim()) setLocError(false);
              }}
              required
              error={locError}
              helperText={locError ? "Location is required" : "Search Google Maps or use the current location."}
            />
          </Grid>
          {VITAL_INPUTS.map(({ key, label, numeric, placeholder }) => (
            <Grid key={String(key)} size={{ xs: 6, sm: 4 }}>
              <TextField
                label={label}
                placeholder={placeholder}
                type={numeric ? "number" : "text"}
                value={vals[key] ?? ""}
                onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
                fullWidth
              />
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={close} disabled={addVitals.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} loading={addVitals.isPending}>
          Save reading
        </Button>
      </DialogActions>
    </Dialog>
  );
}
