"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { useShowcaseImage } from "../hooks";

/** Keep in step with the backend's MAX_UPLOAD_MB — a stricter client just
 *  refuses files the server would have taken. */
const MAX_MB = 10;
const ACCEPT = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] };
const STOCK_IMAGE = "/clinic_stock.png";

/**
 * Picker for the "Why Choose <name>" section image. Drops onto
 * POST /doctor/showcase-image; "Use standard image" DELETEs it so the public
 * page falls back to the bundled stock picture. Mirrors the backend's
 * mime/size limits for instant UX feedback; the backend re-checks
 * authoritatively.
 */
export function ShowcaseImageUpload({ imageUrl }: { imageUrl?: string | null }) {
  const { upload, remove } = useShowcaseImage();

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
    <Stack spacing={2} {...getRootProps()}>
      <input {...getInputProps()} />
      <Box
        sx={{
          position: "relative",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px dashed",
          borderColor: isDragActive ? "secondary.main" : "divider",
          aspectRatio: "16 / 10",
          bgcolor: "action.hover",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || STOCK_IMAGE}
          alt="Why Choose section preview"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {isDragActive
          ? "Drop to upload…"
          : `Shown beside "Why Choose" on your public profile. PNG or JPEG, up to ${MAX_MB} MB.${imageUrl ? "" : " Currently using the standard image."}`}
      </Typography>
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" size="small" onClick={open} loading={upload.isPending}>
          {imageUrl ? "Change image" : "Upload image"}
        </Button>
        {imageUrl ? (
          <Button
            variant="outlined"
            size="small"
            color="inherit"
            onClick={() => remove.mutate()}
            loading={remove.isPending}
          >
            Use standard image
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
