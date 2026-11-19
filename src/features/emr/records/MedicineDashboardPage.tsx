"use client";

/**
 * Medicine Dashboard — a read-only analytical overview of the patient's
 * signed prescriptions. It calls NO new endpoint: the data is the same
 * `useMedicalHistory` response the Treatment Summary uses (already
 * authorised by the server per request, so prescriptions another doctor
 * keeps private never arrive here; the existing "Request access" notice is
 * shown for them).
 *
 * Event types: the backend records prescriptions (and whether one was
 * amended, via its version). It records no per-medicine administration,
 * modification, discontinuation or reconciliation events, so none are shown
 * or counted — those cards show "not recorded", never an invented number.
 * "Current" means exactly what it means in the Treatment Summary: the
 * medicine is still inside the duration the prescriber wrote (derive.courseOf).
 */
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import type { CardTone } from "@/theme/palette";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory } from "../hooks";
import { dayLabel, istToday, timeLabel, titleCase } from "../format";
import { TIMING_LABEL } from "../components/HistoryViews";
import { OthersHiddenLine } from "../components/RecordAccess";
import { RecordsFrame, Muted } from "./RecordsKit";
import { consultationOf, courseOf, medicineKey, rxDay, signedRx, visitOf, type CourseStatus } from "./derive";
import type { HistoryRx, MedicalHistory, VisitRxItem } from "@/types/emr";

// Design tokens of this dashboard (light blue + white healthcare theme).
const BLUE = "#0866D9";
const NAVY = "#10265B";
const BLUE_LT = "#EAF2FF";
const MUTED = "#5B6B8C";
const CARD_BORDER = "#C9DAF8";
const CARD_SHADOW = "0 1px 3px rgba(16, 38, 91, 0.06)";
const SOFT = "0 1px 2px rgba(16, 38, 91, 0.06)";
const CARD_TONES: Record<CardTone, { bg: string; border: string; fg: string; heading: string }> = {
  blue: { bg: BLUE_LT, border: CARD_BORDER, fg: BLUE, heading: NAVY },
  green: { bg: "#E5F6ED", border: "#B4E3CD", fg: "#20A875", heading: "#12684A" },
  purple: { bg: "#F0EAFE", border: "#D9C8FA", fg: "#9254E9", heading: "#5933A3" },
  orange: { bg: "#FFF0E1", border: "#F7D5A8", fg: "#F28B22", heading: "#A95305" },
  gray: { bg: "#F0F2F5", border: "#D8DCE3", fg: "#6B7686", heading: "#344054" },
  teal: { bg: "#E3F4F1", border: "#B8E4DC", fg: "#138477", heading: "#08675B" },
  red: { bg: "#FDEAEA", border: "#F5C1C1", fg: "#D93636", heading: "#B42323" },
};
const subtle = { fontSize: 11.5, color: MUTED, lineHeight: 1.35, overflowWrap: "anywhere" } as const;

// ── Event categories (presentation colours; only "prescription" has backend records) ──
const EVENT_KINDS: { key: string; label: string; tone: CardTone; icon: string; recorded: boolean }[] = [
  { key: "prescription", label: "Prescription", tone: "blue", icon: "FiFileText", recorded: true },
  { key: "new", label: "New Medicine", tone: "green", icon: "FiPlusCircle", recorded: false },
  { key: "administration", label: "Administration", tone: "purple", icon: "FiActivity", recorded: false },
  { key: "modification", label: "Modification", tone: "orange", icon: "FiEdit3", recorded: false },
  { key: "discontinuation", label: "Discontinued", tone: "gray", icon: "FiSlash", recorded: false },
  { key: "reconciliation", label: "Reconciliation", tone: "teal", icon: "FiRefreshCw", recorded: false },
];

const STATUS_LABEL: Record<CourseStatus, string> = { active: "Active", completed: "Completed", unknown: "Recorded" };
const STATUS_TONE: Record<CourseStatus, CardTone> = { active: "green", completed: "gray", unknown: "blue" };

interface MedEvent {
  key: string;
  at: string;
  day: string | null;
  time: string | null;
  kind: "prescription";
  rx: HistoryRx;
  item: VisitRxItem;
  status: CourseStatus;
  start: string | null;
  end: string | null;
  doctorId: string | null;
  doctorName: string;
  photoUrl: string | null;
  specialties: string[];
  clinic: string | null;
  consultationId: string | null;
  diagnosis: string | null;
}

const medLabel = (i: VisitRxItem) => (i.strength && !i.medicineName.toLowerCase().includes(i.strength.toLowerCase()) ? `${i.medicineName} ${i.strength}` : i.medicineName);
const durationText = (i: VisitRxItem) => (i.durationDays ? `${i.durationDays} ${i.durationUnit}${i.durationDays > 1 ? "s" : ""}` : null);
const doseFreq = (i: VisitRxItem) => [i.dosage, i.frequency].filter(Boolean).join(" · ") || null;
const rxLabel = (rx: HistoryRx) => rx.rxNumber ?? `Rx #${rx.id}`;

function formIcon(form: string | null | undefined) {
  const f = (form ?? "").toLowerCase();
  if (/syrup|solution|suspension|liquid|drop|elixir|tonic/.test(f)) return "FiDroplet";
  if (/inject|vial|infus|ampoule/.test(f)) return "FiActivity";
  if (/inhal|aerosol|spray|rotacap/.test(f)) return "FiWind";
  if (/cream|ointment|gel|lotion|patch|powder/.test(f)) return "FiSun";
  if (/tablet|capsule|pill/.test(f)) return "FiCircle";
  return "FiPackage";
}

