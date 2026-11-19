"use client";

/**
 * The patient's chronological timeline across every doctor, filtered / sorted /
 * paginated by the SERVER (GET …/timeline). Each event names the doctor who
 * created it and the original record it was built from; an event whose record
 * carries no clinical date says so instead of borrowing the upload date.
 */
import { useState } from "react";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { getErrorMessage } from "@/utils/error";
import { useTimeline } from "../hooks";
import { dayLabel, instantLabel, timeLabel } from "../format";
import type { TimelineEvent, TimelineEventType, TimelineGroup } from "@/types/emr";

const GROUPS: { value: TimelineGroup; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "consultations", label: "Consultations" },
  { value: "diagnoses", label: "Diagnoses" },
  { value: "investigations", label: "Investigations & reports" },
  { value: "prescriptions", label: "Prescriptions" },
  { value: "followups", label: "Follow-ups" },
];

const TYPE: Record<TimelineEventType, { label: string; icon: string; tone: CardTone }> = {
  consultation: { label: "Consultation", icon: "FiUser", tone: "purple" },
  complaint: { label: "Chief complaint", icon: "FiMessageSquare", tone: "purple" },
  examination: { label: "Examination", icon: "FiActivity", tone: "purple" },
  vitals: { label: "Vitals", icon: "FiHeart", tone: "purple" },
  note: { label: "Note", icon: "FiEdit3", tone: "purple" },
  diagnosis: { label: "Diagnosis", icon: "FiSearch", tone: "orange" },
  investigation: { label: "Investigation advised", icon: "FiClipboard", tone: "teal" },
  report: { label: "Report", icon: "FiFileText", tone: "teal" },
  prescription: { label: "Prescription", icon: "FiCheckCircle", tone: "green" },
  follow_up: { label: "Follow-up", icon: "FiCalendar", tone: "orange" },
};

const LIMIT = 15;

