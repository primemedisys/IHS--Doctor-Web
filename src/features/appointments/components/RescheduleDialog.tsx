"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/error";
import type { Appointment } from "@/types/appointment";
import { useAvailableSlots, useRescheduleAppointment } from "../hooks";

/** Today as "YYYY-MM-DD", local — the earliest date the picker allows. */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export interface RescheduleDialogProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
}

/**
 * Move an appointment the doctor can't make.
 *
 * The times offered are the doctor's OWN free slots for that date, fetched from
 * the same endpoint a patient books through — so the doctor can't pick a time
 * they don't actually work, one that's already taken, or one in the past. The
 * server re-validates all of it regardless; this only stops the obvious
 * mistakes before a round trip.
 *
 * Mode and clinic are deliberately NOT editable: a video consult stays a video
 * consult. Changing those would be a different appointment, not a new time.
 */
export function RescheduleDialog({ appointment, open, onClose }: RescheduleDialogProps) {
  // The slots endpoint is keyed by doctor id. An `Appointment` carries none —
  // it is the doctor's OWN list, so the id is implicit — and it is exactly the
  // signed-in user.
  const { user } = useAuth();
  const [date, setDate] = useState(appointment.date);
  const [startTime, setStartTime] = useState("");
  const [reason, setReason] = useState("");

  const slots = useAvailableSlots(
    user?.id ?? "",
    { mode: appointment.mode, date, clinicId: appointment.clinic?.id ?? null },
    open && Boolean(date),
  );
  const reschedule = useRescheduleAppointment();

  const submit = () => {
    if (!startTime) return;
    reschedule.mutate(
      { id: appointment.id, date, startTime, reason: reason.trim() || null },
      {
        onSuccess: (res) => {
          toast.success(`Moved from ${res.from.date} ${res.from.startTime} to ${date} ${startTime}`);
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const available = slots.data?.slots ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Reschedule appointment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Currently
            </Typography>
            <Chip size="small" label={`${appointment.date} · ${appointment.startTime ?? ""}`} />
            <Chip
              size="small"
              variant="outlined"
              label={appointment.mode === "video" ? "Video consultation" : appointment.clinic?.name ?? "Hospital"}
            />
          </Stack>

          <TextField
            label="New date"
            type="date"
            size="small"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStartTime(""); // a time from the old date is meaningless now
            }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayStr() } }}
          />

          {slots.isLoading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Loading your free slots…
              </Typography>
            </Stack>
          ) : available.length === 0 ? (
            <Alert severity="info">
              You have no free slots on this date. Pick another date, or add availability first.
            </Alert>
          ) : (
            <TextField
              select
              size="small"
              label="New time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              slotProps={{ select: { native: true } }}
              // Native select: the list can be long, and the OS picker handles
              // that better than a rendered menu on a phone.
              helperText="Only times you're free on this date"
            >
              <option value="" />
              {available.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </TextField>
          )}

          <TextField
            label="Reason (optional)"
            size="small"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Called into surgery"
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!startTime}
          loading={reschedule.isPending}
        >
          Move appointment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
