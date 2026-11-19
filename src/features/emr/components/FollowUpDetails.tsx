"use client";

import { useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import { useBookingFollowUp, useFollowUpStatuses, useSetBookingFollowUp } from "@/features/follow-ups";
import { useBookingReminder, useClearBookingReminder, useSetBookingReminder } from "@/features/follow-ups/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { emrKeys } from "../hooks";
import { addInterval, dayLabel, istToday, titleCase } from "../format";
import { unsavedError, useUnsavedWork } from "./UnsavedWork";
import type { PatientFollowUp } from "@/types/followUp";

type Unit = "day" | "week" | "month";

/**
 * Follow-up details for THIS visit — the existing per-booking follow-up (and
 * its existing reminder scheduler), extended with the plan fields. One reminder
 * per visit, rescheduled when the date changes: no second scheduler, no
 * duplicate reminders.
 */
export function FollowUpDetails({ patientId, bookingId, canRecord, visitDate }: { patientId: string; bookingId: string | null; canRecord: boolean; visitDate: string | null }) {
  const current = useBookingFollowUp(bookingId);
  if (!bookingId || !canRecord) return <Alert severity="info">Follow-up is planned on a confirmed or completed visit with you.</Alert>;
  if (current.isLoading) return <Typography variant="body2" color="text.secondary">Loading…</Typography>;
  return <FollowUpForm key={current.data?.updatedAt ?? "new"} patientId={patientId} bookingId={bookingId} visitDate={visitDate} current={current.data ?? null} />;
}

function FollowUpForm({ patientId, bookingId, visitDate, current }: { patientId: string; bookingId: string; visitDate: string | null; current: PatientFollowUp | null }) {
  const statuses = useFollowUpStatuses();
  const setFu = useSetBookingFollowUp(bookingId);
  const reminder = useBookingReminder(bookingId);
  const setReminder = useSetBookingReminder(bookingId);
  const clearReminder = useClearBookingReminder(bookingId);
  const qc = useQueryClient();

  const base = visitDate && visitDate > istToday() ? visitDate : istToday();
  const [value, setValue] = useState(current?.intervalValue ? String(current.intervalValue) : "");
  const [unit, setUnit] = useState<Unit>((current?.intervalUnit as Unit) ?? "week");
  const [date, setDate] = useState(current?.followUpOn ?? "");
  const [statusId, setStatusId] = useState(current?.status?.id ?? "");
  const [note, setNote] = useState(current?.note ?? "");
  const [homeCare, setHomeCare] = useState(Boolean(current?.homeCare));
  const [service, setService] = useState(current?.serviceName ?? "");
  const [qty, setQty] = useState(current?.serviceQuantity ? String(current.serviceQuantity) : "");
  const [comments, setComments] = useState(current?.comments ?? "");
  const [remind, setRemind] = useState<boolean>(Boolean(reminder.data && reminder.data.status !== "cancelled"));
  const [daysBefore, setDaysBefore] = useState("1");

  const active = (statuses.data ?? []).filter((s) => s.isActive);
  const statusValue = statusId || active[0]?.id || "";
  // Interval → SUGGESTED date; the doctor can still pick any date.
  const applyInterval = (v: string, u: Unit) => {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) setDate(addInterval(base, n, u));
  };

  // Unsaved = the form differs from what was last saved for this visit.
  const fields = () => JSON.stringify([value, unit, date, statusId, note, homeCare, service, qty, comments]);
  const [savedFields] = useState(fields);
  const dirty = fields() !== savedFields;

  const persist = async () => {
    await setFu.mutateAsync({
      statusId: statusValue,
      followUpOn: date || null,
      note: note.trim() || null,
      intervalValue: value ? Number(value) : null,
      intervalUnit: value ? unit : null,
      homeCare,
      serviceName: service.trim() || null,
      serviceQuantity: qty ? Number(qty) : null,
      comments: comments.trim() || null,
    });
    // The EXISTING reminder (one per visit). Setting the follow-up date
    // already reschedules it server-side; this only switches it on/off.
    if (date && remind) await setReminder.mutateAsync({ reminderDaysBefore: Number(daysBefore), channel: "both" });
    if (!remind && reminder.data && reminder.data.status === "pending") await clearReminder.mutateAsync();
    qc.invalidateQueries({ queryKey: emrKeys.patient(patientId) });
  };
  const save = async () => {
    try {
      await persist();
      toast.success("Follow-up saved");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const busy = setFu.isPending || setReminder.isPending || clearReminder.isPending;
  const badQty = qty !== "" && (!Number.isInteger(Number(qty)) || Number(qty) < 1);
  const badVal = value !== "" && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 365);

  useUnsavedWork(
    "followup",
    dirty
      ? {
          label: "Follow-up",
          sectionId: "emr-section-followup",
          flush: async () => {
            if (!statusValue) throw unsavedError("Follow-up", "choose a follow-up category");
            if (badQty || badVal) throw unsavedError("Follow-up", "fix the highlighted number");
            await persist();
          },
        }
      : null,
  );

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
        <Stack direction="row" spacing={0.5}>
          <TextField size="small" label="Next follow-up in" type="number" value={value} error={badVal} onChange={(e) => { setValue(e.target.value); applyInterval(e.target.value, unit); }} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 1, max: 365 } }} />
          <TextField size="small" select label="Unit" value={unit} onChange={(e) => { const u = e.target.value as Unit; setUnit(u); applyInterval(value, u); }} sx={{ flex: 1 }}>
            {(["day", "week", "month"] as Unit[]).map((u) => <MenuItem key={u} value={u}>{titleCase(u)}s</MenuItem>)}
          </TextField>
        </Stack>
        <TextField size="small" type="date" label="Next follow-up date" value={date} onChange={(e) => setDate(e.target.value)} helperText={date ? `${dayLabel(date, { weekday: "short" })}` : "Pick a date or use the interval"} slotProps={{ inputLabel: { shrink: true } }} />
        {/* Until the categories have loaded the saved id has no matching option (MUI out-of-range warning). */}
        <TextField size="small" select label="Follow-up category" value={active.some((s) => s.id === statusValue) ? statusValue : ""} onChange={(e) => setStatusId(e.target.value)}
          helperText={<Link href={ROUTES.dashboard.followUpOptions}>Manage categories</Link>}>
          {active.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Note for the patient" value={note} onChange={(e) => setNote(e.target.value)} helperText={`${note.length}/140`} slotProps={{ htmlInput: { maxLength: 140 } }} />

        <FormControlLabel control={<Checkbox checked={homeCare} onChange={(e) => setHomeCare(e.target.checked)} />} label={<Typography variant="body2">Home care</Typography>} />
        <TextField size="small" label="Service name" value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Physiotherapy" slotProps={{ htmlInput: { maxLength: 150 } }} />
        <TextField size="small" label="Service quantity" type="number" value={qty} error={badQty} onChange={(e) => setQty(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 999 } }} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <FormControlLabel control={<Checkbox checked={remind} onChange={(e) => setRemind(e.target.checked)} disabled={!date} />} label={<Typography variant="body2">Reminder</Typography>} />
          {remind && (
            <TextField size="small" select value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} aria-label="Days before" sx={{ minWidth: 120 }}>
              {["1", "3", "7"].map((d) => <MenuItem key={d} value={d}>{d} day{d === "1" ? "" : "s"} before</MenuItem>)}
            </TextField>
          )}
        </Stack>
        <TextField size="small" label="Comments" value={comments} onChange={(e) => setComments(e.target.value)} multiline minRows={2} sx={{ gridColumn: "1 / -1" }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, mt: 1.5 }}>
        <Button variant="contained" onClick={save} disabled={busy || !statusValue || badQty || badVal}>
          {busy ? "Saving…" : "Save follow-up"}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Book slot: the patient books the follow-up appointment from their IHS portal or app — it appears on their Follow-ups page
          {reminder.data && reminder.data.status === "pending" ? `, and the reminder goes out ${new Date(reminder.data.reminderAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}.
        </Typography>
      </Stack>
    </Paper>
  );
}
