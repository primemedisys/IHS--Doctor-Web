"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error";
import { useAddClinicalNote } from "../hooks";
import type { ClinicalNote, ClinicalNoteInput } from "@/types/appointment";
import type { Vitals } from "@/types/prescription";

/** The text keys of a note (excludes `vitals`). */
export type NoteTextKey = "complaints" | "onExamination" | "historyMedical" | "historySurgical" | "diagnosis" | "treatment";

/** The six structured note fields, in the order doctors expect them. */
export const NOTE_TEXT_FIELDS: { key: NoteTextKey; label: string; placeholder: string }[] = [
  { key: "complaints", label: "Complaints (C/O)", placeholder: "Chief complaints…" },
  { key: "onExamination", label: "On examination (O/E)", placeholder: "Examination findings…" },
  { key: "historyMedical", label: "History — Medical (H/O)", placeholder: "Past medical history…" },
  { key: "historySurgical", label: "History — Surgical (H/O)", placeholder: "Past surgical history…" },
  { key: "diagnosis", label: "Diagnosis", placeholder: "Provisional / final diagnosis…" },
  { key: "treatment", label: "Treatment", placeholder: "Treatment / plan / advice…" },
];

/** The six vitals inputs (BP is free text, the rest numeric). */
export const NOTE_VITAL_FIELDS: { key: keyof Vitals; label: string; numeric: boolean; placeholder?: string }[] = [
  { key: "bloodPressure", label: "BP", numeric: false, placeholder: "130/85" },
  { key: "pulseRateBpm", label: "Pulse (bpm)", numeric: true },
  { key: "weightKg", label: "Weight (kg)", numeric: true },
  { key: "heightCm", label: "Height (cm)", numeric: true },
  { key: "temperatureF", label: "Temp (°F)", numeric: true },
  { key: "spo2Percent", label: "SpO₂ (%)", numeric: true },
];

const EMPTY_VITALS: Vitals = {
  bloodPressure: null,
  pulseRateBpm: null,
  weightKg: null,
  heightCm: null,
  temperatureF: null,
  spo2Percent: null,
};

/**
 * The add-a-clinical-note form (text details + vitals). Shared by the inline
 * section and the modal opened from the prescription composer. Enforces the
 * "at least one detail" rule and, on success, hands the created note back so the
 * caller can (e.g.) prefill the prescription's vitals.
 */
export function ClinicalNoteForm({
  bookingId,
  onSaved,
  onCancel,
}: {
  bookingId: string;
  onSaved?: (note: ClinicalNote) => void;
  onCancel?: () => void;
}) {
  const addNote = useAddClinicalNote(bookingId);
  const [text, setText] = useState<Record<string, string>>({});
  const [vitals, setVitals] = useState<Record<string, string>>({});

  const save = () => {
    const body: ClinicalNoteInput = {};
    let hasDetail = false;

    for (const { key } of NOTE_TEXT_FIELDS) {
      const v = (text[key] ?? "").trim();
      if (v) {
        body[key] = v;
        hasDetail = true;
      }
    }

    const vitalsBody: Vitals = { ...EMPTY_VITALS };
    for (const { key, numeric } of NOTE_VITAL_FIELDS) {
      const raw = (vitals[key] ?? "").trim();
      if (!raw) continue;
      if (numeric) {
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          vitalsBody[key] = n as never;
          hasDetail = true;
        }
      } else {
        vitalsBody[key] = raw as never;
        hasDetail = true;
      }
    }
    body.vitals = vitalsBody;

    if (!hasDetail) {
      toast.error("Add at least one detail before saving the note.");
      return;
    }
    addNote.mutate(body, {
      onSuccess: (note) => {
        toast.success("Clinical note added");
        onSaved?.(note);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <Box>
      <Grid container spacing={1.5}>
        {NOTE_TEXT_FIELDS.map(({ key, label, placeholder }) => (
          <Grid key={key} size={{ xs: 12, sm: 6 }}>
            <TextField
              label={label}
              placeholder={placeholder}
              value={text[key] ?? ""}
              onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Vitals
        </Typography>
      </Divider>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
        {NOTE_VITAL_FIELDS.map(({ key, label, numeric, placeholder }) => (
          <TextField
            key={key}
            label={label}
            placeholder={placeholder}
            type={numeric ? "number" : "text"}
            value={vitals[key] ?? ""}
            onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))}
            size="small"
            sx={{ width: 128 }}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 2 }}>
        {onCancel && (
          <Button color="inherit" onClick={onCancel} disabled={addNote.isPending} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
        )}
        <Button variant="contained" onClick={save} loading={addNote.isPending} sx={{ textTransform: "none", fontWeight: 700 }}>
          Save note
        </Button>
      </Stack>
    </Box>
  );
}
