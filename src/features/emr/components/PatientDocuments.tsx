"use client";

/**
 * The patient's documents in the workbench — exactly what the server allowed
 * (GET /doctor/emr/patients/:id/documents): documents this doctor filed,
 * documents in a consent category the patient granted, and documents shared
 * one-by-one through a document request. A locked document is never in the
 * response, so nothing here hides or unhides anything; the category's access
 * strip (OthersHiddenLine, above each section) is where the doctor asks.
 */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { getErrorMessage } from "@/utils/error";
import { documentGroupOf, documentKindLabel, fileTypeLabel, DOC_GROUP_LABEL, type DocGroup } from "@/features/records/documentKinds";
import { usePatientDocuments } from "../hooks";
import { emrService } from "../services/emr.service";
import { dayLabel, instantLabel } from "../format";
import type { PatientDocument } from "@/types/emr";

const CATEGORY_LABEL: Record<string, string> = {
  medications: "Prescriptions & medicines",
  investigations: "Tests & reports",
};

/** Why this doctor can see the document — shown on every row. */
export function accessChip(d: PatientDocument): { label: string; color: "success" | "info" | "default" } {
  switch (d.access.via) {
    case "own":
      return { label: "Filed by you", color: "default" };
    case "category":
      return { label: `Patient approved · ${CATEGORY_LABEL[d.access.category] ?? d.access.category}`, color: "success" };
    case "document":
      return { label: `Shared by the patient · until ${instantLabel(d.access.until)}`, color: "info" };
    default:
      return { label: "Shared", color: "default" };
  }
}

/** Who added it, in words. */
export function sourceLabel(d: PatientDocument): string {
  if (d.source === "patient") return "Uploaded by the patient";
  if (d.source === "diagnostic_lab") return `From ${d.recordedBy?.name ?? "a diagnostic lab"}`;
  if (d.source === "clinic") return `Added by ${d.recordedBy?.name ?? "a clinic"}`;
  if (d.source === "doctor") return `Added by ${d.recordedBy?.name ?? "a doctor"}`;
  return "Added by IHS support";
}

const isImage = (d: PatientDocument, type: string) =>
  d.mimeType?.startsWith("image/") || /^(PNG|JPE?G|GIF|WEBP|BMP|AVIF)$/.test(type);
const isPdf = (d: PatientDocument, type: string) => d.mimeType === "application/pdf" || type === "PDF";

/**
 * The documents of the given sections, grouped. `groups` decides which part of
 * the workbench shows what (prescriptions under Prescriptions, reports and
 * other documents under Tests & reports), so nothing is listed twice.
 */
export function PatientDocumentsList({ patientId, groups }: { patientId: string; groups: DocGroup[] }) {
  const q = usePatientDocuments(patientId);
  const [viewing, setViewing] = useState<PatientDocument | null>(null);

  if (q.isLoading) return <Typography variant="body2" color="text.secondary">Loading documents…</Typography>;
  if (q.isError) return <Typography variant="body2" color="error">{getErrorMessage(q.error)}</Typography>;
  const docs = q.data ?? [];

  return (
    <Stack spacing={1.25}>
      {groups.map((g) => {
        const rows = docs.filter((d) => documentGroupOf(d) === g);
        return (
          <Box key={g}>
            <Typography variant="overline" color="text.secondary" sx={{ display: "block", lineHeight: 1.8 }}>
              {DOC_GROUP_LABEL[g]} · {rows.length}
            </Typography>
            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents you can view in this section.
              </Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, border: 1, borderColor: "divider", borderRadius: (t) => `${t.tokens.radius.lg}px`, overflow: "hidden" }}>
                {rows.map((d) => (
                  <DocumentRow key={d.id} d={d} onView={() => setViewing(d)} />
                ))}
              </Box>
            )}
          </Box>
        );
      })}
      {viewing && <DocumentViewer d={viewing} onClose={() => setViewing(null)} />}
    </Stack>
  );
}

