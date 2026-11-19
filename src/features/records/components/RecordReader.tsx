"use client";

import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { BUCKETS, BUCKET_LABEL, type DocBucket } from "../bucket";
import { KIND_COLOR, RecordSheet, SHEET_HEIGHT } from "./RecordSheet";
import type { ReadingItem } from "../useReadingList";
import type { SnapshotRecord } from "@/types/appointment";

/**
 * How far outside the viewport a sheet still counts as "near" and renders its
 * content. A little over one sheet's height, so the next document is ready by
 * the time the doctor scrolls to it and the one before it is still warm.
 */
const NEAR_MARGIN = `${Math.round(SHEET_HEIGHT * 1.2)}px`;

/** "31 Jul '26" */
const shortDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

/**
 * The whole record as ONE scroll.
 *
 * Opens at the document that was clicked and keeps going: older documents
 * below, newer ones above. Prescriptions, reports, scans — every kind in one
 * column, so reading a patient's history is a scroll rather than eight
 * open/close cycles.
 *
 * Three things carry it:
 *
 * **Reserved height.** Every sheet occupies its final height before its content
 * loads, so the scrollbar is the right length from the first frame and nothing
 * shifts under the doctor's hand as documents stream in.
 *
 * **Near, not all.** An IntersectionObserver marks the sheets around the
 * viewport; only those render an image, a frame or a fetch. A patient with sixty
 * documents opens as fast as one with three.
 *
 * **Keys, not indices.** The current sheet is tracked by its key, so correcting
 * a document's date — which re-sorts the list — leaves the doctor on the
 * document they were reading rather than on whatever slid into that position.
 */
