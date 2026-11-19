"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useRef } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FiImage, FiPlus } from "react-icons/fi";
import { toast } from "sonner";
import { useHeroImages } from "../hooks";

/** Keep in step with the backend's MAX_UPLOAD_MB and hero-image cap. */
const MAX_MB = 10;
const MAX_IMAGES = 3;
const ACCEPT = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] };

/**
 * Manager for the portfolio hero background slideshow — one to three images,
 * none required. Each filled slot can be replaced or removed; the next empty
 * slot adds one. Saves straight to POST/DELETE /doctor/hero-images (the
 * signed-in doctor's own profile only). Mirrors the backend's type/size limits
 * for instant feedback; the backend re-checks authoritatively.
 */
export function HeroImagesUpload({ imageUrls }: { imageUrls?: string[] | null }) {
  const images = (imageUrls ?? []).slice(0, MAX_IMAGES);
  const { upload, remove } = useHeroImages();
  // Which slot the file picker is filling: an index replaces, null adds.
  const target = useRef<number | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        toast.error(rejections[0].errors[0]?.message ?? "That file can't be used");
        return;
      }
      const file = accepted[0];
      if (!file) return;
      const slot = target.current;
      target.current = null;
      upload.mutate(slot != null ? { file, slot } : { file });
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
    // Dropping onto the panel adds an image while there is room.
    disabled: upload.isPending,
  });

  const pick = (slot: number | null) => {
    target.current = slot;
    open();
  };

  const busySlot = upload.isPending ? (upload.variables?.slot ?? images.length) : null;
  const removingSlot = remove.isPending ? remove.variables : null;
  const canAdd = images.length < MAX_IMAGES;

  return (
    <Stack spacing={2} {...getRootProps()}>
      <input {...getInputProps()} />
      <Typography variant="body2" color="text.secondary">
        Shown softly behind your name at the top of your public profile, cycling with a slow crossfade.
        Add one, two or three landscape photos (clinic, hospital, team). PNG, JPEG or WebP, up to {MAX_MB} MB
        each. Leave empty for the plain background.
      </Typography>

      <Grid container spacing={2}>
        {Array.from({ length: MAX_IMAGES }).map((_, slot) => {
          const url = images[slot];
          const isNext = !url && slot === images.length;
          return (
            <Grid key={slot} size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  position: "relative",
                  aspectRatio: "16 / 9",
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px dashed",
                  borderColor: isDragActive && isNext ? "secondary.main" : "divider",
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                  opacity: busySlot === slot || removingSlot === slot ? 0.55 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`Hero image ${slot + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                    <FiImage size={22} />
                    <Typography variant="caption">
                      {isNext ? (isDragActive ? "Drop to add" : "Empty slot") : "Add the earlier slot first"}
                    </Typography>
                  </Stack>
                )}
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: "rgba(255,255,255,0.9)",
                    color: "text.primary",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {slot + 1}
                </Box>
              </Box>

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {url ? (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => pick(slot)}
                      loading={busySlot === slot}
                      disabled={upload.isPending || remove.isPending}
                    >
                      Replace
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => remove.mutate(slot)}
                      loading={removingSlot === slot}
                      disabled={upload.isPending || remove.isPending}
                    >
                      Remove
                    </Button>
                  </>
                ) : isNext ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<FiPlus />}
                    onClick={() => pick(null)}
                    loading={busySlot === slot}
                    disabled={!canAdd || upload.isPending || remove.isPending}
                  >
                    Add image
                  </Button>
                ) : null}
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
