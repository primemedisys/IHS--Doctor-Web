"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiChevronLeft, FiChevronRight, FiPlus } from "react-icons/fi";
import { useClinicalNotes } from "../hooks";
import { ClinicalNoteForm, NOTE_TEXT_FIELDS, NOTE_VITAL_FIELDS } from "./ClinicalNoteForm";
import type { ClinicalNote } from "@/types/appointment";

export function noteDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * The patient's clinical-notes log for this appointment's patient. Shows ONE
 * note at a time (latest first) with previous/next navigation, plus an inline
 * form to append a new one (details + vitals). Append-only.
 */
export function ClinicalNotesSection({ bookingId }: { bookingId: string }) {
  const { data: notes = [], isLoading, isError } = useClinicalNotes(bookingId);
  const [adding, setAdding] = useState(false);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, color: "text.secondary" }}>
          Tests &amp; Reports
        </Typography>
        {!adding && (
          <Button size="small" variant="outlined" startIcon={<FiPlus />} onClick={() => setAdding(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Add
          </Button>
        )}
      </Stack>

      {adding && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: (t) => `${t.tokens.radius.md}px` }}>
          <ClinicalNoteForm bookingId={bookingId} onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </Paper>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : isError ? (
        <Typography variant="body2" color="error">
          Couldn&apos;t load tests &amp; reports.
        </Typography>
      ) : notes.length === 0 ? (
        !adding && (
          <Typography variant="body2" color="text.secondary">
            No tests &amp; reports yet. Add the first one for this patient.
          </Typography>
        )
      ) : (
        <NotesTimeline notes={notes} />
      )}
    </Box>
  );
}

/** One note at a time, newest first, with previous (older) / next (newer) nav. */
function NotesTimeline({ notes }: { notes: ClinicalNote[] }) {
  const [index, setIndex] = useState(0);
  // Jump back to the latest whenever a new note is prepended (adjust-on-render).
  const [topId, setTopId] = useState(notes[0]?.id);
  if (notes[0]?.id !== topId) {
    setTopId(notes[0]?.id);
    setIndex(0);
  }

  const clamped = Math.min(index, notes.length - 1);
  const note = notes[clamped];

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<FiChevronLeft />}
          aria-label="Previous (older) note"
          disabled={clamped >= notes.length - 1}
          onClick={() => setIndex(clamped + 1)}
          sx={{ textTransform: "none", fontWeight: 700, color: "text.secondary" }}
        >
          Previous
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          Note {notes.length - clamped} of {notes.length}
          {clamped === 0 ? " · latest" : ""}
        </Typography>
        <Button
          size="small"
          color="inherit"
          endIcon={<FiChevronRight />}
          aria-label="Next (newer) note"
          disabled={clamped <= 0}
          onClick={() => setIndex(clamped - 1)}
          sx={{ textTransform: "none", fontWeight: 700, color: "text.secondary" }}
        >
          Next
        </Button>
      </Stack>
      <NoteCard note={note} />
    </Box>
  );
}

/** One dated note: header (date + author), its filled text fields, then vitals. */
function NoteCard({ note }: { note: ClinicalNote }) {
  const rows = NOTE_TEXT_FIELDS.map(({ key, label }) => ({
    label,
    value: note[key as keyof ClinicalNote] as string | null,
  })).filter((r) => r.value && String(r.value).trim() !== "");

  const vitals = NOTE_VITAL_FIELDS.map(({ key, label }) => ({ label, value: note.vitals?.[key] })).filter(
    (r) => r.value !== null && r.value !== undefined && String(r.value).trim() !== "",
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: (t) => `${t.tokens.radius.md}px` }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {noteDateLabel(note.date)}
        </Typography>
        {note.doctorName && <Chip size="small" variant="outlined" label={note.doctorName} />}
      </Stack>
      <Divider sx={{ mb: 1 }} />

      {rows.length > 0 && (
        <Stack spacing={1}>
          {rows.map((r) => (
            <Box key={r.label}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {r.label}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {r.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {vitals.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: rows.length > 0 ? 1.5 : 0 }}>
          {vitals.map((v) => (
            <Chip key={v.label} size="small" variant="outlined" label={`${v.label}: ${v.value}`} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
