"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiEdit3, FiPlus, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error";
import { useAddClinicalNote, useClinicalNotes } from "../../hooks";
import { NOTE_TEXT_FIELDS, NOTE_VITAL_FIELDS } from "../ClinicalNoteForm";
import type { ClinicalNote, ClinicalNoteInput } from "@/types/appointment";
import type { Vitals } from "@/types/prescription";

/**
 * The clinical-notes log, read as SOAP.
 *
 * The letters in the left column are the only structure a doctor already has in
 * their head for a consultation note — Subjective, Objective, Assessment, Plan.
 * The two history fields sit inside the same run without a letter: they are
 * background, not one of the four movements.
 *
 * Notes are patient-wide and append-only; nothing here edits or deletes, which
 * is why the viewer pages one note at a time instead of offering a list to
 * manage.
 */
const SOAP_TAG: Record<string, string> = {
  complaints: "S",
  onExamination: "O",
  diagnosis: "A",
  treatment: "P",
};

const EMPTY_VITALS: Vitals = {
  bloodPressure: null,
  pulseRateBpm: null,
  weightKg: null,
  heightCm: null,
  temperatureF: null,
  spo2Percent: null,
};

/** "14 Jul '26 · 09:12" — a note is an event, so it keeps its time. */
function noteStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} · ${d.toLocaleTimeString(
    "en-IN",
    { hour: "2-digit", minute: "2-digit", hour12: false },
  )}`;
}

function NoteBody({ note }: { note: ClinicalNote }) {
  const filled = NOTE_TEXT_FIELDS.filter(({ key }) => note[key]);
  const vitals = NOTE_VITAL_FIELDS.filter(({ key }) => note.vitals?.[key] != null && note.vitals[key] !== "");

  return (
    <div className="note">
      <div className="ntop">
        <span className="nby">{note.recordedByName ?? note.doctorName ?? "Recorded"}</span>
        <span className="nwhen">{noteStamp(note.date)}</span>
      </div>

      {filled.length === 0 && vitals.length === 0 ? (
        <div className="emptyline">This note recorded no details.</div>
      ) : (
        <div className="soap">
          {filled.map(({ key, label }) => (
            <div key={key} style={{ display: "contents" }}>
              <div className="tagcol" aria-hidden>
                {SOAP_TAG[key] ?? ""}
              </div>
              <div className="field">
                <div className="k">{label}</div>
                <div className="v">{note[key]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {vitals.length > 0 && (
        <div className="nvits">
          {vitals.map(({ key, label }) => (
            <span className="nvchip" key={key}>
              <span className="k">{label}</span>
              {String(note.vitals[key])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChartNotes({ bookingId }: { bookingId: string }) {
  const { data: notes = [], isLoading } = useClinicalNotes(bookingId);
  const addNote = useAddClinicalNote(bookingId);

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<Record<string, string>>({});
  const [vitals, setVitals] = useState<Record<string, string>>({});

  /**
   * A newly appended note lands at the top, so the viewer jumps back to it —
   * adjusted during render rather than in an effect, which would show the old
   * note for a frame first.
   */
  const [topId, setTopId] = useState<string | undefined>(notes[0]?.id);
  if (notes[0]?.id !== topId) {
    setTopId(notes[0]?.id);
    setIndex(0);
  }

  const reset = () => {
    setText({});
    setVitals({});
    setOpen(false);
  };

  /** Same rule the shared form enforces: a note has to say SOMETHING. */
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
      onSuccess: () => {
        toast.success("Clinical note added");
        reset();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const note = notes[index];

  return (
    <section className="section" aria-label="Clinical notes">
      <div className="sh">
        <div className="sic" aria-hidden>
          <FiEdit3 size={16} />
        </div>
        <div className="stitle">Clinical notes</div>
        {notes.length > 0 && <span className="scount">{notes.length}</span>}
        <div className="saction">
          <button className="btn primary" onClick={() => (open ? reset() : setOpen(true))}>
            {open ? <FiX size={14} /> : <FiPlus size={14} />}
            {open ? "Cancel" : "Add note"}
          </button>
        </div>
      </div>

      <div className="sbody">
        {isLoading ? (
          <div className="emptyline">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="emptyline">
            No notes on this patient yet. The first one you write starts their log.
          </div>
        ) : (
          <>
            {notes.length > 1 && (
              <div className="nnav">
                <span className="cnt">
                  Note <b>{index + 1}</b> of {notes.length} · newest first
                </span>
                <div className="btns">
                  <button
                    className="ib"
                    onClick={() => setIndex((i) => i - 1)}
                    disabled={index === 0}
                    aria-label="Newer note"
                  >
                    <FiChevronLeft size={15} />
                  </button>
                  <button
                    className="ib"
                    onClick={() => setIndex((i) => i + 1)}
                    disabled={index >= notes.length - 1}
                    aria-label="Older note"
                  >
                    <FiChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
            {note && <NoteBody note={note} />}
          </>
        )}

        {open && (
          <div className="addwrap">
            <div className="nform">
              {NOTE_TEXT_FIELDS.map(({ key, label, placeholder }) => (
                <div
                  className="fld"
                  key={key}
                  style={key === "complaints" || key === "onExamination" ? { gridColumn: "1/-1" } : undefined}
                >
                  <label htmlFor={`note-${key}`}>{label}</label>
                  <textarea
                    id={`note-${key}`}
                    rows={2}
                    placeholder={placeholder}
                    value={text[key] ?? ""}
                    onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
                  />
                </div>
              ))}
              {NOTE_VITAL_FIELDS.map(({ key, label, placeholder }) => (
                <div className="fld mono" key={key}>
                  <label htmlFor={`note-v-${key}`}>{label}</label>
                  <input
                    id={`note-v-${key}`}
                    placeholder={placeholder}
                    value={vitals[key] ?? ""}
                    onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="nsub">
                <button className="btn primary" onClick={save} disabled={addNote.isPending}>
                  {addNote.isPending ? "Saving…" : "Save note"}
                </button>
                <span className="hint">Notes are appended to the patient&apos;s log — they can&apos;t be edited later.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
