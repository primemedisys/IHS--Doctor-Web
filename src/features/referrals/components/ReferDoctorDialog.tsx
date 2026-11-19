"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FiSend, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error";
import { useCreateReferral, useReferralTargets } from "../hooks";
import type { ReferralTarget } from "@/types/referral";

export interface ReferDoctorDialogProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  /** The source consult's clinic, so "same clinic" matches float to the top. */
  sourceClinicId?: string | null;
  patientName?: string | null;
}

/**
 * "Refer to another doctor" — an async, name-driven MUI Autocomplete (the crux
 * of the request) plus a required reason and an optional note. Send is disabled
 * until a doctor is chosen and the reason is ≥ 3 chars; it creates the referral
 * and closes on success.
 */
export function ReferDoctorDialog({
  open,
  onClose,
  bookingId,
  sourceClinicId,
  patientName,
}: ReferDoctorDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [selected, setSelected] = useState<ReferralTarget | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const { data: targets = [], isFetching } = useReferralTargets(
    inputValue,
    sourceClinicId ?? undefined,
  );
  const createReferral = useCreateReferral(bookingId);

  const canSend = Boolean(selected) && reason.trim().length >= 3 && !createReferral.isPending;

  const reset = () => {
    setInputValue("");
    setSelected(null);
    setReason("");
    setNote("");
  };

  const handleClose = () => {
    if (createReferral.isPending) return;
    reset();
    onClose();
  };

  const handleSend = () => {
    if (!selected) return;
    createReferral.mutate(
      { toDoctorId: selected.id, reason: reason.trim(), note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Referral sent to ${selected.name ?? "the doctor"}`);
          reset();
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Refer to another doctor
        <IconButton
          onClick={handleClose}
          sx={{ position: "absolute", top: 12, right: 12 }}
          aria-label="Close"
        >
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {patientName && (
            <Typography variant="body2" color="text.secondary">
              Hand this patient — <b>{patientName}</b> — over to another doctor. They&apos;ll see
              your reason and can book the consult in one tap.
            </Typography>
          )}

          <Autocomplete<ReferralTarget>
            options={targets}
            value={selected}
            onChange={(_e, value) => setSelected(value)}
            inputValue={inputValue}
            onInputChange={(_e, value, reasonType) => {
              // Keep the field showing the picked doctor's name after selection.
              if (reasonType !== "reset") setInputValue(value);
            }}
            loading={isFetching}
            // Server already filters by name — don't re-filter on the client.
            filterOptions={(x) => x}
            getOptionLabel={(t) => t.name ?? ""}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={
              inputValue.trim().length < 1 ? "Type a doctor's name…" : "No matching doctors"
            }
            renderOption={(props, option) => {
              const { key, ...liProps } = props as typeof props & { key: string };
              return (
                <Box component="li" key={key} {...liProps} sx={{ gap: 1.5 }}>
                  <Avatar src={option.photo ?? undefined} sx={{ width: 34, height: 34 }}>
                    {(option.name ?? "?").charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {option.name}
                      </Typography>
                      {option.sameClinic && (
                        <Chip label="Same clinic" size="small" color="primary" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                      {[option.specializations.join(", "), option.clinicName]
                        .filter(Boolean)
                        .join(" · ") || "Doctor"}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Doctor" placeholder="Type a name…" autoFocus />
            )}
          />

          <TextField
            label="Reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. MRI + neurology opinion"
            multiline
            minRows={2}
            fullWidth
            helperText={
              reason.trim().length > 0 && reason.trim().length < 3
                ? "Please write at least 3 characters"
                : "Shown to the patient and the doctor you refer to"
            }
            error={reason.trim().length > 0 && reason.trim().length < 3}
          />

          <TextField
            label="Note to the doctor (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Extra clinical context…"
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} color="inherit" disabled={createReferral.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={<FiSend />}
          disabled={!canSend}
          loading={createReferral.isPending}
        >
          Send referral
        </Button>
      </DialogActions>
    </Dialog>
  );
}
