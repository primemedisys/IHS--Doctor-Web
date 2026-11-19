"use client";

/**
 * Typed-but-not-yet-saved input in the Workbench's current consultation.
 *
 * Each section with a form (complaint, examinations, history, diagnosis,
 * investigations, notes, follow-up, medication order) reports here while it
 * holds unsaved input, with a `flush` that saves it through that section's OWN
 * save path (same API, same validation). "Save & Generate Prescription" flushes
 * them all before anything is generated, so no typed value is lost or skipped.
 *
 * `flush` rejects with a message when the section can't be saved as typed (a
 * required field is empty) — the input stays on screen for the doctor to fix.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

export interface UnsavedEntry {
  /** Section name the doctor recognises, e.g. "Chief Complaint". */
  label: string;
  /** DOM id of the section, to scroll to it when its save fails. */
  sectionId: string;
  flush: () => Promise<void>;
}

interface Registry {
  set: (key: string, entry: UnsavedEntry | null) => void;
  list: () => UnsavedEntry[];
}

const Ctx = createContext<Registry | null>(null);

export function UnsavedWorkProvider({ children }: { children: ReactNode }) {
  const map = useRef(new Map<string, UnsavedEntry>());
  const registry = useMemo<Registry>(
    () => ({
      set: (key, entry) => {
        if (entry) map.current.set(key, entry);
        else map.current.delete(key);
      },
      list: () => [...map.current.values()],
    }),
    [],
  );
  return <Ctx.Provider value={registry}>{children}</Ctx.Provider>;
}

export const useUnsavedRegistry = () => useContext(Ctx);

/**
 * Report this section's unsaved input (or `null` when there is none). Updated
 * after every render, so `flush` always sees the latest typed values.
 */
export function useUnsavedWork(key: string, entry: UnsavedEntry | null) {
  const registry = useContext(Ctx);
  useEffect(() => {
    registry?.set(key, entry);
  });
  useEffect(() => () => registry?.set(key, null), [registry, key]);
}

/** A section's error, raised by `flush`, with the section name in front. */
export const unsavedError = (label: string, message: string) => new Error(`${label}: ${message}`);
