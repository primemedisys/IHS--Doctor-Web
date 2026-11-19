"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Controller, useForm, useFormState } from "react-hook-form";
import { FiCheckCircle, FiCreditCard } from "react-icons/fi";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { ErrorState, Loading } from "@/components/feedback";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { normalizeError } from "@/utils/error";
import type { PaymentQr } from "@/types/payment-qr";
import { usePaymentQr } from "../hooks";
import { paymentQrSchema, type PaymentQrInput } from "../schemas";

/** Mirrors the backend's PAYMENT_QR_MAX_BYTES / PAYMENT_QR_IMAGE_MIME — the
 *  server re-checks authoritatively; this is for instant feedback. */
const MAX_MB = 2;
const ACCEPT = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] };

/** A friendly sentence for react-dropzone's rejection codes. */
function rejectionMessage(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-too-large") return `That image is larger than ${MAX_MB} MB — please upload a smaller screenshot of your QR.`;
  if (code === "file-invalid-type") return "Please upload a PNG, JPG or WebP image of your UPI QR code.";
  return rejection.errors[0]?.message ?? "That file can't be used.";
}

type QrState = "active" | "inactive" | "none";

function qrState(qr: PaymentQr): QrState {
  if (qr.configured) return "active";
  const nothingSaved = !qr.qrImageUrl && !qr.upiId && !qr.payeeName && !qr.isActive && !qr.updatedAt;
  return nothingSaved ? "none" : "inactive";
}

const STATE_CHIP: Record<QrState, { label: string; color: "success" | "warning" | "default" }> = {
  active: { label: "Active", color: "success" },
  inactive: { label: "Inactive", color: "warning" },
  none: { label: "Not set up", color: "default" },
};

/**
 * Settings card for the doctor's OWN UPI QR (consultation payments without a
 * gateway). Patients scan it and pay the doctor directly; the platform never
 * verifies the transfer, so each such booking stays "pending" until the doctor
 * confirms receipt with "Mark paid" on the appointment.
 *
 * The image uploads immediately (like the profile photo); the text fields and
 * the "accept" toggle save together with Save.
 */
export function PaymentQrCard() {
  const { query, update, upload, remove } = usePaymentQr();
  const qr = query.data;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const methods = useForm<PaymentQrInput>({
    resolver: zodResolver(paymentQrSchema),
    defaultValues: { upiId: "", payeeName: "", isActive: false },
    values: qr ? { upiId: qr.upiId ?? "", payeeName: qr.payeeName ?? "", isActive: qr.isActive } : undefined,
    // An upload refreshes the cached QR; keep anything typed but not yet saved.
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty } = useFormState({ control: methods.control });

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        setFileError(rejectionMessage(rejections[0]));
        return;
      }
      setFileError(null);
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

  const onSubmit = (values: PaymentQrInput) => {
    update.mutate(
      {
        upiId: values.upiId.trim() || null,
        payeeName: values.payeeName.trim() || null,
        isActive: values.isActive,
      },
      {
        onError: (error) => {
          // 422 VALIDATION_ERROR carries per-field `details` — pin them on the inputs.
          const fieldErrors = normalizeError(error).errors;
          for (const field of ["upiId", "payeeName"] as const) {
            const message = fieldErrors?.[field];
            const text = Array.isArray(message) ? message[0] : message;
            if (text) methods.setError(field, { message: String(text) });
          }
        },
      },
    );
  };

  const onConfirmRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        setFileError(null);
      },
    });
  };

  const state = qr ? qrState(qr) : "none";
  const chip = STATE_CHIP[state];

  return (
    <Card variant="outlined">
      <CardHeader
        avatar={<FiCreditCard size={20} />}
        title="Consultation payment QR"
        subheader="Let patients pay your consultation fee by scanning your own UPI QR code"
        action={
          qr ? (
            <Chip
              size="small"
              variant="outlined"
              color={chip.color}
              icon={state === "active" ? <FiCheckCircle /> : undefined}
              label={chip.label}
            />
          ) : undefined
        }
      />
      <CardContent>
        {query.isLoading ? (
          <Loading label="Loading payment settings…" />
        ) : query.isError || !qr ? (
          <ErrorState description="We couldn't load your payment QR settings." onRetry={() => query.refetch()} />
        ) : (
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Patients pay you directly — the platform doesn&apos;t verify the transfer. Check your UPI app, then confirm
              each payment with <strong>Mark paid</strong> on the appointment.
            </Typography>

            <Grid container spacing={3}>
              {/* QR image — uploads immediately, independent of Save. */}
              <Grid size={{ xs: 12, sm: 5, md: 4 }}>
                <Stack spacing={1.5} {...getRootProps()}>
                  <input {...getInputProps()} />
                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: 240,
                      aspectRatio: "1 / 1",
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px dashed",
                      borderColor: isDragActive ? "secondary.main" : "divider",
                      bgcolor: qr.qrImageUrl ? "common.white" : "action.hover",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {qr.qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qr.qrImageUrl}
                        alt="Your UPI payment QR code"
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 2, textAlign: "center" }}>
                        {isDragActive ? "Drop to upload…" : "No QR uploaded yet"}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color={fileError ? "error" : "text.secondary"}>
                    {fileError ?? `PNG, JPG or WebP, up to ${MAX_MB} MB. Drag & drop or use the button.`}
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="contained" size="small" onClick={open} loading={upload.isPending}>
                      {qr.qrImageUrl ? "Replace QR" : "Upload QR"}
                    </Button>
                  </Stack>
                </Stack>
              </Grid>

              {/* Text fields + accept toggle — saved together. */}
              <Grid size={{ xs: 12, sm: 7, md: 8 }}>
                <FormContainer methods={methods} onSubmit={onSubmit}>
                  <Stack spacing={2}>
                    <RHFTextField<PaymentQrInput>
                      name="upiId"
                      label="UPI ID (optional)"
                      placeholder="name@okbank"
                      helperText="Shown to patients under the QR, for apps that can't scan"
                      fullWidth
                    />
                    <RHFTextField<PaymentQrInput>
                      name="payeeName"
                      label="Payee name (optional)"
                      placeholder="Name as it appears in your UPI app"
                      fullWidth
                    />
                    <Box>
                      <Controller
                        name="isActive"
                        control={methods.control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                onBlur={field.onBlur}
                              />
                            }
                            label="Accept UPI QR payments"
                          />
                        )}
                      />
                      {!qr.qrImageUrl && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Patients only see this option once a QR image is uploaded and payments are switched on.
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }} useFlexGap>
                      <Button type="submit" variant="contained" loading={update.isPending} disabled={!isDirty}>
                        Save
                      </Button>
                      {state !== "none" && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => setConfirmOpen(true)}
                          disabled={remove.isPending}
                        >
                          Remove QR
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </FormContainer>
              </Grid>
            </Grid>
          </Stack>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove your payment QR?"
        description="Patients will no longer be able to pay you by UPI QR. Bookings already made with UPI QR are not affected — you can still mark them paid."
        confirmLabel="Remove"
        tone="error"
        loading={remove.isPending}
        onConfirm={onConfirmRemove}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
