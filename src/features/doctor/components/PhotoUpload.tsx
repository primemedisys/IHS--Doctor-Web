"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { DoctorAvatar } from "@/components/ui";
import { useUploadPhoto } from "../hooks";

/** Keep in step with the backend's MAX_UPLOAD_MB — a stricter client just
 *  refuses files the server would have taken. */
const MAX_MB = 10;
const ACCEPT = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] };

/**
 * Profile-photo picker. Drops onto POST /doctor/photo, which also updates the
 * navbar avatar live (via the hook's setUser). Mirrors the backend's mime/size
 * limits for instant UX feedback; the backend re-checks authoritatively.
 */
export function PhotoUpload({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const upload = useUploadPhoto();

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        toast.error(rejections[0].errors[0]?.message ?? "That file can't be used");
        return;
      }
      if (accepted[0]) upload.mutate(accepted[0]);
    },
    [upload],
  );

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_MB * 1024 * 1024,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <Stack
      direction="row"
      spacing={2.5}
      sx={{ alignItems: "center" }}
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <Box sx={{ position: "relative" }}>
        <DoctorAvatar name={name} src={photoUrl ?? undefined} size={88} />
      </Box>
      <Stack spacing={0.5} sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Profile photo
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isDragActive ? "Drop to upload…" : `PNG or JPEG, up to ${MAX_MB} MB.`}
        </Typography>
        <Box>
          <Button variant="outlined" size="small" onClick={open} loading={upload.isPending} sx={{ mt: 0.5 }}>
            {photoUrl ? "Change photo" : "Upload photo"}
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
