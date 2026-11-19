"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiCheck, FiClock, FiExternalLink } from "react-icons/fi";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import { chipColors } from "../format";
import {
  useBookingFollowUp,
  useBookingReminder,
  useClearBookingReminder,
  useFollowUpStatuses,
  useSetBookingFollowUp,
  useSetBookingReminder,
} from "../hooks";

/** How long a typed date settles before it is saved. */
const DATE_DEBOUNCE_MS = 700;

/**
 * The patient's follow-up status and the date they're expected back.
 *
 * AUTO-SAVES. There is no save button on purpose: this is one field and a date,
 * set in the seconds after a consultation ends, and a button is one more thing
 * to forget — a status the doctor picked but didn't commit is worse than no
 * status at all, because the roster then lies about it.
 *
 * The status saves the instant it changes. The date waits for a short pause
 * first: a native date input fires on every part of the date, so saving on
 * every keystroke would write 03/09/0002 on the way to 03/09/2026.
 */
export function FollowUpPanel({ bookingId }: { bookingId: string }) {
  const { data: statuses = [], isLoading: statusesLoading } = useFollowUpStatuses();
  const { data: current, isLoading: currentLoading } = useBookingFollowUp(bookingId);
  const save = useSetBookingFollowUp(bookingId);

  // ── Reminder hooks (docs/follow-up-reminders-07-09-2026) ──────────────────
  const { data: reminder, isLoading: reminderLoading } = useBookingReminder(bookingId);
  const saveReminder = useSetBookingReminder(bookingId);
  const clearReminder = useClearBookingReminder(bookingId);

  const active = statuses.filter((s) => s.isActive);

  const [statusId, setStatusId] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [saved, setSaved] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reminder state (docs/follow-up-reminders-07-09-2026) ──────────────────
  const [reminderDays, setReminderDays] = useState<string>("none");
  const [reminderChannel, setReminderChannel] = useState<"email" | "whatsapp" | "both">("both");
  const [reminderSeeded, setReminderSeeded] = useState(false);

  // Seed from the server value once it lands — adjusted during render rather
  // than in an effect, which would show an empty field for a frame first.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && !currentLoading) {
    setSeeded(true);
    setStatusId(current?.status?.id ?? "");
    setFollowUpOn(current?.followUpOn ?? "");
  }

  // Seed reminder state from server value.
  if (!reminderSeeded && !reminderLoading && reminder) {
    setReminderSeeded(true);
    if (reminder.followUpOn && reminder.reminderAt) {
      const diffMs = new Date(reminder.reminderAt).getTime() - new Date(reminder.followUpOn).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if ([1, 3, 7].includes(diffDays)) {
        setReminderDays(String(diffDays));
      } else {
        setReminderDays("custom");
      }
      setReminderChannel(reminder.channel);
    }
  } else if (!reminderSeeded && !reminderLoading && !reminder) {
    setReminderSeeded(true);
    // No reminder set — keep defaults.
  }

  // Drop a pending date save if the panel closes mid-debounce.
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const commit = (next: { statusId: string; followUpOn: string }) => {
    // A date without a status has nothing to attach to — the status IS the tag.
    if (!next.statusId) return;
    save.mutate(
      {
        statusId: next.statusId,
        followUpOn: next.followUpOn || null,
        note: current?.note ?? null,
      },
      {
        onSuccess: () => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const onStatus = (value: string) => {
    setStatusId(value);
    // Immediate: picking from a list is a decision, not a draft.
    commit({ statusId: value, followUpOn });
  };

  const onDate = (value: string) => {
    setFollowUpOn(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => commit({ statusId, followUpOn: value }), DATE_DEBOUNCE_MS);
  };

  // ── Reminder change handler (docs/follow-up-reminders-07-09-2026) ─────────
  const onReminderChange = (days: string, channel: "email" | "whatsapp" | "both") => {
    setReminderDays(days);
    setReminderChannel(channel);
    if (days === "none") {
      // No reminder — cancel any existing one.
      if (reminder) {
        clearReminder.mutate(undefined, {
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
      return;
    }
    if (!followUpOn) {
      toast.warning("Set a follow-up date first before adding a reminder.");
      return;
    }
    saveReminder.mutate(
      {
        reminderDaysBefore: days === "custom" ? 3 : Number(days),
        channel,
      },
      {
        onSuccess: () => toast.success("Reminder saved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  if (statusesLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading follow-up options…
      </Typography>
    );
  }

  if (active.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        You have no active follow-up statuses.{" "}
        <Box component={Link} href={ROUTES.dashboard.followUpOptions} sx={{ color: "primary.main", fontWeight: 700 }}>
          Add one
        </Box>{" "}
        to start tagging patients.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {/* Stacked, not side by side: this panel lives in the modal's Actions
          column, which is half the dialog wide — two fields on one row there
          squeeze the date input until its own segments wrap. */}
      <Stack spacing={1.5}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusId}
          onChange={(e) => onStatus(e.target.value)}
          fullWidth
        >
          {active.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {/* The colour is learned where it is SET, not only where it is
                  read, so the dot travels with the label into the picker. */}
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box
                  sx={(t) => ({
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: chipColors(t, s.colorHex).solid,
                  })}
                />
                {s.label}
              </Stack>
            </MenuItem>
          ))}
        </TextField>

        <TextField
          type="date"
          size="small"
          label="Expected back on"
          value={followUpOn}
          onChange={(e) => onDate(e.target.value)}
          disabled={!statusId}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
      </Stack>

      {/* ── Reminder configuration (docs/follow-up-reminders-07-09-2026) ── */}
      <Stack spacing={1} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <FiClock size={13} />
          <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">
            Automatic reminder
          </Typography>
        </Stack>

        <TextField
          select
          size="small"
          label="Remind patient"
          value={reminderDays}
          onChange={(e) => onReminderChange(e.target.value as string, reminderChannel)}
          disabled={!statusId || !followUpOn}
          fullWidth
        >
          <MenuItem value="none">No reminder</MenuItem>
          <MenuItem value="1">1 day before</MenuItem>
          <MenuItem value="3">3 days before</MenuItem>
          <MenuItem value="7">7 days before</MenuItem>
        </TextField>

        {reminderDays !== "none" && (
          <Stack direction="row" spacing={0}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={reminderChannel === "email" || reminderChannel === "both"}
                  onChange={(e) => {
                    const hasWhatsApp = reminderChannel === "whatsapp" || reminderChannel === "both";
                    const next: "email" | "whatsapp" | "both" = e.target.checked
                      ? hasWhatsApp ? "both" : "email"
                      : hasWhatsApp ? "whatsapp" : "both";
                    onReminderChange(reminderDays, next);
                  }}
                />
              }
              label={<Typography variant="body2">Email</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={reminderChannel === "whatsapp" || reminderChannel === "both"}
                  onChange={(e) => {
                    const hasEmail = reminderChannel === "email" || reminderChannel === "both";
                    const next: "email" | "whatsapp" | "both" = e.target.checked
                      ? hasEmail ? "both" : "whatsapp"
                      : hasEmail ? "email" : "both";
                    onReminderChange(reminderDays, next);
                  }}
                />
              }
              label={<Typography variant="body2">WhatsApp</Typography>}
            />
          </Stack>
        )}

        {reminderDays !== "none" && followUpOn && (
          <Typography variant="caption" color="text.secondary">
            Patient will be notified {reminderDays === "1" ? "1 day" : reminderDays === "7" ? "7 days" : `${reminderDays} days`} before {followUpOn}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        {/* Saving is silent until it isn't: a spinner then a tick, so the
            doctor knows it landed without having to press anything. */}
        <Typography
          variant="caption"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            color: saved ? "success.main" : "text.disabled",
            fontWeight: saved ? 700 : 400,
            minHeight: 18,
          }}
        >
          {save.isPending ? (
            "Saving…"
          ) : saved ? (
            <>
              <FiCheck size={13} /> Saved
            </>
          ) : statusId ? (
            "Saves automatically"
          ) : (
            "Pick a status to tag this patient"
          )}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          component={Link}
          href={ROUTES.dashboard.followUpOptions}
          size="small"
          color="inherit"
          endIcon={<FiExternalLink size={13} />}
          sx={{ textTransform: "none", fontWeight: 700, color: "text.secondary" }}
        >
          Manage options
        </Button>
      </Stack>
    </Stack>
  );
}
