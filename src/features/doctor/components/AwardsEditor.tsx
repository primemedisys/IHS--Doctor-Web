"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FiAward, FiEdit2, FiImage, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { useAwards } from "../hooks";
import { awardSchema, type AwardInput } from "../schemas";
import type { DoctorAward } from "@/types/doctor-portfolio";

/** Keep in step with the backend's MAX_UPLOAD_MB. */
const MAX_MB = 10;
const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const EMPTY: AwardInput = { title: "", issuer: "", description: "", awardYear: "" };

const toForm = (a: DoctorAward): AwardInput => ({
  title: a.title,
  issuer: a.issuer ?? "",
  description: a.description ?? "",
  awardYear: a.awardYear != null ? String(a.awardYear) : "",
});

/**
 * Awards & achievements editor: add, edit and remove awards, each with an
 * optional issuing organisation and an optional picture (certificate / award
 * photo). Text-only awards stay valid. Writes go to the signed-in doctor's own
 * /doctor/awards rows only.
 */
export function AwardsEditor() {
  const { list, add, update, remove, uploadImage, removeImage } = useAwards();
  const [editingId, setEditingId] = useState<string | null>(null);
  const methods = useForm<AwardInput>({ resolver: zodResolver(awardSchema), defaultValues: EMPTY });
  const fileInput = useRef<HTMLInputElement>(null);
  const imageTarget = useRef<string | null>(null);
  const items = list.data ?? [];

  const startEdit = (a: DoctorAward) => {
    setEditingId(a.id);
    methods.reset(toForm(a));
  };
  const stopEdit = () => {
    setEditingId(null);
    methods.reset(EMPTY);
  };
  const submit = (values: AwardInput) => {
    if (editingId) update.mutate({ id: editingId, input: values }, { onSuccess: stopEdit });
    else add.mutate(values, { onSuccess: () => methods.reset(EMPTY) });
  };

  const pickImage = (id: string) => {
    imageTarget.current = id;
    fileInput.current?.click();
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = imageTarget.current;
    e.target.value = "";
    imageTarget.current = null;
    if (!file || !id) return;
    if (!IMAGE_TYPES.split(",").includes(file.type)) {
      toast.error("Upload a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Images must be ${MAX_MB} MB or smaller`);
      return;
    }
    uploadImage.mutate({ id, file });
  };

  const busyImageId = uploadImage.isPending ? uploadImage.variables?.id : removeImage.isPending ? removeImage.variables : null;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Awards & achievements
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Add the awards you have received. A picture of the award or certificate is optional — only upload
        images you have the right to share.
      </Typography>
      <input ref={fileInput} type="file" accept={IMAGE_TYPES} hidden onChange={onFile} />

      {items.length > 0 && (
        <Stack spacing={1}>
          {items.map((a) => (
            <Paper
              key={a.id}
              variant="outlined"
              sx={{
                p: 1.25,
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                borderColor: editingId === a.id ? "primary.main" : "divider",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: 1,
                  overflow: "hidden",
                  bgcolor: "action.hover",
                  display: "grid",
                  placeItems: "center",
                  color: "text.secondary",
                }}
              >
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <FiAward size={20} />
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                  {a.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {[a.issuer, a.awardYear].filter(Boolean).join(" · ") || "No issuer or year"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                <Tooltip title={a.imageUrl ? "Replace image" : "Add image"}>
                  <span>
                    <IconButton
                      size="small"
                      aria-label={a.imageUrl ? `Replace image for ${a.title}` : `Add image for ${a.title}`}
                      onClick={() => pickImage(a.id)}
                      disabled={busyImageId === a.id}
                    >
                      <FiImage size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
                {a.imageUrl && (
                  <Tooltip title="Remove image">
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Remove image for ${a.title}`}
                        onClick={() => removeImage.mutate(a.id)}
                        disabled={busyImageId === a.id}
                      >
                        <FiX size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label={`Edit ${a.title}`} onClick={() => startEdit(a)}>
                    <FiEdit2 size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Delete ${a.title}`}
                      onClick={() => {
                        if (editingId === a.id) stopEdit();
                        remove.mutate(a.id);
                      }}
                      disabled={remove.isPending}
                    >
                      <FiTrash2 size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <FormContainer methods={methods} onSubmit={submit}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <RHFTextField<AwardInput> name="title" label="Award title" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <RHFTextField<AwardInput> name="issuer" label="Issued by (optional)" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <RHFTextField<AwardInput> name="awardYear" label="Year" type="number" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <RHFTextField<AwardInput> name="description" label="Description (optional)" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1}>
              <Button
                type="submit"
                size="small"
                variant={editingId ? "contained" : "outlined"}
                startIcon={editingId ? undefined : <FiPlus />}
                loading={add.isPending || update.isPending}
              >
                {editingId ? "Save changes" : "Add award"}
              </Button>
              {editingId && (
                <Button size="small" onClick={stopEdit}>
                  Cancel
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </FormContainer>
    </Stack>
  );
}
