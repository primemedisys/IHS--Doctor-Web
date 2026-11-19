"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo } from "react";
import { FiAlertTriangle, FiEdit2, FiExternalLink } from "react-icons/fi";
import { ImageViewer } from "@/features/appointments/components/ImageViewer";
import { usePrescriptionPdf } from "@/features/prescriptions/hooks/usePrescription";
import { BUCKET_LABEL, type DocBucket } from "../bucket";
import type { ReadingItem } from "../useReadingList";
import type { SnapshotRecord } from "@/types/appointment";

/** The register's column colours, so a sheet is recognisable as its kind. */
export const KIND_COLOR: Record<DocBucket, string> = {
  prescription: "#2E7D53",
  report: "#102B5C",
  xray: "#B07714",
  mri: "#5B4CB0",
};

/** "31 Jul '26" — the sheet label's date. */
const sheetDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

/**
 * The height a sheet reserves BEFORE its content loads.
 *
 * Load-bearing, not cosmetic: without a reserved height the scrollbar grows as
 * documents stream in and the scroll position drifts under the doctor's hand.
 * With it, the scroller is its final length from the first frame.
 *
 * Images only — a PDF sizes itself by A4 aspect instead (see PAGE_ASPECT).
 */
export const SHEET_HEIGHT = 760;

/**
 * A PDF sheet is as tall as its page is, not a fixed box.
 *
 * This is what removes the SECOND scrollbar. A frame shorter than the page
 * leaves the browser's own PDF viewer to scroll the rest internally, so the
 * doctor gets one scroll inside another. Sized to A4 (1 : √2) the page fits
 * exactly, and the only scroll left is the reader's.
 *
 * A multi-page PDF still scrolls inside its frame after page one — the accepted
 * limit of rendering PDFs in a frame at all. Removing that needs pdf.js, which
 * is option B in docs/record-reader/README.md §3.1.
 */
const PAGE_ASPECT = "1 / 1.414";

/**
 * Ask the browser's PDF viewer for no chrome and a page that fits.
 *
 * `toolbar/navpanes/scrollbar` are Chrome/Edge's parameters; `zoom=page-fit` is
 * pdf.js's (Firefox). Each ignores the other's silently, so sending both is how
 * one URL fits the page in every browser.
 */
const asPageFrame = (url: string) =>
  `${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit&zoom=page-fit`;

/** A PDF rendered from an authenticated endpoint — fetched as a blob. */
function PrescriptionSheet({ id, label }: { id: string; label: string }) {
  const { data: blob, isLoading, isError, refetch } = usePrescriptionPdf(id, true);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  // An object URL pins the blob in memory until it is revoked — and a reader
  // scrolled through sixty documents would pin sixty of them.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (isLoading) return <SheetState><CircularProgress size={22} /></SheetState>;
  if (isError || !url) {
    return (
      <SheetState>
        <FiAlertTriangle size={22} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          That prescription didn&apos;t load.
        </Typography>
        <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ textTransform: "none" }}>
          Try again
        </Button>
      </SheetState>
    );
  }
  return (
    <Box
      component="iframe"
      src={asPageFrame(url)}
      title={label}
      sx={{ width: "100%", height: "100%", border: 0 }}
    />
  );
}

/** Centred state box — one shape for loading, error and empty. */
function SheetState({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      spacing={1.25}
      sx={{ height: "100%", alignItems: "center", justifyContent: "center", color: "text.secondary" }}
    >
      {children}
    </Stack>
  );
}

/**
 * ONE document in the reader's scroll: a sticky label, then the paper.
 *
 * `active` only affects the label's emphasis. Whether the content renders at all
 * is `near` — the reader sets it from an IntersectionObserver, so a patient with
 * sixty documents does not open sixty of them.
 */
export function RecordSheet({
  item,
  near,
  active,
  onEditDate,
}: {
  item: ReadingItem;
  near: boolean;
  active: boolean;
  onEditDate?: (r: SnapshotRecord) => void;
}) {
  const hue = KIND_COLOR[item.kind];
  // Bound to a local so TypeScript can narrow it — a discriminated union read
  // straight off a prop re-widens inside every callback.
  const src = item.source;
  const openUrl = src.type === "url" ? src.url : null;
  /** Paper (a PDF), as opposed to an image that wants a viewer stage. */
  const isPage = src.type === "prescription" || !src.isImage;

  return (
    <Box
      component="section"
      data-sheet-key={item.key}
      aria-label={`${sheetDate(item.date)} · ${BUCKET_LABEL[item.kind]} · ${item.label}`}
      sx={{ scrollMarginTop: 8 }}
    >
      {/* Sticky, so the doctor always knows which document they are looking at
          — a scan half-way up the viewport is otherwise unidentifiable. */}
      <Stack
        direction="row"
        spacing={1}
        sx={(t) => ({
          position: "sticky",
          top: 0,
          zIndex: 2,
          alignItems: "center",
          px: 2,
          py: 1,
          bgcolor: t.palette.background.paper,
          borderBottom: 1,
          borderColor: active ? alpha(hue, 0.5) : "divider",
          borderLeft: 3,
          borderLeftColor: hue,
        })}
      >
        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: hue, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: hue, whiteSpace: "nowrap" }}>
          {BUCKET_LABEL[item.kind]}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {item.label}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
          {sheetDate(item.date)}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* The two actions the old dialogs carried, kept per sheet. */}
        {openUrl && (
          <Tooltip title="Open in new tab">
            <IconButton size="small" component="a" href={openUrl} target="_blank" rel="noopener">
              <FiExternalLink size={15} />
            </IconButton>
          </Tooltip>
        )}
        {onEditDate && src.type === "url" && (
          <Tooltip title="Correct the date">
            <IconButton size="small" onClick={() => onEditDate(src.record)}>
              <FiEdit2 size={15} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* A page-shaped box for paper, a fixed stage for images. Both are known
          before the content loads, so the reserved height is exact either way
          and nothing shifts as documents stream in. */}
      <Box
        sx={
          isPage
            ? { width: "100%", aspectRatio: PAGE_ASPECT, bgcolor: "#fff" }
            : { height: SHEET_HEIGHT, bgcolor: "#0b0b0f" }
        }
      >
        {!near ? null : src.type === "prescription" ? (
          <PrescriptionSheet id={src.id} label={item.label} />
        ) : src.isImage ? (
          <ImageViewer url={src.url} alt={item.label} />
        ) : (
          <Box
            component="iframe"
            src={asPageFrame(src.url)}
            title={item.label}
            sx={{ width: "100%", height: "100%", border: 0, bgcolor: "#fff" }}
          />
        )}
      </Box>
    </Box>
  );
}
