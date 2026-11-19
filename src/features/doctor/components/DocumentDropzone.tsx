"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { FiFileText, FiTrash2, FiUploadCloud } from "react-icons/fi";
import type { DocType, DoctorDocument } from "@/types/doctor-portfolio";

/** Keep in step with the backend's MAX_UPLOAD_MB — a stricter client just
 *  refuses files the server would have taken. */
const MAX_MB = 10;
const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

/**
 * One labelled dropzone for a single required document type (degree / ID /
 * council). Shows uploaded files as chips (image thumbnail or a file link) with
 * a remove button. Mirrors the backend mime/size limits for UX.
 */
export function DocumentDropzone({
  label,
  docType,
  documents,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  docType: DocType;
  documents: DoctorDocument[];
  uploading?: boolean;
  onUpload: (docType: DocType, file: File) => void;
  onRemove: (id: string) => void;
}) {
  const mine = documents.filter((d) => d.docType === docType);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        toast.error(rejections[0].errors[0]?.message ?? "That file can't be used");
        return;
      }
      if (accepted[0]) onUpload(docType, accepted[0]);
    },
    [docType, onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_MB * 1024 * 1024,
    multiple: false,
  });

  const done = mine.length > 0;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        {done && <Chip size="small" color="success" variant="outlined" label="Uploaded" />}
      </Stack>

      <Box
        {...getRootProps()}
        sx={{
          border: (t) => `1.5px dashed ${t.palette.divider}`,
          borderRadius: (t) => `${t.tokens?.radius?.md ?? 8}px`,
          p: 2.5,
          textAlign: "center",
          cursor: "pointer",
          bgcolor: (t) => (isDragActive ? alpha(t.palette.primary.main, 0.06) : "transparent"),
          transition: "background-color .15s, border-color .15s",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        <input {...getInputProps()} />
        <Stack spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <FiUploadCloud size={22} />
          <Typography variant="body2">
            {isDragActive ? "Drop the file here…" : "Drag & drop or click to upload"}
          </Typography>
          <Typography variant="caption">PDF, PNG or JPEG · up to {MAX_MB} MB</Typography>
          {uploading && <Typography variant="caption">Uploading…</Typography>}
        </Stack>
      </Box>

      {mine.map((doc) => (
        <Stack
          key={doc.id}
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <FiFileText />
            <Link href={doc.fileUrl} target="_blank" rel="noopener" variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              View uploaded file
            </Link>
          </Stack>
          <IconButton size="small" aria-label="Remove document" onClick={() => onRemove(doc.id)}>
            <FiTrash2 size={16} />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}
