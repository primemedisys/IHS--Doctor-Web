"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FiTrash2, FiVideo } from "react-icons/fi";
import { Loading } from "@/components/feedback";
import {
  useClinics,
  useExceptions,
  useOnlineAvailability,
  useSetClinicAvailability,
} from "../../hooks";
import { WeeklyScheduleEditor } from "../WeeklyScheduleEditor";

/**
 * Availability step (onboarding step 6 / dashboard manager). One tab per clinic
 * for its weekly hours, plus an independent Online / Video tab, plus blocked-date
 * exceptions. Availability completes when ANY window (clinic or online) exists.
 */
export function AvailabilityStep() {
  const { data: clinics, isLoading } = useClinics();
  const online = useOnlineAvailability();
  const setClinicAvail = useSetClinicAvailability();
  const [tab, setTab] = useState(0);

  if (isLoading || online.list.isLoading) return <Loading label="Loading your schedule…" />;

  const clinicList = clinics ?? [];
  const onlineTabIndex = clinicList.length;
  const activeClinic = tab < clinicList.length ? clinicList[tab] : null;

  return (
    <Stack spacing={2}>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        {clinicList.map((c) => (
          <Tab key={c.id} label={c.name} />
        ))}
        <Tab icon={<FiVideo />} iconPosition="start" label="Online / Video" />
      </Tabs>

      {activeClinic ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Weekly consulting hours at <strong>{activeClinic.name}</strong>.
          </Typography>
          <WeeklyScheduleEditor
            key={activeClinic.id}
            slots={activeClinic.availability}
            saving={setClinicAvail.isPending}
            onSave={(slots) => setClinicAvail.mutate({ clinicId: activeClinic.id, slots })}
          />
        </Box>
      ) : tab === onlineTabIndex ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Independent weekly hours for video consultations — not tied to any clinic.
          </Typography>
          <WeeklyScheduleEditor
            slots={online.list.data ?? []}
            saving={online.save.isPending}
            onSave={(slots) => online.save.mutate(slots)}
          />
        </Box>
      ) : (
        <Alert severity="info">Add a clinic first to set its consulting hours.</Alert>
      )}

      <Divider />
      <ExceptionsEditor clinics={clinicList} />
    </Stack>
  );
}

/** Block specific dates (holidays/leave), optionally scoped to one clinic. */
function ExceptionsEditor({ clinics }: { clinics: { id: string; name: string }[] }) {
  const { list, add, remove } = useExceptions();
  const [scope, setScope] = useState<string>("online"); // "online" | clinicId
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const submit = () => {
    if (!date) return;
    add.mutate(
      { clinicId: scope === "online" ? null : scope, exceptionDate: date, reason: reason || null },
      { onSuccess: () => { setDate(""); setReason(""); } }
    );
  };

  const scopeLabel = (clinicId: string | null) =>
    clinicId == null ? "Online" : clinics.find((c) => c.id === clinicId)?.name ?? "Clinic";

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Blocked dates
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Mark holidays or leave — patients won&apos;t see slots on these dates.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "flex-end" } }}>
        <TextField
          select
          label="Applies to"
          size="small"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="online">Online / Video</MenuItem>
          {clinics.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          label="Date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Reason (optional)"
          size="small"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button variant="outlined" onClick={submit} disabled={!date} loading={add.isPending}>
          Block date
        </Button>
      </Stack>

      <Stack spacing={1}>
        {(list.data ?? []).map((ex) => (
          <Stack
            key={ex.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip label={ex.exceptionDate} size="small" />
              <Typography variant="body2">{scopeLabel(ex.clinicId)}</Typography>
              {ex.reason && (
                <Typography variant="body2" color="text.secondary">
                  · {ex.reason}
                </Typography>
              )}
            </Stack>
            <IconButton size="small" color="error" aria-label="Remove" onClick={() => remove.mutate(ex.id)}>
              <FiTrash2 size={16} />
            </IconButton>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