function DocumentRow({ d, onView }: { d: PatientDocument; onView: () => void }) {
  const chip = accessChip(d);
  const type = fileTypeLabel(d);
  const title = d.tag?.trim() || documentKindLabel(d);
  const meta = [
    documentKindLabel(d),
    d.recordDate ? `Dated ${dayLabel(d.recordDate)}` : null,
    d.uploadedAt ? `Uploaded ${instantLabel(d.uploadedAt).split(",")[0]}` : null,
    d.location,
    d.doctorName ? (/^dr/i.test(d.doctorName) ? d.doctorName : `Dr. ${d.doctorName}`) : null,
    type,
  ].filter(Boolean) as string[];
  return (
    <Box
      component="li"
      sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}
    >
      <Box
        sx={(t) => ({
          width: 34,
          height: 34,
          flexShrink: 0,
          display: { xs: "none", sm: "grid" },
          placeItems: "center",
          borderRadius: `${t.tokens.radius.md}px`,
          bgcolor: t.palette.grey[100],
          color: "primary.main",
        })}
      >
        <Icon name={documentGroupOf(d) === "prescriptions" ? "FiFileText" : documentGroupOf(d) === "investigations" ? "FiActivity" : "FiFolder"} />
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography component="div" sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }} noWrap title={title}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.4, overflowWrap: "anywhere" }}>
          {meta.join(" · ")}
        </Typography>
        {d.description && (
          <Typography variant="caption" component="div" sx={{ lineHeight: 1.4, mt: 0.25, overflowWrap: "anywhere" }}>
            {d.description}
          </Typography>
        )}
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          <Chip size="small" variant="outlined" color={chip.color} label={chip.label} />
          <Chip size="small" variant="outlined" label={sourceLabel(d)} />
          {d.source === "patient" && documentGroupOf(d) === "prescriptions" && (
            <Chip size="small" variant="outlined" color="warning" label="Not an IHS-signed prescription" />
          )}
        </Stack>
      </Box>
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
        <Tooltip title="View">
          <IconButton size="small" onClick={onView} aria-label={`View ${title}`}>
            <Icon name="FiEye" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton size="small" onClick={() => void downloadDocument(d, title)} aria-label={`Download ${title}`}>
            <Icon name="FiDownload" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

/** The file as a Blob: a signed link is fetched directly, a shared document through its audited stream. */
async function documentBlob(d: PatientDocument): Promise<Blob> {
  if (d.access.via === "document") return emrService.sharedRecordFile(d.access.requestId, d.id);
  if (!d.fileUrl) throw new Error("This document has no file to open");
  const res = await fetch(d.fileUrl, { credentials: "omit" });
  if (!res.ok) throw new Error(res.status === 403 ? "The link expired — reopen the patient to refresh it" : "The file could not be opened");
  return res.blob();
}

export async function downloadDocument(d: PatientDocument, title: string) {
  try {
    const blob = await documentBlob(d);
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    const ext = fileTypeLabel(d)?.toLowerCase();
    a.download = d.originalName || `${title.replace(/[^\w\- ]+/g, "").trim() || "document"}${ext ? `.${ext}` : ""}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
}

export function DocumentViewer({ d, onClose }: { d: PatientDocument; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const type = fileTypeLabel(d) ?? "";
  const title = d.tag?.trim() || documentKindLabel(d);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    documentBlob(d)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e)));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [d]);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6, overflowWrap: "anywhere" }}>
        {title}
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <Icon name="FiX" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 320 }}>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : !src ? (
          <Typography color="text.secondary">Opening…</Typography>
        ) : isImage(d, type) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={title} style={{ display: "block", maxWidth: "100%", margin: "0 auto" }} />
        ) : isPdf(d, type) ? (
          <Box component="iframe" src={src} title={title} sx={{ width: "100%", height: "70vh", border: 0 }} />
        ) : (
          <Typography color="text.secondary">This file type can&apos;t be previewed here — download it to open.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void downloadDocument(d, title)} startIcon={<Icon name="FiDownload" />}>Download</Button>
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