function buildEvents(h: MedicalHistory, today: string): MedEvent[] {
  const out: MedEvent[] = [];
  for (const rx of signedRx(h)) {
    const v = visitOf(h, rx.bookingId);
    const c = consultationOf(h, rx.bookingId);
    const structured = (c?.diagnoses ?? []).map((d) => d.title).filter((t): t is string => Boolean(t));
    const diagnosis = structured.length ? structured.join(", ") : rx.diagnosis ?? c?.rxDiagnosis ?? null;
    const day = rxDay(rx);
    // Photo only when the visit's doctor is the prescriber — never borrow another doctor's face.
    const sameDoc = v?.doctor && (!rx.doctor || rx.doctor.id === v.doctor.id);
    rx.items.forEach((item, idx) => {
      const course = courseOf(rx, item, today);
      out.push({
        key: `${rx.id}:${idx}`,
        at: rx.finalizedAt ?? (day ? `${day}T00:00:00` : ""),
        day,
        time: rx.finalizedAt ? new Date(rx.finalizedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : v?.startTime ? timeLabel(v.startTime) : null,
        kind: "prescription",
        rx,
        item,
        status: course.status,
        start: course.start,
        end: course.end,
        doctorId: rx.doctor?.id ?? v?.doctor?.id ?? null,
        doctorName: rx.doctor?.name ?? v?.doctor?.name ?? "Unknown doctor",
        photoUrl: sameDoc ? v?.doctor?.photoUrl ?? null : null,
        specialties: sameDoc ? v?.doctor?.specializations ?? [] : [],
        clinic: v?.clinic?.name ?? null,
        consultationId: rx.bookingId,
        diagnosis,
      });
    });
  }
  return out;
}

export function MedicineDashboardPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="medicine-dashboard">
      {() => <Body patientId={patientId} />}
    </RecordsFrame>
  );
}

function Body({ patientId }: { patientId: string }) {
  const q = useMedicalHistory(patientId);
  if (q.isError) return <ErrorState title="Couldn't load the medicine history" description={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={120} />)}</Stack>;
  return <Loaded h={q.data} />;
}

const FILTERS0 = { from: "", to: "", doctor: "", specialty: "", medicine: "", kind: "", status: "" };

const fieldSx = {
  minWidth: 0,
  "& .MuiInputBase-root": { height: 34, fontSize: 12.5, bgcolor: "#FFFFFF", borderRadius: "9px", color: NAVY },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: CARD_BORDER },
} as const;

