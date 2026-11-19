"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FiArrowDown, FiArrowUp, FiCamera, FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { useTestimonials } from "../hooks";
import { testimonialSchema, type TestimonialInput } from "../schemas";
import type { DoctorTestimonial } from "@/types/doctor-portfolio";

const MAX_MB = 10;
const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const EMPTY: TestimonialInput = { patientName: "", reviewText: "", rating: 5, reviewDate: "", isVisible: true };
const today = () => new Date().toISOString().slice(0, 10);

const toForm = (t: DoctorTestimonial): TestimonialInput => ({
  patientName: t.patientName,
  reviewText: t.reviewText,
  rating: t.rating,
  reviewDate: t.reviewDate ?? "",
  isVisible: t.isVisible,
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/**
 * Doctor-managed patient testimonials for the public portfolio. The DOCTOR
 * enters these (patients do not publish through this feature); the portfolio
 * labels them as shared by the doctor, not as verified reviews. Entries can be
 * edited, hidden/shown, re-ordered and given a patient photo — the photo only
 * after the doctor confirms the patient agreed to it being shown publicly.
 */
export function TestimonialsEditor() {
  const { list, add, update, remove, uploadPhoto, removePhoto, reorder } = useTestimonials();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<DoctorTestimonial | null>(null);
  const [consented, setConsented] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string | null>(null);
  const methods = useForm<TestimonialInput>({ resolver: zodResolver(testimonialSchema), defaultValues: EMPTY });
  const items = list.data ?? [];

  const startEdit = (t: DoctorTestimonial) => {
    setEditingId(t.id);
    methods.reset(toForm(t));
  };
  const stopEdit = () => {
    setEditingId(null);
    methods.reset(EMPTY);
  };
  const submit = (values: TestimonialInput) => {
    if (editingId) update.mutate({ id: editingId, patch: values }, { onSuccess: stopEdit });
    else add.mutate(values, { onSuccess: () => methods.reset(EMPTY) });
  };

  const move = (index: number, delta: -1 | 1) => {
    const ids = items.map((t) => t.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const openConsent = (t: DoctorTestimonial) => {
    setConsented(false);
    setConsentFor(t);
  };
  const choosePhoto = () => {
    if (!consentFor || !consented) return;
    photoTarget.current = consentFor.id;
    setConsentFor(null);
    fileInput.current?.click();
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = photoTarget.current;
    e.target.value = "";
    photoTarget.current = null;
    if (!file || !id) return;
    if (!IMAGE_TYPES.split(",").includes(file.type)) {
      toast.error("Upload a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Images must be ${MAX_MB} MB or smaller`);
      return;
    }
    uploadPhoto.mutate({ id, file });
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Patient feedback
      </Typography>
      <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
        You add and manage these yourself. They appear on your public profile labelled{" "}
        <strong>“Shared by the doctor”</strong> — not as verified reviews. Only add feedback a patient actually
        gave you, and use a first name or initials unless the patient agreed to be named.
      </Alert>
      <input ref={fileInput} type="file" accept={IMAGE_TYPES} hidden onChange={onFile} />

      {items.length > 0 && (
        <Stack spacing={1}>
          {items.map((t, i) => {
            const photoBusy =
              (uploadPhoto.isPending && uploadPhoto.variables?.id === t.id) ||
              (removePhoto.isPending && removePhoto.variables === t.id);
            return (
              <Paper
                key={t.id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  display: "flex",
                  gap: 1.5,
                  alignItems: "flex-start",
                  opacity: t.isVisible ? 1 : 0.65,
                  borderColor: editingId === t.id ? "primary.main" : "divider",
                }}
              >
                <Avatar src={t.patientPhotoUrl ?? undefined} alt="" sx={{ width: 44, height: 44, fontWeight: 700 }}>
                  {initials(t.patientName)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                      {t.patientName}
                    </Typography>
                    <Rating value={t.rating} readOnly size="small" />
                    {!t.isVisible && (
                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                        Hidden
                      </Typography>
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {t.reviewText}
                  </Typography>
                </Box>
                <Stack spacing={0.5} sx={{ alignItems: "flex-end", flexShrink: 0 }}>
                  <Tooltip title={t.isVisible ? "Shown on your profile" : "Hidden from your profile"}>
                    <Switch
                      size="small"
                      checked={t.isVisible}
                      onChange={(_, checked) => update.mutate({ id: t.id, patch: { isVisible: checked } })}
                      slotProps={{ input: { "aria-label": `Show ${t.patientName}'s feedback on my profile` } }}
                    />
                  </Tooltip>
                  <Stack direction="row" spacing={0.25}>
                    <IconButton size="small" aria-label="Move up" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                      <FiArrowUp size={15} />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Move down"
                      disabled={i === items.length - 1 || reorder.isPending}
                      onClick={() => move(i, 1)}
                    >
                      <FiArrowDown size={15} />
                    </IconButton>
                    {t.patientPhotoUrl ? (
                      <Tooltip title="Remove photo">
                        <span>
                          <IconButton
                            size="small"
                            aria-label={`Remove ${t.patientName}'s photo`}
                            disabled={photoBusy}
                            onClick={() => removePhoto.mutate(t.id)}
                          >
                            <FiX size={15} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Add photo (with consent)">
                        <span>
                          <IconButton
                            size="small"
                            aria-label={`Add a photo for ${t.patientName}`}
                            disabled={photoBusy}
                            onClick={() => openConsent(t)}
                          >
                            <FiCamera size={15} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <IconButton size="small" aria-label={`Edit ${t.patientName}'s feedback`} onClick={() => startEdit(t)}>
                      <FiEdit2 size={15} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Delete ${t.patientName}'s feedback`}
                      disabled={remove.isPending}
                      onClick={() => {
                        if (editingId === t.id) stopEdit();
                        remove.mutate(t.id);
                      }}
                    >
                      <FiTrash2 size={15} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <FormContainer methods={methods} onSubmit={submit}>
        <Grid container spacing={1.5} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <RHFTextField<TestimonialInput> name="patientName" label="Patient name to display" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <RHFTextField<TestimonialInput>
              name="reviewDate"
              label="Date (optional)"
              type="date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <RHFTextField<TestimonialInput>
              name="reviewText"
              label="What the patient said"
              size="small"
              fullWidth
              multiline
              minRows={3}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              control={methods.control}
              name="rating"
              render={({ field, fieldState }) => (
                <Box>
                  <Typography component="legend" variant="caption" color="text.secondary">
                    Rating
                  </Typography>
                  <Rating
                    name="testimonial-rating"
                    value={field.value}
                    onChange={(_, v) => field.onChange(v ?? 0)}
                  />
                  {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                </Box>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              control={methods.control}
              name="isVisible"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, c) => field.onChange(c)} />}
                  label="Show on my public profile"
                />
              )}
            />
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
                {editingId ? "Save changes" : "Add feedback"}
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

      <Dialog open={consentFor !== null} onClose={() => setConsentFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Patient photo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            The photo will be shown publicly next to this feedback on your profile.
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={consented} onChange={(_, c) => setConsented(c)} />}
            label={`${consentFor?.patientName ?? "The patient"} agreed to have their photo shown on my public profile.`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsentFor(null)}>Cancel</Button>
          <Button variant="contained" disabled={!consented} onClick={choosePhoto}>
            Choose photo
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