export function RecordReader({
  open,
  items,
  startKey,
  patientName,
  onClose,
  onEditDate,
}: {
  open: boolean;
  items: ReadingItem[];
  /** The document to open at. Falsy → the newest. */
  startKey: string | null;
  patientName: string | null;
  onClose: () => void;
  onEditDate?: (r: SnapshotRecord) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [kind, setKind] = useState<DocBucket | "all">("all");
  const [nearKeys, setNearKeys] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(startKey);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  /** Re-seeded whenever the reader is opened afresh (adjust-state-during-render). */
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const visible = useMemo(
    () => (kind === "all" ? items : items.filter((i) => i.kind === kind)),
    [items, kind],
  );

  if (open && seededFor !== startKey) {
    setSeededFor(startKey);
    setActiveKey(startKey);
    // The clicked sheet must render immediately — waiting for the observer to
    // fire would show an empty box for a frame on the one document the doctor
    // actually asked for.
    setNearKeys(new Set(startKey ? [startKey] : []));
    setKind("all");
  }

  /**
   * One observer for the whole scroller, attached per sheet by a callback ref.
   *
   * `nearKeys` GROWS and is never pruned while the reader is open: a document
   * already fetched costs nothing to keep mounted, and unmounting it would
   * throw away a blob the doctor is likely to scroll back to. The set dies with
   * the dialog.
   */
  const sheetRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const arrived: string[] = [];
          let top: { key: string; y: number } | null = null;
          for (const e of entries) {
            const key = (e.target as HTMLElement).dataset.sheetKey;
            if (!key) continue;
            if (e.isIntersecting) {
              arrived.push(key);
              const y = e.boundingClientRect.top;
              // The sheet nearest the top of the viewport is the one being read.
              if (!top || Math.abs(y) < Math.abs(top.y)) top = { key, y };
            }
          }
          if (arrived.length) setNearKeys((prev) => new Set([...prev, ...arrived]));
          if (top) setActiveKey(top.key);
        },
        { root: scrollerRef.current, rootMargin: NEAR_MARGIN, threshold: 0 },
      );
    }
    observerRef.current.observe(node);
  }, []);

  // The observer belongs to one open session — a stale root keeps firing at a
  // scroller that no longer exists.
  useEffect(() => {
    if (!open) {
      observerRef.current?.disconnect();
      observerRef.current = null;
    }
  }, [open]);

  const jumpTo = useCallback((key: string) => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-sheet-key="${CSS.escape(key)}"]`);
    if (!el) return;
    setNearKeys((prev) => new Set([...prev, key]));
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    setActiveKey(key);
  }, []);

  // Open AT the clicked document — instantly, not scrolled to. A reader that
  // animates past four documents on open is disorienting.
  useEffect(() => {
    if (!open || !startKey) return;
    const id = requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-sheet-key="${CSS.escape(startKey)}"]`,
      );
      el?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [open, startKey]);

  /** ↑/↓ move sheet to sheet, so the record is readable without a mouse. */
  const step = useCallback(
    (by: 1 | -1) => {
      const at = visible.findIndex((i) => i.key === activeKey);
      const next = visible[(at < 0 ? 0 : at) + by];
      if (next) jumpTo(next.key);
    },
    [visible, activeKey, jumpTo],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    }
  };

  const oldest = items[items.length - 1];
  const newest = items[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      onKeyDown={onKeyDown}
      slotProps={{ paper: { sx: { height: fullScreen ? "100%" : "92vh", overflow: "hidden" } } }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {patientName ?? "Patient"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {items.length} {items.length === 1 ? "document" : "documents"}
            {kind !== "all" && ` · showing ${visible.length} ${BUCKET_LABEL[kind].toLowerCase()}`}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <TextField
          select
          size="small"
          value={kind}
          onChange={(e) => setKind(e.target.value as DocBucket | "all")}
          aria-label="Filter by document kind"
          sx={{ width: 170, "& .MuiInputBase-root": { fontSize: 13, fontWeight: 600 } }}
        >
          <MenuItem value="all">All documents</MenuItem>
          {BUCKETS.map((b) => (
            <MenuItem key={b.key} value={b.key} disabled={!items.some((i) => i.kind === b.key)}>
              {b.label}
            </MenuItem>
          ))}
        </TextField>

        <IconButton onClick={onClose} aria-label="Close reader">
          <FiX size={18} />
        </IconButton>
      </Stack>

      <Stack direction="row" sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* The rail — every document at a glance, and a jump to any of them. */}
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            width: 168,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            overflowY: "auto",
            py: 1,
          }}
        >
          {visible.map((i) => (
            <Box
              key={i.key}
              component="button"
              onClick={() => jumpTo(i.key)}
              aria-current={i.key === activeKey ? "true" : undefined}
              sx={(t) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
                px: 1.5,
                py: 0.9,
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                bgcolor: i.key === activeKey ? t.palette.action.selected : "transparent",
                borderLeft: 3,
                borderLeftColor: i.key === activeKey ? KIND_COLOR[i.kind] : "transparent",
                "&:hover": { bgcolor: t.palette.action.hover },
              })}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: KIND_COLOR[i.kind], flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }} noWrap>
                  {i.label}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
                  {shortDate(i.date)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box ref={scrollerRef} sx={{ flexGrow: 1, minWidth: 0, overflowY: "auto", overflowAnchor: "auto" }}>
          {visible.length === 0 ? (
            <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", p: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No {kind === "all" ? "documents" : BUCKET_LABEL[kind].toLowerCase()} on file for this patient.
              </Typography>
            </Stack>
          ) : (
            <>
              {visible.map((i) => (
                <Box key={i.key} ref={sheetRef} data-sheet-key={i.key}>
                  <RecordSheet
                    item={i}
                    near={nearKeys.has(i.key)}
                    active={i.key === activeKey}
                    onEditDate={onEditDate}
                  />
                </Box>
              ))}
              {/* Without this a doctor cannot tell "the record ends here" from
                  "the next one hasn't loaded yet". */}
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", textAlign: "center", py: 3 }}
              >
                That&apos;s the whole record — {items.length}{" "}
                {items.length === 1 ? "document" : "documents"}
                {newest && oldest && newest !== oldest
                  ? `, ${shortDate(newest.date)} to ${shortDate(oldest.date)}`
                  : ""}
                .
              </Typography>
            </>
          )}
        </Box>
      </Stack>
    </Dialog>
  );
}
