"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FiPlus, FiX } from "react-icons/fi";

const MAX_LINES = 20;

/**
 * Strip a leading "1." / "2)" / "3 -" so a line already carrying its number
 * doesn't end up double-numbered on the next save.
 */
const stripNumber = (line: string) => line.replace(/^\s*\d+\s*[.)\-–]\s*/, "").trim();

/**
 * Stored text → editable rows.
 *
 * Legacy drafts hold free-form advice (one paragraph, or lines the doctor typed
 * by hand), so every existing prescription has to survive this: a blank field
 * opens one empty row, and a paragraph opens as a single row rather than being
 * shredded on punctuation.
 */
export function adviceToLines(advice: string): string[] {
  const lines = advice
    .split(/\r?\n/)
    .map(stripNumber)
    .filter((l) => l !== "");
  return lines.length ? lines : [""];
}

/**
 * Rows → stored text, numbered.
 *
 * The numbers are baked into the saved string on purpose. `advice` is one TEXT
 * column that the PDF renderer prints verbatim under `white-space: pre-wrap`,
 * so numbering here means the printed page, the emailed copy and the read-only
 * record all show "1. … 2. …" without a schema change or a second endpoint.
 * Blank rows are dropped, so the numbering is always contiguous.
 */
export function linesToAdvice(lines: string[]): string {
  const kept = lines.map((l) => l.trim()).filter(Boolean);
  return kept.map((l, i) => `${i + 1}. ${l}`).join("\n");
}

/**
 * Editable rows over a single numbered text column.
 *
 * The rows CANNOT be derived from the stored string on every render: an empty
 * row serializes to nothing, so "add a line" would round-trip straight back to
 * the list you started with and the button would appear dead. So the rows are
 * local state, and the stored text is the projection of them — blank lines live
 * here, never on the wire.
 *
 * The ref is what keeps the two honest. It records the text this component last
 * produced, so an incoming `value` that differs must have come from somewhere
 * else (a refetch, a template switch, an amendment) and re-seeds the rows;
 * an echo of our own save does not, and so cannot eat a half-typed line.
 */
export function useNumberedLines(value: string, onChange: (next: string) => void) {
  const [lines, setLines] = useState<string[]>(() => adviceToLines(value));
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value === lastCommitted.current) return;
    lastCommitted.current = value;
    setLines(adviceToLines(value));
  }, [value]);

  const commit = useCallback(
    (next: string[]) => {
      setLines(next);
      const text = linesToAdvice(next);
      lastCommitted.current = text;
      onChange(text);
    },
    [onChange],
  );

  return { lines, commit };
}

export interface AdviceLinesProps {
  /** The stored advice text (numbered, newline-separated). */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

/**
 * Advice as a numbered list: type line 1, click "Add advice" (or press Enter)
 * for line 2. Replaces the single free-text box, which gave the doctor no
 * structure and printed as one grey paragraph.
 */
export function AdviceLines({ value, onChange, disabled }: AdviceLinesProps) {
  const { lines, commit } = useNumberedLines(value, onChange);

  const setAt = (i: number, text: string) => commit(lines.map((l, j) => (j === i ? text : l)));

  const addLine = () => {
    if (lines.length >= MAX_LINES) return;
    commit([...lines, ""]);
    // Focus the row we just created. The commit above re-renders from props, so
    // the node exists by the time this runs on the next frame.
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>("[data-advice-row] input");
      inputs[inputs.length - 1]?.focus();
    });
  };

  const removeAt = (i: number) => {
    const next = lines.filter((_, j) => j !== i);
    commit(next.length ? next : [""]);
  };

  return (
    <Stack spacing={1}>
      {lines.map((line, i) => (
        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "center" }} data-advice-row>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              minWidth: 22,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {i + 1}.
          </Typography>
          <TextField
            size="small"
            fullWidth
            disabled={disabled}
            value={line}
            placeholder={i === 0 ? "e.g. Avoid forward bending" : "Next advice"}
            onChange={(e) => setAt(i, e.target.value)}
            slotProps={{ htmlInput: { "aria-label": `Advice ${i + 1}` } }}
            // Enter moves to the next line — the way a numbered list behaves.
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (i === lines.length - 1) addLine();
              else
                requestAnimationFrame(() => {
                  const inputs = document.querySelectorAll<HTMLInputElement>("[data-advice-row] input");
                  inputs[i + 1]?.focus();
                });
            }}
          />
          <IconButton
            size="small"
            disabled={disabled || (lines.length === 1 && !lines[0])}
            onClick={() => removeAt(i)}
            aria-label={`Remove advice ${i + 1}`}
            sx={{ flexShrink: 0 }}
          >
            <FiX />
          </IconButton>
        </Stack>
      ))}

      <Button
        size="small"
        variant="outlined"
        startIcon={<FiPlus />}
        onClick={addLine}
        disabled={disabled || lines.length >= MAX_LINES}
        sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
      >
        Add advice
      </Button>
      {lines.length >= MAX_LINES && (
        <Typography variant="caption" color="text.secondary">
          Maximum {MAX_LINES} advice lines.
        </Typography>
      )}
    </Stack>
  );
}