function Loaded({ h }: { h: MedicalHistory }) {
  const today = istToday();
  const events = useMemo(() => buildEvents(h, today), [h, today]);
  const desktop = useMediaQuery("(min-width:1200px)");
  const [view, setView] = useState<"timeline" | "doctors">("timeline");
  const [f, setF] = useState(FILTERS0);
  const [moreFilters, setMoreFilters] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [selected, setSelected] = useState<MedEvent | null>(null);
  const [shown, setShown] = useState(12);
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const doctors = useMemo(() => [...new Map(events.map((e) => [e.doctorId ?? e.doctorName, e.doctorName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [events]);
  const specialties = useMemo(() => [...new Set(events.flatMap((e) => e.specialties))].sort(), [events]);
  const medicines = useMemo(() => [...new Map(events.map((e) => [medicineKey(e.item), e.item.medicineName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [events]);

  const filtered = useMemo(() => {
    const list = events.filter(
      (e) =>
        (!f.from || (e.day ?? "") >= f.from) &&
        (!f.to || (e.day ?? "") <= f.to) &&
        (!f.doctor || (e.doctorId ?? e.doctorName) === f.doctor) &&
        (!f.specialty || e.specialties.includes(f.specialty)) &&
        (!f.medicine || medicineKey(e.item) === f.medicine) &&
        (!f.kind || e.kind === f.kind) &&
        (!f.status || e.status === f.status),
    );
    return list.sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)) || a.key.localeCompare(b.key));
  }, [events, f, newestFirst]);

  const rxAll = signedRx(h);
  const current = events.filter((e) => e.status === "active").sort((a, b) => b.at.localeCompare(a.at));
  const completed = events.filter((e) => e.status === "completed");
  const dirty = JSON.stringify(f) !== JSON.stringify(FILTERS0);
  const set = (k: keyof typeof FILTERS0) => (e: ChangeEvent<HTMLInputElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setShown(12);
  };
  // Below the side-by-side breakpoint the details card is stacked under the timeline: bring it into view on select.
  const open = (e: MedEvent) => {
    setSelected(e);
    if (!desktop) requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const selectField = (k: keyof typeof FILTERS0, label: string, all: string, options: [string, string][], disabled = false) => (
    <TextField
      select
      size="small"
      value={f[k]}
      onChange={set(k)}
      disabled={disabled}
      sx={{ ...fieldSx, minWidth: 130, flex: "1 1 130px" }}
      slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": label } }}
    >
      <MenuItem value="">{all}</MenuItem>
      {options.map(([v, n]) => <MenuItem key={v} value={v}>{n}</MenuItem>)}
    </TextField>
  );
  const dateField = (k: "from" | "to", label: string) => (
    <TextField
      type="date"
      size="small"
      value={f[k]}
      onChange={set(k)}
      sx={{ ...fieldSx, minWidth: 150, flex: "1 1 150px" }}
      slotProps={{
        htmlInput: { "aria-label": `${label} date` },
        input: { startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>{label}</Typography></InputAdornment> },
      }}
    />
  );

  const detailPanel = selected ? <MedDetails e={selected} all={events} onClose={() => setSelected(null)} /> : <DetailsPlaceholder />;

  const viewToggle = (
    <Stack direction="row" sx={{ p: "2px", borderRadius: "9px", bgcolor: BLUE_LT, border: 1, borderColor: CARD_BORDER }}>
      {([["timeline", "Timeline"], ["doctors", "By doctor"]] as const).map(([k, l]) => (
        <Button
          key={k}
          size="small"
          onClick={() => setView(k)}
          aria-pressed={view === k}
          sx={{ minWidth: 0, px: 1.25, py: 0.2, fontSize: 12, fontWeight: 700, textTransform: "none", borderRadius: "7px", color: view === k ? "#fff" : NAVY, bgcolor: view === k ? BLUE : "transparent", "&:hover": { bgcolor: view === k ? "#0757B8" : "#fff" } }}
        >
          {l}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        <OthersHiddenLine category="medications" />

        {/* Summary cards — counted from the records */}
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "repeat(2, minmax(0,1fr))", md: "repeat(4, minmax(0,1fr))" } }}>
          <Stat tone="green" icon="FiPackage" label="Current Medicines" value={String(new Set(current.map((e) => medicineKey(e.item))).size)} note="Within prescribed duration" />
          <Stat tone="blue" icon="FiFileText" label="Total Prescriptions" value={`${rxAll.length}${h.capped.prescriptions ? "+" : ""}`} note={`${events.length} medicine line${events.length === 1 ? "" : "s"}`} />
          <Stat tone="orange" icon="FiEdit3" label="Modified Medicines" value="—" note="Per-medicine changes not recorded" />
          <Stat tone="purple" icon="FiSlash" label="Discontinued Medicines" value="—" note="Not recorded by the system" />
        </Box>

        {events.length === 0 ? (
          <Panel title="Medicine Timeline" icon="FiClock" tone="blue">
            <EmptyBlock icon="FiPackage" title="No signed prescriptions yet" text="No signed prescription is available for you to see for this patient." />
          </Panel>
        ) : (
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ display: "grid", gap: 1.5, alignItems: "start", minWidth: 0, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,7fr) minmax(0,3fr)" } }}>
              <Panel
                title="Medicine Timeline"
                icon="FiClock"
                tone="blue"
                hint={view === "timeline" ? `${filtered.length} of ${events.length} event${events.length === 1 ? "" : "s"}` : `${events.length} medicine line${events.length === 1 ? "" : "s"}`}
                actions={
                  <Stack direction="row" useFlexGap sx={{ gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                    {view === "timeline" && (
                      <Button size="small" onClick={() => setNewestFirst((v) => !v)} startIcon={<Icon name={newestFirst ? "FiArrowDown" : "FiArrowUp"} size={13} />} sx={{ borderRadius: "9px", textTransform: "none", fontWeight: 700, fontSize: 12, color: NAVY }}>
                        {newestFirst ? "Newest first" : "Oldest first"}
                      </Button>
                    )}
                    {viewToggle}
                  </Stack>
                }
              >
                {view === "doctors" ? (
                  <ByDoctor events={events} onOpen={open} />
                ) : (
                  <>
                    <Stack direction="row" useFlexGap sx={{ gap: 0.75, mb: 1, flexWrap: "wrap", alignItems: "center" }}>
                      {dateField("from", "From")}
                      {dateField("to", "To")}
                      {selectField("medicine", "Medicine", "All medicines", medicines)}
                      {selectField("kind", "Event type", "All event types", EVENT_KINDS.filter((k) => events.some((e) => e.kind === k.key)).map((k) => [k.key, k.label]))}
                      <Button size="small" onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters} startIcon={<Icon name="FiFilter" size={13} />} sx={{ borderRadius: "9px", textTransform: "none", fontWeight: 700, fontSize: 12, color: NAVY, height: 34 }}>
                        More
                      </Button>
                      <Button size="small" disabled={!dirty} onClick={() => { setF(FILTERS0); setShown(12); }} sx={{ textTransform: "none", fontSize: 12, height: 34 }}>Clear</Button>
                    </Stack>
                    {moreFilters && (
                      <Stack direction="row" useFlexGap sx={{ gap: 0.75, mb: 1, flexWrap: "wrap" }}>
                        {selectField("doctor", "Doctor", "All doctors", doctors)}
                        {selectField("specialty", "Specialty", "All specialties", specialties.map((s) => [s, s]), !specialties.length)}
                        {selectField("status", "Status", "All statuses", (Object.keys(STATUS_LABEL) as CourseStatus[]).map((s) => [s, STATUS_LABEL[s]]))}
                      </Stack>
                    )}

                    {filtered.length === 0 ? (
                      <EmptyBlock icon="FiSearch" title="No matching events" text="No medicine event matches these filters." />
                    ) : (
                      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.75, containerType: "inline-size" }}>
                        {filtered.slice(0, shown).map((e) => (
                          <TimelineRow key={e.key} e={e} selected={selected?.key === e.key} onOpen={() => open(e)} />
                        ))}
                      </Box>
                    )}
                    {shown < filtered.length && (
                      <Box sx={{ textAlign: "center", mt: 1 }}>
                        <Button size="small" onClick={() => setShown((n) => n + 12)} sx={{ borderRadius: "9px", textTransform: "none", fontWeight: 700, bgcolor: BLUE_LT, color: BLUE, "&:hover": { bgcolor: "#DCEAFF" } }}>
                          Show more ({filtered.length - shown} left)
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Panel>

              <Stack
                ref={detailsRef}
                spacing={1}
                sx={{ minWidth: 0, scrollMarginTop: 12, position: { lg: "sticky" }, top: { lg: 12 }, maxHeight: { lg: "calc(100vh - 24px)" }, overflowY: { lg: "auto" }, overscrollBehavior: "contain" }}
              >
                <Panel title="Current Medicine List" icon="FiPackage" tone="green" hint={current.length ? `${current.length} active` : undefined}>
                  {current.length === 0 ? (
                    <EmptyBlock icon="FiPackage" title="No current medicines" text="No medicine is currently within its prescribed duration." />
                  ) : (
                    <CompactCurrentList rows={current} selectedKey={selected?.key ?? null} onOpen={open} />
                  )}
                </Panel>
                {detailPanel}
              </Stack>
            </Box>

            <Box sx={{ display: "grid", gap: 1.5, alignItems: "start", minWidth: 0, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,52fr) minmax(0,28fr) minmax(0,20fr)" } }}>
              <Panel title="Current Medication List" icon="FiPackage" tone="green">
                {current.length === 0 ? (
                  <EmptyBlock icon="FiPackage" title="No current medicines" text="No medicine is currently within its prescribed duration." />
                ) : (
                  <CurrentList rows={current} onOpen={open} />
                )}
              </Panel>
              <Panel title="Key Insights" icon="FiZap" tone="teal">
                <Insights h={h} events={events} current={current.length} completed={completed.length} />
              </Panel>
              <Panel title="Legend" icon="FiInfo" tone="purple">
                <Legend />
              </Panel>
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function Panel({
  title,
  hint,
  icon = "FiInfo",
  tone,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  icon?: string;
  tone: CardTone;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = CARD_TONES[tone];
  return (
    <Paper elevation={0} component="section" sx={{ borderRadius: "13px", border: 1, borderColor: CARD_BORDER, bgcolor: "#FFFFFF", boxShadow: CARD_SHADOW, minWidth: 0, overflow: "hidden" }}>
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", gap: 1, px: { xs: 1.25, sm: 1.5 }, py: 1, borderBottom: 1, borderColor: "#E3ECFB", bgcolor: "#F7FAFF", flexWrap: "wrap" }}>
        <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: t.bg, color: t.fg, border: 1, borderColor: t.border, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name={icon} size={14} />
        </Box>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 14.5, color: NAVY, letterSpacing: "-0.005em" }}>{title}</Typography>
        {hint ? <Typography sx={{ ...subtle, flex: 1, minWidth: 60 }}>{hint}</Typography> : <Box sx={{ flex: 1 }} />}
        {actions}
      </Stack>
      <Box sx={{ p: { xs: 1.25, sm: 1.5 }, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

function Stat({ tone, icon, label, value, note }: { tone: CardTone; icon: string; label: string; value: string; note: string }) {
  const t = CARD_TONES[tone];
  return (
    <Paper elevation={0} sx={{ p: 1.5, minHeight: 84, borderRadius: "12px", border: 1, borderColor: t.border, bgcolor: t.bg, boxShadow: SOFT, minWidth: 0, display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "#FFFFFF", color: t.fg, border: 1, borderColor: t.border, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={20} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: NAVY, fontWeight: 600, fontSize: 12.5, lineHeight: 1.3 }}>{label}</Typography>
        <Typography sx={{ color: t.heading, fontWeight: 800, fontSize: 26, lineHeight: 1.15 }}>{value}</Typography>
        <Typography sx={{ color: MUTED, fontSize: 11, lineHeight: 1.3 }}>{note}</Typography>
      </Box>
    </Paper>
  );
}

function Badge({ tone, label }: { tone: CardTone; label: string }) {
  const t = CARD_TONES[tone];
  return <Chip size="small" label={label} sx={{ height: 21, bgcolor: t.bg, color: t.heading, border: 1, borderColor: t.border, fontWeight: 700, fontSize: 11, "& .MuiChip-label": { px: 1 } }} />;
}

function StatusChip({ s }: { s: CourseStatus }) {
  return <Badge tone={STATUS_TONE[s]} label={STATUS_LABEL[s]} />;
}

function MedicineBadge({ item, size = 40 }: { item: VisitRxItem; size?: number }) {
  const t = CARD_TONES.blue;
  return (
    <Box sx={{ width: size, height: size, borderRadius: "10px", bgcolor: t.bg, border: 1, borderColor: t.border, color: t.fg, display: "grid", placeItems: "center", flexShrink: 0 }}>
      <Icon name={formIcon(item.dosageForm)} size={Math.round(size * 0.46)} />
    </Box>
  );
}

function DoctorAvatar({ e, size = 36 }: { e: Pick<MedEvent, "photoUrl" | "doctorName">; size?: number }) {
  return (
    <Avatar
      src={e.photoUrl ?? undefined}
      alt={e.doctorName}
      sx={{ width: size, height: size, bgcolor: CARD_TONES.blue.bg, color: CARD_TONES.blue.fg, fontWeight: 700, fontSize: size / 2.4, border: "2px solid #fff", boxShadow: SOFT, flexShrink: 0 }}
    >
      {e.doctorName.replace(/^dr\.?\s*/i, "").slice(0, 1)}
    </Avatar>
  );
}

/** One medicine event as a single horizontal row (two compact lines when the panel is narrow). */
function TimelineRow({ e, selected, onOpen }: { e: MedEvent; selected: boolean; onOpen: () => void }) {
  const kind = EVENT_KINDS.find((k) => k.key === e.kind)!;
  const t = CARD_TONES[kind.tone];
  const instruction = e.item.notes || (e.item.timing ? TIMING_LABEL[e.item.timing] ?? titleCase(e.item.timing) : null);
  return (
    <Box component="li" sx={{ minWidth: 0 }}>
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        aria-label={`Open details: ${e.item.medicineName}, ${dayLabel(e.day)}`}
        aria-pressed={selected}
        sx={{
          all: "unset",
          boxSizing: "border-box",
          cursor: "pointer",
          width: "100%",
          minHeight: 64,
          px: 1.25,
          py: 0.9,
          borderRadius: "10px",
          border: 1,
          borderColor: selected ? t.fg : "#E1EAF8",
          borderLeft: `4px solid ${t.fg}`,
          bgcolor: selected ? "#F1F7FF" : "#FFFFFF",
          display: "grid",
          alignItems: "center",
          columnGap: 1.5,
          rowGap: 0.6,
          gridTemplateColumns: "auto auto minmax(0,1fr)",
          gridTemplateAreas: '"date kind trail" "med med med" "doc doc dose"',
          transition: "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
          "&:hover": { bgcolor: "#F5F9FF", borderColor: t.border, boxShadow: "0 2px 8px rgba(8,102,217,0.10)" },
          "&:focus-visible": { outline: "2px solid", outlineColor: BLUE, outlineOffset: 2 },
          "@container (min-width: 760px)": {
            gridTemplateColumns: "84px 104px minmax(0,1.25fr) minmax(0,1.1fr) minmax(0,1fr) auto",
            gridTemplateAreas: '"date kind med doc dose trail"',
          },
        }}
      >
        <Box sx={{ gridArea: "date", display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap", "@container (min-width: 760px)": { display: "block" } }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{dayLabel(e.day)}</Typography>
          {e.time && <Typography sx={{ ...subtle, fontSize: 11 }}>{e.time}</Typography>}
        </Box>
        <Box sx={{ gridArea: "kind" }}><Badge tone={kind.tone} label={kind.label} /></Box>

        <Stack direction="row" spacing={1} sx={{ gridArea: "med", alignItems: "center", minWidth: 0 }}>
          <MedicineBadge item={e.item} size={34} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: NAVY, lineHeight: 1.3, overflowWrap: "anywhere" }}>{e.item.medicineName}</Typography>
            <Typography sx={subtle}>{[e.item.strength, e.item.dosageForm ? titleCase(e.item.dosageForm) : null].filter(Boolean).join(" · ") || "Strength not recorded"}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.9} sx={{ gridArea: "doc", alignItems: "center", minWidth: 0 }}>
          <DoctorAvatar e={e} size={28} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAVY, lineHeight: 1.3, overflowWrap: "anywhere" }}>{e.doctorName}</Typography>
            <Typography sx={{ ...subtle, fontSize: 11 }}>{[e.specialties[0], e.clinic].filter(Boolean).join(" · ") || "Specialty not recorded"}</Typography>
          </Box>
        </Stack>

        <Box sx={{ gridArea: "dose", minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: NAVY, lineHeight: 1.3, overflowWrap: "anywhere" }}>{doseFreq(e.item) ?? "Dose not recorded"}</Typography>
          {instruction && <Typography sx={{ ...subtle, fontSize: 11, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{instruction}</Typography>}
        </Box>

        <Stack direction="row" spacing={0.75} sx={{ gridArea: "trail", alignItems: "center", justifySelf: "end" }}>
          {e.rx.version > 1 && <Badge tone="orange" label={`Amended v${e.rx.version}`} />}
          <StatusChip s={e.status} />
          <Icon name="FiChevronRight" size={16} color="#8AA0C4" />
        </Stack>
      </Box>
    </Box>
  );
}

function Legend() {
  return (
    <Stack component="ul" spacing={0.9} aria-label="Timeline colour legend" sx={{ m: 0, p: 0, listStyle: "none" }}>
      {EVENT_KINDS.map((k) => {
        const t = CARD_TONES[k.tone];
        return (
          <Stack component="li" key={k.key} direction="row" spacing={1} sx={{ alignItems: "center" }} title={k.recorded ? "Recorded by the system" : "Not recorded by the system — never shown as an event"}>
            <Box sx={{ width: 11, height: 11, borderRadius: "50%", bgcolor: t.fg, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>{k.label}</Typography>
            {!k.recorded && <Typography sx={{ ...subtle, fontSize: 10, ml: "auto !important" }}>not tracked</Typography>}
          </Stack>
        );
      })}
    </Stack>
  );
}

/** Compact right-column list of medicines still within their prescribed duration; shares the timeline's selection. */
function CompactCurrentList({ rows, selectedKey, onOpen }: { rows: MedEvent[]; selectedKey: string | null; onOpen: (e: MedEvent) => void }) {
  return (
    <Box component="ul" aria-label="Current medicines" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 240, overflowY: "auto", pr: 0.25 }}>
      {rows.map((e) => {
        const sel = selectedKey === e.key;
        return (
          <Box component="li" key={e.key} sx={{ minWidth: 0 }}>
            <Box
              component="button"
              type="button"
              onClick={() => onOpen(e)}
              aria-pressed={sel}
              aria-label={`Show details: ${medLabel(e.item)}`}
              sx={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                width: "100%",
                px: 1,
                py: 0.7,
                borderRadius: "10px",
                border: 1,
                borderColor: sel ? BLUE : "#E1EAF8",
                bgcolor: sel ? "#F1F7FF" : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { bgcolor: "#F5F9FF", borderColor: CARD_BORDER },
                "&:focus-visible": { outline: "2px solid", outlineColor: BLUE, outlineOffset: 1 },
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: NAVY, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                  {e.item.medicineName}
                  {e.item.strength ? <Box component="span" sx={{ fontWeight: 600, color: MUTED }}> · {e.item.strength}</Box> : null}
                </Typography>
                <Typography sx={{ ...subtle, fontSize: 11 }}>{doseFreq(e.item) ?? "Dose not recorded"}</Typography>
              </Box>
              <StatusChip s={e.status} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function CurrentList({ rows, onOpen }: { rows: MedEvent[]; onOpen: (e: MedEvent) => void }) {
  const [all, setAll] = useState(false);
  const list = all ? rows : rows.slice(0, 6);
  const th = {
    textAlign: "left",
    color: NAVY,
    bgcolor: BLUE_LT,
    fontWeight: 700,
    fontSize: 11.5,
    py: 0.9,
    px: 1.25,
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${CARD_BORDER}`,
  } as const;
  return (
    <Box>
      <Box sx={{ overflowX: "auto", border: 1, borderColor: "#E1EAF8", borderRadius: "10px" }}>
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12.5,
            color: NAVY,
            minWidth: 480,
            "& td": { py: 0.7, px: 1.25, borderTop: 1, borderColor: "#E8EFFA", verticalAlign: "middle" },
            "& tbody tr": { cursor: "pointer", height: 48, transition: "background 120ms ease" },
            "& tbody tr:hover": { bgcolor: "#F5F9FF" },
          }}
        >
          <Box component="thead">
            <tr>{["Medicine", "Dose & Frequency", "Status", "Prescribed On"].map((c) => <Box component="th" key={c} sx={th}>{c}</Box>)}</tr>
          </Box>
          <tbody>
            {list.map((e) => (
              <tr key={e.key} onClick={() => onOpen(e)}>
                <td>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                    <MedicineBadge item={e.item} size={28} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, overflowWrap: "anywhere" }}>{e.item.medicineName}</Typography>
                      <Typography sx={{ ...subtle, fontSize: 11 }}>{e.item.strength ?? "Strength not recorded"}</Typography>
                    </Box>
                  </Stack>
                </td>
                <td>{doseFreq(e.item) ?? "—"}</td>
                <td><StatusChip s={e.status} /></td>
                <td style={{ whiteSpace: "nowrap" }}>{dayLabel(e.day)}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      {rows.length > 6 && <Button size="small" onClick={() => setAll((v) => !v)} sx={{ mt: 0.75, textTransform: "none", fontWeight: 700 }}>{all ? "Show fewer" : `View all (${rows.length})`}</Button>}
    </Box>
  );
}

function Insights({ h, events, current, completed }: { h: MedicalHistory; events: MedEvent[]; current: number; completed: number }) {
  const rx = signedRx(h);
  const latest = events.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
  const doctors = new Set(events.map((e) => e.doctorId ?? e.doctorName));
  const lines: string[] = [];
  lines.push(`${current} medicine line${current === 1 ? " is" : "s are"} within the prescribed duration.`);
  if (latest) lines.push(`The latest prescription (${rxLabel(latest.rx)}) was recorded on ${dayLabel(latest.day)} by ${latest.doctorName}.`);
  if (rx.length > 0) lines.push(`${rx.length} signed prescription${rx.length === 1 ? "" : "s"}, from ${doctors.size} prescriber${doctors.size === 1 ? "" : "s"}.`);
  if (completed) lines.push(`${completed} medicine line${completed === 1 ? " has" : "s have"} completed the prescribed duration.`);
  const amended = rx.filter((r) => r.version > 1).length;
  if (amended) lines.push(`${amended} prescription${amended === 1 ? " was" : "s were"} amended after signing.`);
  const repeats = new Map<string, Set<string>>();
  events.forEach((e) => {
    const k = medicineKey(e.item);
    (repeats.get(k) ?? repeats.set(k, new Set()).get(k)!).add(e.rx.id);
  });
  const rep = [...repeats.entries()].filter(([, s]) => s.size > 1).map(([k]) => events.find((e) => medicineKey(e.item) === k)!.item.medicineName);
  if (rep.length) lines.push(`Prescribed more than once: ${rep.slice(0, 4).join(", ")}${rep.length > 4 ? ` +${rep.length - 4} more` : ""}.`);
  const t = CARD_TONES.green;
  return (
    <Stack spacing={0.9} component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
      {lines.map((l) => (
        <Stack component="li" key={l} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: t.bg, color: t.fg, display: "grid", placeItems: "center", flexShrink: 0, mt: 0.1 }}>
            <Icon name="FiCheck" size={12} />
          </Box>
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: NAVY }}>{l}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/** One card per doctor, listing each of THEIR prescriptions once (never merged across doctors, never duplicated). */
function ByDoctor({ events, onOpen }: { events: MedEvent[]; onOpen: (e: MedEvent) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, MedEvent[]>();
    events.forEach((e) => {
      const k = e.doctorId ?? e.doctorName;
      (m.get(k) ?? m.set(k, []).get(k)!).push(e);
    });
    return [...m.entries()].sort((a, b) => b[1][0].at.localeCompare(a[1][0].at));
  }, [events]);
  const th = { textAlign: "left", color: CARD_TONES.purple.heading, bgcolor: CARD_TONES.purple.bg, fontWeight: 800, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", py: 0.9, px: 1.25, whiteSpace: "nowrap", borderBottom: `1px solid ${CARD_TONES.purple.border}` } as const;

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      {groups.map(([, evs]) => {
        const first = evs[0];
        const byRx = new Map<string, MedEvent[]>();
        evs.slice().sort((a, b) => b.at.localeCompare(a.at)).forEach((e) => (byRx.get(e.rx.id) ?? byRx.set(e.rx.id, []).get(e.rx.id)!).push(e));
        const specialty = [...new Set(evs.flatMap((e) => e.specialties))].join(", ");
        const clinics = [...new Set(evs.map((e) => e.clinic).filter((c): c is string => Boolean(c)))].join(", ");
        const dates = [...new Set(evs.map((e) => dayLabel(e.day)))];
        const photo = evs.find((x) => x.photoUrl) ?? first;
        return (
          <Paper key={first.doctorId ?? first.doctorName} elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW, overflow: "hidden", minWidth: 0 }}>
            <Box sx={{ px: { xs: 1.25, sm: 1.75 }, py: 1.5, background: "linear-gradient(120deg, #EEF2FF 0%, #F7F1FF 100%)", borderBottom: 1, borderColor: "#E7E5F8" }}>
              <Stack direction="row" useFlexGap spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <DoctorAvatar e={photo} size={54} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#2B2350", lineHeight: 1.3 }}>{first.doctorName}</Typography>
                  <Typography sx={{ ...subtle, fontSize: 12 }}>{specialty || "Specialty not recorded"}{clinics ? ` · ${clinics}` : ""}</Typography>
                  <Stack direction="row" useFlexGap sx={{ gap: 0.6, mt: 0.6, flexWrap: "wrap" }}>
                    <Chip size="small" label={`${byRx.size} prescription${byRx.size === 1 ? "" : "s"}`} sx={{ height: 22, bgcolor: "#FFFFFF", color: CARD_TONES.blue.heading, border: 1, borderColor: CARD_TONES.blue.border, fontWeight: 700, fontSize: 11 }} />
                    <Chip size="small" label={`${evs.length} medicine line${evs.length === 1 ? "" : "s"}`} sx={{ height: 22, bgcolor: CARD_TONES.purple.bg, color: CARD_TONES.purple.heading, border: 1, borderColor: CARD_TONES.purple.border, fontWeight: 700, fontSize: 11 }} />
                  </Stack>
                </Box>
                <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                  <Typography sx={{ ...subtle, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>Prescription dates</Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#475467" }}>{dates.length === 1 ? dates[0] : `${dates[dates.length - 1]} – ${dates[0]}`}</Typography>
                </Box>
              </Stack>
            </Box>

            <Stack spacing={1.5} sx={{ p: { xs: 1.25, sm: 1.75 } }}>
              {[...byRx.values()].map((items) => {
                const e0 = items[0];
                return (
                  <Box key={e0.rx.id} sx={{ border: 1, borderColor: CARD_BORDER, borderRadius: 2.5, overflow: "hidden", bgcolor: "#fff" }}>
                    <Stack direction="row" useFlexGap sx={{ gap: 1, alignItems: "center", flexWrap: "wrap", px: 1.35, py: 0.9, bgcolor: "#F6F8FF", borderBottom: 1, borderColor: "#E9EDFA" }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: CARD_TONES.blue.fg, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon name="FiFileText" size={13} />
                      </Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: CARD_TONES.blue.heading }}>{rxLabel(e0.rx)}</Typography>
                      <Typography sx={{ ...subtle, fontSize: 11 }}>
                        {dayLabel(e0.day)}
                        {e0.consultationId ? ` · Consultation #${e0.consultationId}` : " · Walk-in"}
                        {e0.diagnosis ? ` · Dx: ${e0.diagnosis}` : ""}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Chip size="small" label={`${items.length} medicine${items.length === 1 ? "" : "s"}`} sx={{ height: 21, bgcolor: "#fff", color: CARD_TONES.blue.heading, border: 1, borderColor: CARD_TONES.blue.border, fontWeight: 700, fontSize: 10.5 }} />
                    </Stack>
                    <Box sx={{ overflowX: "auto" }}>
                      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640, "& td": { py: 0.95, px: 1.25, borderTop: 1, borderColor: "#F0F2F8", verticalAlign: "middle" }, "& tbody tr": { cursor: "pointer" }, "& tbody tr:hover": { bgcolor: "#F7F9FF" } }}>
                        <Box component="thead"><tr>{["Medicine", "Dose & frequency", "Duration", "Status", ""].map((c) => <Box component="th" key={c} sx={th}>{c}</Box>)}</tr></Box>
                        <tbody>
                          {items.map((e) => (
                            <tr key={e.key} onClick={() => onOpen(e)}>
                              <td>
                                <Stack direction="row" spacing={0.9} sx={{ alignItems: "center", minWidth: 0 }}>
                                  <MedicineBadge item={e.item} size={28} />
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: 12.5, overflowWrap: "anywhere" }}>{e.item.medicineName}</Typography>
                                    <Typography sx={{ ...subtle, fontSize: 10.5 }}>{e.item.strength ?? "Strength not recorded"}</Typography>
                                  </Box>
                                </Stack>
                              </td>
                              <td>{doseFreq(e.item) ?? "Dose not recorded"}</td>
                              <td>{durationText(e.item) ?? "—"}</td>
                              <td><StatusChip s={e.status} /></td>
                              <td style={{ textAlign: "right" }}><Icon name="FiChevronRight" size={15} color="#98A2B3" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

function DetailsPlaceholder() {
  return (
    <Panel title="Medicine Details" icon="FiFileText" tone="blue">
      <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", py: 4, px: 1 }}>
        <Box sx={{ width: 54, height: 54, borderRadius: "50%", bgcolor: CARD_TONES.blue.bg, color: CARD_TONES.blue.fg, display: "grid", placeItems: "center" }}>
          <Icon name="FiPackage" size={24} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Select a medicine</Typography>
        <Typography sx={{ ...subtle, fontSize: 12, maxWidth: 240 }}>
          Choose a row in the timeline to see its prescription, prescriber and recorded medication history here.
        </Typography>
      </Stack>
    </Panel>
  );
}

function MedDetails({ e, all, onClose }: { e: MedEvent; all: MedEvent[]; onClose: () => void }) {
  const history = all.filter((x) => medicineKey(x.item) === medicineKey(e.item)).sort((a, b) => b.at.localeCompare(a.at));
  const i = e.item;
  const facts: { k: string; v: string | null }[] = [
    { k: "Prescription ID", v: rxLabel(e.rx) },
    { k: "Consultation ID", v: e.consultationId ? `#${e.consultationId}` : "Walk-in" },
    { k: "Start date", v: e.start ? dayLabel(e.start) : null },
    { k: "End date", v: e.end ? dayLabel(e.end) : null },
    { k: "Dosage", v: i.dosage },
    { k: "Frequency", v: i.frequency },
    { k: "Duration", v: durationText(i) },
    { k: "Food instructions", v: i.timing ? TIMING_LABEL[i.timing] ?? titleCase(i.timing) : null },
    { k: "Linked diagnosis", v: e.diagnosis },
    { k: "Prescription status", v: `Signed${e.rx.version > 1 ? ` · v${e.rx.version}` : ""}` },
  ];

  return (
    <Paper elevation={0} component="section" aria-label="Medicine details" sx={{ borderRadius: "13px", overflow: "hidden", border: 1, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW, bgcolor: "#FFFFFF", minWidth: 0 }}>
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", gap: 1, px: 1.5, py: 1, borderBottom: 1, borderColor: "#E3ECFB", bgcolor: "#F7FAFF" }}>
        <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: CARD_TONES.blue.bg, color: CARD_TONES.blue.fg, border: 1, borderColor: CARD_TONES.blue.border, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="FiPackage" size={14} />
        </Box>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 14.5, color: NAVY, flex: 1 }}>Medicine Details</Typography>
        <StatusChip s={e.status} />
        <IconButton aria-label="Close medicine details" onClick={onClose} size="small" sx={{ p: 0.4 }}>
          <Icon name="FiX" size={16} />
        </IconButton>
      </Stack>

      <Stack spacing={1.25} sx={{ p: 1.5, minWidth: 0 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
          <MedicineBadge item={i} size={48} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.25, color: NAVY, overflowWrap: "anywhere" }}>{i.medicineName}</Typography>
            <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{i.strength || "Strength not recorded"}</Typography>
            <Typography sx={{ ...subtle, fontSize: 11.5 }}>{[i.dosageForm ? titleCase(i.dosageForm) : null, i.route ? `Route: ${titleCase(i.route)}` : null].filter(Boolean).join(" · ") || "Form and route not recorded"}</Typography>
          </Box>
        </Stack>

        <Box sx={{ p: 1, borderRadius: "10px", bgcolor: BLUE_LT, border: 1, borderColor: CARD_BORDER, display: "flex", gap: 1.1, alignItems: "center" }}>
          <DoctorAvatar e={e} size={42} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}>Prescribed by</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, color: NAVY, overflowWrap: "anywhere" }}>{e.doctorName}</Typography>
            <Typography sx={subtle}>{[e.specialties.join(", ") || "Specialty not recorded", e.clinic].filter(Boolean).join(" · ")}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gap: 0.6, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          {facts.map((x) => (
            <Box key={x.k} sx={{ p: 0.8, borderRadius: "8px", bgcolor: "#F7FAFF", border: 1, borderColor: "#E3ECFB", minWidth: 0 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: MUTED, lineHeight: 1.3 }}>{x.k}</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: x.v ? NAVY : "#98A2B3", lineHeight: 1.35, mt: 0.15, overflowWrap: "anywhere" }}>{x.v || "—"}</Typography>
            </Box>
          ))}
        </Box>

        {i.notes && (
          <Box sx={{ p: 1, borderRadius: "8px", bgcolor: CARD_TONES.orange.bg, border: 1, borderColor: CARD_TONES.orange.border }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: CARD_TONES.orange.heading }}>Instructions</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.2, color: NAVY }}>{i.notes}</Typography>
          </Box>
        )}

        <Box>
          <SectionLabel icon="FiClock" tone="blue">Medication History</SectionLabel>
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {history.map((x, idx) => {
              const amended = x.rx.version > 1;
              const tone = CARD_TONES[amended ? "orange" : "blue"];
              return (
                <Box key={x.key} component="li" sx={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr)", columnGap: 1 }}>
                  <Box sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
                    {idx < history.length - 1 && <Box aria-hidden sx={{ position: "absolute", top: 22, bottom: -4, width: 2, bgcolor: tone.border, borderRadius: 1 }} />}
                    <Box sx={{ mt: 0.3, width: 22, height: 22, borderRadius: "50%", bgcolor: tone.fg, color: "#fff", display: "grid", placeItems: "center", zIndex: 1 }}>
                      <Icon name={amended ? "FiEdit3" : "FiFileText"} size={10} />
                    </Box>
                  </Box>
                  <Box sx={{ pb: 1.1, minWidth: 0 }}>
                    <Stack direction="row" useFlexGap sx={{ alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{amended ? "Prescription amended" : "Prescription created"}</Typography>
                      <Typography sx={{ ...subtle, fontSize: 10.5 }}>{dayLabel(x.day)}{x.time ? ` · ${x.time}` : ""}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: "#3D4B6B", lineHeight: 1.4 }}>
                      {x.doctorName} · {rxLabel(x.rx)} · {medLabel(x.item)}
                      {doseFreq(x.item) ? ` · ${doseFreq(x.item)}` : ""}
                      {durationText(x.item) ? ` · ${durationText(x.item)}` : ""}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ ...subtle, fontSize: 10.5, mt: 0.25 }}>
            Only recorded prescription versions are listed — administration, modification, discontinuation and reconciliation are not tracked per medicine.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function SectionLabel({ icon, tone, children }: { icon: string; tone: CardTone; children: React.ReactNode }) {
  const t = CARD_TONES[tone];
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
      <Box sx={{ width: 24, height: 24, borderRadius: 1.25, bgcolor: t.bg, color: t.fg, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={12} />
      </Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: t.heading }}>{children}</Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: "#EAECF6" }} />
    </Stack>
  );
}

function EmptyBlock({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", py: 3, px: 1 }}>
      <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "#F2F4FC", color: "#6D5BD0", display: "grid", placeItems: "center" }}>
        <Icon name={icon} size={20} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{title}</Typography>
      <Muted>{text}</Muted>
    </Stack>
  );
}