export function TimelinePanel({
  patientId,
  defaultGroup = "all",
  groups,
}: {
  patientId: string;
  defaultGroup?: TimelineGroup;
  /** Limit the type selector (e.g. a diagnosis page offers only diagnoses). */
  groups?: TimelineGroup[];
}) {
  const [group, setGroup] = useState<TimelineGroup>(defaultGroup);
  const [doctorId, setDoctorId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Filters change the result set, so they always return to page 1.
  const set = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };
  const q = useTimeline(patientId, {
    types: group,
    doctorId: doctorId || undefined,
    specialty: specialty || undefined,
    from: from || undefined,
    to: to || undefined,
    order,
    page,
    limit: LIMIT,
  });
  const data = q.data;
  const options = GROUPS.filter((g) => !groups || groups.includes(g.value));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const filtered = Boolean(doctorId || specialty || from || to || group !== defaultGroup);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap" }}>
        <TextField fullWidth={false} select size="small" label="Event type" value={group} onChange={(e) => set(setGroup)(e.target.value as TimelineGroup)} sx={{ minWidth: 170 }}>
          {options.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
        </TextField>
        <TextField fullWidth={false} select size="small" label="Doctor" value={doctorId} onChange={(e) => set(setDoctorId)(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All doctors</MenuItem>
          {data?.facets.doctors.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
        </TextField>
        <TextField fullWidth={false} select size="small" label="Specialty" value={specialty} onChange={(e) => set(setSpecialty)(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All specialties</MenuItem>
          {data?.facets.specialties.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField fullWidth={false} size="small" type="date" label="From" value={from} onChange={(e) => set(setFrom)(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField fullWidth={false} size="small" type="date" label="To" value={to} onChange={(e) => set(setTo)(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField fullWidth={false} select size="small" label="Order" value={order} onChange={(e) => set(setOrder)(e.target.value as "asc" | "desc")} sx={{ minWidth: 150 }}>
          <MenuItem value="desc">Newest first</MenuItem>
          <MenuItem value="asc">Oldest first (journey)</MenuItem>
        </TextField>
        {filtered && (
          <Button
            size="small"
            onClick={() => {
              setGroup(defaultGroup); setDoctorId(""); setSpecialty(""); setFrom(""); setTo(""); setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      {q.isError ? (
        <ErrorState title="Couldn't load the timeline" description={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !data ? (
        <Stack spacing={1}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>
      ) : data.events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {filtered ? "No events match these filters." : "No recorded events available for this patient."}
        </Typography>
      ) : (
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, opacity: q.isFetching ? 0.6 : 1, transition: "opacity 150ms" }}>
          {data.events.map((e, i) => <EventRow key={e.id} e={e} last={i === data.events.length - 1} />)}
        </Box>
      )}

      {data && data.total > data.limit && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Typography variant="caption" color="text.secondary">Page {page} of {pages} · {data.total} events</Typography>
          <Button size="small" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </Stack>
      )}
      {data?.capped.consultations && (
        <Typography variant="caption" color="text.secondary">Showing the most recent consultations; older ones are not loaded.</Typography>
      )}
    </Stack>
  );
}

/** Marker palette per event type (soft fills, semantic hues). */
const INDIGO = { bg: "#EEF0FF", border: "#C9CEF5", fg: "#4F46E5", heading: "#3730A3" };
const TONE: Record<TimelineEventType, { bg: string; border: string; fg: string; heading: string }> = {
  consultation: CARD_TONES.purple,
  complaint: CARD_TONES.purple,
  examination: CARD_TONES.purple,
  note: CARD_TONES.purple,
  diagnosis: CARD_TONES.orange,
  prescription: CARD_TONES.green,
  report: CARD_TONES.teal,
  investigation: CARD_TONES.teal,
  vitals: CARD_TONES.blue,
  follow_up: INDIGO,
};

const timeOf = (at: string | null) => {
  const m = at && /T(\d{2}):(\d{2})/.exec(at);
  return m ? timeLabel(`${m[1]}:${m[2]}`) : null;
};

/**
 * One timeline entry: date column, marker on the continuous left line, card.
 * The date, title, doctor, specialty and consultation reference are always
 * visible; "More" reveals every stored detail and the source record.
 */
function EventRow({ e, last }: { e: TimelineEvent; last: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE[e.type];
  const tone = TONE[e.type];
  const time = timeOf(e.at);
  const who = e.doctor?.name ?? null;
  const more = e.details.length > 2 || Boolean(e.clinic?.name) || Boolean(e.uploadedAt);
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "26px minmax(0,1fr)", sm: "128px 26px minmax(0,1fr)" },
        columnGap: { xs: 1.25, sm: 1.5 },
        position: "relative",
        pb: last ? 0 : 2,
      }}
    >
      {/* Date, always visible beside the marker */}
      <Box sx={{ gridColumn: { xs: "2", sm: "1" }, gridRow: { xs: 1, sm: "auto" }, textAlign: { sm: "right" }, pt: { sm: 0.9 }, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "text.primary", lineHeight: 1.3 }}>
          {e.date ? dayLabel(e.date, { month: "long" }) : "Date not recorded"}
        </Typography>
        {(time || (!e.date && e.uploadedAt)) && (
          <Typography variant="caption" color="text.secondary">
            {time ?? `Uploaded ${instantLabel(e.uploadedAt).split(",")[0]}`}
          </Typography>
        )}
      </Box>

      {/* Marker + continuous line */}
      <Box sx={{ gridColumn: "1", gridRow: { xs: "1 / span 2", sm: "auto" }, position: "relative", display: "flex", justifyContent: "center" }} aria-hidden>
        {!last && <Box sx={{ position: "absolute", top: 26, bottom: -16, width: 2, bgcolor: "divider" }} />}
        <Box
          sx={{
            mt: { xs: 0.4, sm: 0.9 },
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: tone.bg,
            color: tone.fg,
            border: `2px solid ${tone.fg}`,
            boxShadow: "0 0 0 3px #fff",
            zIndex: 1,
          }}
        >
          <Icon name={meta.icon} size={12} />
        </Box>
      </Box>

      {/* Content card */}
      <Box
        sx={{
          gridColumn: { xs: "2", sm: "3" },
          gridRow: { xs: 2, sm: "auto" },
          minWidth: 0,
          border: 1,
          borderColor: "divider",
          borderLeft: `3px solid ${tone.fg}`,
          borderRadius: 2,
          px: 1.5,
          py: 1,
          bgcolor: "background.paper",
          transition: "box-shadow 150ms, border-color 150ms",
          "&:hover": { boxShadow: 1, borderColor: tone.border },
        }}
      >
        <Stack direction="row" useFlexGap sx={{ gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: "text.primary", overflowWrap: "anywhere" }}>{e.title}</Typography>
          <Chip size="small" label={meta.label} sx={{ height: 20, bgcolor: tone.bg, color: tone.heading, fontWeight: 600 }} />
          {e.status && <Chip size="small" variant="outlined" label={e.status.replace(/_/g, " ")} sx={{ height: 20 }} />}
        </Stack>
        <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
          {[who, e.specialties.join(", ") || null, e.consultation ? `Consultation #${e.consultation.bookingId}` : null].filter(Boolean).join(" · ") || "Recorded by: not stated"}
        </Typography>
        {e.details.length > 0 && (
          <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>{e.details.slice(0, 2).join(" · ")}</Typography>
        )}
        {more && (
          <>
            <Collapse in={open} unmountOnExit>
              <Box sx={{ mt: 0.75, pt: 0.75, borderTop: 1, borderColor: "divider" }}>
                {e.details.length > 2 && (
                  <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                    {e.details.slice(2).map((d, i) => <li key={i}><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{d}</Typography></li>)}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                  {[e.clinic?.name ? `${e.clinic.name}${e.clinic.city ? `, ${e.clinic.city}` : ""}` : null, e.uploadedAt ? `Uploaded ${instantLabel(e.uploadedAt)}` : null, `Source: ${e.source.kind.replace(/_/g, " ")} #${e.source.id}`].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            </Collapse>
            <Button size="small" onClick={() => setOpen((v) => !v)} aria-expanded={open} sx={{ mt: 0.25, px: 0.5, minWidth: 0 }} endIcon={<Icon name={open ? "FiChevronUp" : "FiChevronDown"} size={14} />}>
              {open ? "Less" : "More"}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
