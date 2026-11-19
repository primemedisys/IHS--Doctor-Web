"use client";

import { useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { FiDownload, FiX } from "react-icons/fi";
import { Loading, ErrorState } from "@/components/feedback";

/**
 * The SERVER-rendered PDF — the authority on what the printed page looks like.
 * `RxPreview` is the fast approximation; this is the truth, one click away.
 *
 * Rendered in an <iframe> off a blob URL rather than through `react-pdf`: every
 * target browser has a native PDF viewer, and this needs no pdf.js worker to be
 * copied into `public/` and kept in sync with the bundler.
 */
export interface RxPdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  blob: Blob | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  /** Suggested filename for the download button. */
  fileName?: string;
}

export function RxPdfPreviewDialog({
  open,
  onClose,
  title = "Preview",
  blob,
  isLoading,
  isError,
  onRetry,
  fileName = "prescription.pdf",
}: RxPdfPreviewDialogProps) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  // An object URL pins the blob in memory until it's revoked.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: { height: "90vh" } } }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {title}
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <FiX />
        </IconButton>
      </DialogTitle>
      {/* flex:1 + minHeight:0 lets the iframe fill the dialog; overflow:hidden
          kills the extra DialogContent/paper scrollbars so only the PDF viewer
          inside the iframe scrolls. */}
      <DialogContent dividers sx={{ p: 0, flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
        {isLoading ? (
          <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Loading label="Rendering the PDF…" />
          </Box>
        ) : isError || !url ? (
          <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
            <ErrorState onRetry={onRetry} />
          </Box>
        ) : (
          <Box
            component="iframe"
            src={url}
            title={title}
            sx={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          This is the exact page that prints.
        </Typography>
        <Box>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={download} disabled={!url} variant="contained" startIcon={<FiDownload />}>
            Download
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
