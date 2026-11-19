"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DocumentDropzone } from "../DocumentDropzone";
import { useDocuments } from "../../hooks";
import type { DocType } from "@/types/doctor-portfolio";

const REQUIRED: { docType: DocType; label: string }[] = [
  { docType: "degree_certificate", label: "Degree certificate" },
  { docType: "id_proof", label: "Government ID proof" },
  { docType: "council_registration", label: "Medical council registration" },
];

/**
 * Step 4 — verification documents. Three labelled dropzones for the required
 * doc types; each uploads to POST /doctor/documents.
 */
export function DocumentsStep() {
  const { list, upload, remove } = useDocuments();
  const documents = list.data ?? [];

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Upload each required document. An admin reviews these before your profile goes live.
      </Typography>
      {REQUIRED.map(({ docType, label }) => (
        <DocumentDropzone
          key={docType}
          label={label}
          docType={docType}
          documents={documents}
          uploading={upload.isPending && upload.variables?.docType === docType}
          onUpload={(dt, file) => upload.mutate({ docType: dt, file })}
          onRemove={(id) => remove.mutate(id)}
        />
      ))}
    </Stack>
  );
}
