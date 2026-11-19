"use client";

/**
 * Clinical Dashboard — the default view of a patient's clinical records, laid
 * out as the doctor-comparison timeline: one column per doctor who actually
 * recorded something, clinical events as rows, a comparison summary, key
 * insights and a per-doctor diagnosis card list. It summarises, and links to,
 * the four detailed tabs; it creates no records and calls no new endpoint.
 * Data = the structured history, the permitted documents and the vitals
 * matrix (all re-authorised by the server per request). Other doctors'
 * records appear only for categories the patient granted, exactly as in the
 * Clinical tab — each record keeps its own doctor, never merged or replaced.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory, usePatientDocuments, usePatientVitals } from "../hooks";
import { dayLabel, istToday } from "../format";
import { DocumentViewer, downloadDocument } from "../components/PatientDocuments";
import { MedicinesTable } from "../components/HistoryViews";
import { documentKindLabel, fileTypeLabel } from "@/features/records/documentKinds";
import { RecordsFrame, Section, StatRow, Muted } from "./RecordsKit";
import { courseOf, diagnosisTypeLabel, signedRx } from "./derive";
import { DiagnosisDetail } from "./DiagnosisDetail";
import {
  EMPTY_FILTERS, EV_KIND, buildDash, byMonth, countBy, isMedicalReport, reportGroup,
  type DashEvent, type DashFilters, type DashRow, type EvKind,
} from "./dashboard";
import {
  COMP_ROWS, COMP_TONES, buildComparison, filterComparison,
  type Comparison, type CompDoctor, type CompRecord, type CompRowKey, type CompTone,
} from "./comparison";
import type { MedicalHistory, PatientDocument, VitalEntry, VitalKey } from "@/types/emr";

const PALETTE = ["#7543C6", "#138477", "#D97706", "#16834A", "#596579", "#B42323"];

export function ClinicalDashboardPage({ patientId, page = "clinical-dashboard" }: { patientId: string; page?: "clinical-dashboard" | "doctor-comparison" }) {
  return (
    <RecordsFrame patientId={patientId} page={page} compact>
      {() => <Body patientId={patientId} />}
    </RecordsFrame>
  );
}

function Body({ patientId }: { patientId: string }) {
  // One request each, shared with the other tabs through the query cache.
  const histQ = useMedicalHistory(patientId);
  const docsQ = usePatientDocuments(patientId);
  const vitQ = usePatientVitals(patientId);

  if (histQ.isError) return <ErrorState title="Couldn't load the clinical history" description={getErrorMessage(histQ.error)} onRetry={() => histQ.refetch()} />;
  if (!histQ.data) return <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={110} />)}</Stack>;
  return (
    <Loaded
      key={patientId}
      patientId={patientId}
      h={histQ.data}
      docs={docsQ.data ?? []}
      docsError={docsQ.isError ? getErrorMessage(docsQ.error) : null}
      onRetryDocs={() => docsQ.refetch()}
      vitals={vitQ.data?.entries ?? []}
    />
  );
}

/** Maps a comparison row onto the event kind the drawer labels it with. */
const KIND_OF_ROW: Record<CompRowKey, EvKind> = {
  initial: "consultation", diagnosis: "diagnosis", confirmation: "diagnosis", status: "diagnosis",
  investigation: "investigation", treatment: "treatment", followup: "follow_up", reconciliation: "consultation",
};

function Loaded({ patientId, h, docs, docsError, onRetryDocs, vitals }: {
  patientId: string; h: MedicalHistory; docs: PatientDocument[];
  docsError: string | null; onRetryDocs: () => void; vitals: VitalEntry[];
}) {
  const { events, rows } = useMemo(() => buildDash(h, docs), [h, docs]); // analytics + drawer row lookup
  const base = useMemo(() => buildComparison(h, docs), [h, docs]);
  // Report counts leave out prescription PDFs — those are counted as prescriptions.
  const reports = useMemo(() => docs.filter(isMedicalReport), [docs]);
  // Time range defaults to the last 2 months; it only fills from/to, so it combines with the other filters.
  const [defaults] = useState<DashFilters>(() => ({ ...EMPTY_FILTERS, from: rangeFrom(DEFAULT_RANGE) }));
  const [draft, setDraft] = useState<DashFilters>(defaults);
  const [applied, setApplied] = useState<DashFilters>(defaults);
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [sel, setSel] = useState<{ row?: DashRow; ev?: DashEvent } | null>(null);
  const [viewing, setViewing] = useState<PatientDocument | null>(null);
  const [openDxKey, setOpenDxKey] = useState<string | null>(null);

  const doctors = useMemo(() => base.doctors.map((d): [string, string] => [d.key, d.name]), [base]);
  const specialties = useMemo(() => [...new Set(base.doctors.flatMap((d) => d.specialties))].sort(), [base]);
  const diagnoses = useMemo(() => [...new Set(base.dxRows.map((d) => d.name))].sort(), [base]);
  const statuses = useMemo(() => [...new Set(base.records.map((r) => r.status).filter((s): s is string => Boolean(s)))].sort(), [base]);

  // The end date is inclusive of the whole day (records may carry a time part).
  const shown = useMemo(() => filterComparison(base, applied.to ? { ...applied, to: `${applied.to}T23:59:59.999` } : applied), [base, applied]);
  const filtered = JSON.stringify(applied) !== JSON.stringify(EMPTY_FILTERS);

  // A diagnosis opened in place from a card (or a record with no visit row).
  const openedDx = openDxKey ? base.dxRows.find((d) => d.key === openDxKey) ?? null : null;
  if (openedDx) return <DiagnosisDetail r={openedDx} h={h} patientId={patientId} onBack={() => setOpenDxKey(null)} />;

  const openRecord = (rec: CompRecord) => {
    const row = rec.bookingId
      ? rows.find((r) => r.bookingId === rec.bookingId)
      : rec.doc
        ? rows.find((r) => r.doc?.id === rec.doc!.id)
        : undefined;
    if (row) { setSel({ row }); return; }
    if (rec.dxKey) { setOpenDxKey(rec.dxKey); return; }
    if (rec.doc) { setViewing(rec.doc); return; }
    // A record with no visit row (e.g. an investigation with no booking id):
    // show it in the drawer through the event path, with its own doctor.
    const d = base.doctors.find((x) => x.key === rec.doctorKey);
    const ev: DashEvent = {
      id: rec.key, kind: KIND_OF_ROW[rec.row], date: rec.date, title: rec.title, detail: rec.detail,
      doctor: d ? { id: d.id, name: d.name, photoUrl: d.photoUrl } : null,
      specialties: d?.specialties ?? [], clinic: d?.clinic ?? null, bookingId: rec.bookingId,
      status: rec.status ?? "Recorded", diagnosisNames: [],
    };
    setSel({ row: undefined, ev });
  };

  return (
    // No shared wrapper: filter bar, timeline and summary are independent sections.
    <>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Filters draft={draft} setDraft={setDraft} range={range} setRange={setRange} onApply={() => setApplied(draft)} onReset={() => { setRange(DEFAULT_RANGE); setDraft(defaults); setApplied(defaults); }} doctors={doctors} specialties={specialties} diagnoses={diagnoses} statuses={statuses} />

        {docsError && <ErrorState title="Reports couldn't be loaded" description={docsError} onRetry={onRetryDocs} />}

        {/* Timeline on the left; comparison summary and key insights stacked on the right. */}
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,3fr) minmax(0,1fr)" }, alignItems: "start" }}>
          <Section title="Diagnosis Comparison Timeline" dense>
            <ComparisonTable comp={shown} filtered={filtered} onOpen={openRecord} />
          </Section>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Section title="Comparison summary" dense>
              <ComparisonSummary comp={shown} />
            </Section>
            <Section title="Key insights" dense hint="Calculated from the records above — nothing is inferred">
              <KeyInsightsPanel comp={shown} />
            </Section>
          </Stack>
        </Box>

        <Section title="Diagnosis details by doctor" hint="Every diagnosis under the doctor who recorded it">
          <DiagnosisCards comp={shown} onView={setOpenDxKey} />
        </Section>

        <Analytics h={h} docs={reports} events={events} rows={rows} vitals={vitals} />

        <VisitDrawer sel={sel} h={h} onClose={() => setSel(null)} onView={setViewing} />
        {viewing && <DocumentViewer d={viewing} onClose={() => setViewing(null)} />}
      </Stack>
    </>
  );
}

// ── Colour system (the reference palette: blue primary, light pastel tones) ──
const BLUE = "#0757B8";
const BLUE_DK = "#064A98";
const BLUE_LT = "#EAF3FF";
const BLUE_BD = "#D5E2F2";
const NAVY = "#10254D";

type Tone = { fg: string; bg: string; line: string };
const TONE = {
  purple: { fg: "#5933A3", bg: "#F0EAFE", line: "#7543C6" },
  green: { fg: "#12643B", bg: "#E5F6ED", line: "#16834A" },
  blue: { fg: "#1F4480", bg: "#EAF3FF", line: "#2F5FA8" },
  teal: { fg: "#08675B", bg: "#E3F4F1", line: "#138477" },
  orange: { fg: "#A95305", bg: "#FFF0D9", line: "#D97706" },
  rose: { fg: "#A12559", bg: "#FCE7F0", line: "#D6336C" },
  gray: { fg: "#344054", bg: "#F3F4F6", line: "#98A2B3" },
} satisfies Record<string, Tone>;

/** Row colour = event type / status; the text still says what it is. */
const rowTone = (r: DashRow): Tone => {
  if (r.kind === "report") return TONE.blue;
  if (r.status !== "Completed") return TONE.orange;
  return r.diagnoses.some((d) => d.type === "final") ? TONE.green : TONE.purple;
};
const statusTone = (s: string): Tone => {
  const l = s.toLowerCase();
  if (l.includes("complet")) return TONE.green;
  if (l.includes("review")) return TONE.rose;
  if (l.includes("pending") || l.includes("await")) return TONE.orange;
  if (l.includes("available")) return TONE.blue;
  if (l.includes("cancel")) return TONE.rose;
  return TONE.gray;
};
/** The diagnosis status is shown exactly as recorded — only the colour follows it. */
const dxTone = (type: string): Tone => (type === "final" ? TONE.green : type === "provisional" ? TONE.orange : type === "differential" ? TONE.rose : type === "from prescription" ? TONE.gray : TONE.blue);

const Tag = ({ children, tone = TONE.gray, icon }: { children: React.ReactNode; tone?: Tone; icon?: string }) => (
  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.9, py: 0.2, mr: 0.5, mb: 0.4, borderRadius: 1.5, fontSize: 11.5, fontWeight: 600, color: tone.fg, bgcolor: tone.bg, maxWidth: "100%", overflowWrap: "anywhere" }}>
    {icon && <Icon name={icon} size={11} />}{children}
  </Box>
);
const Dash = () => <Typography component="span" color="text.disabled">—</Typography>;

const initials = (name: string) => name.replace(/^dr\.?\s*/i, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const AVATAR_TONES = [TONE.purple, TONE.teal, TONE.blue, TONE.orange, TONE.green, TONE.rose];
/** The doctor's own profile photo (from the visit's doctor relationship); initials if there is none or it fails to load. */
function DocAvatar({ name, photoUrl, size = 30, colors }: { name: string | null | undefined; photoUrl?: string | null; size?: number; colors?: { bg: string; fg: string } }) {
  const t = AVATAR_TONES[[...(name ?? "")].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const c = colors ?? { bg: t.bg, fg: t.fg };
  return (
    <Avatar src={photoUrl ?? undefined} alt={name ?? ""} slotProps={{ img: { referrerPolicy: "no-referrer", loading: "lazy" } }} sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 700, bgcolor: c.bg, color: c.fg, flexShrink: 0 }}>
      {name ? initials(name) : "?"}
    </Avatar>
  );
}
const fileSize = (n: number | null) => (n == null ? null : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const docName = (d: PatientDocument) => d.tag?.trim() || (d.originalName && d.originalName.length <= 40 ? d.originalName : null) || documentKindLabel(d);

// ── Filters ─────────────────────────────────────────────────────────────────
type RangeKey = "1m" | "2m" | "3m" | "6m" | "1y" | "all" | "custom";
const DEFAULT_RANGE: RangeKey = "2m";
const RANGES: [RangeKey, string, number][] = [
  ["1m", "Last 1 Month", 1], ["2m", "Last 2 Months", 2], ["3m", "Last 3 Months", 3],
  ["6m", "Last 6 Months", 6], ["1y", "Last 1 Year", 12], ["all", "All Time", 0], ["custom", "Custom Date Range", 0],
];
/** Start date ("YYYY-MM-DD", IST) of a preset range; "" for All Time / Custom. */
function rangeFrom(range: RangeKey): string {
  const months = RANGES.find((r) => r[0] === range)?.[2] ?? 0;
  if (!months) return "";
  const [y, m, d] = istToday().split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 - months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

function Filters({ draft, setDraft, range, setRange, onApply, onReset, doctors, specialties, diagnoses, statuses }: {
  draft: DashFilters; setDraft: (f: DashFilters) => void; range: RangeKey; setRange: (r: RangeKey) => void; onApply: () => void; onReset: () => void;
  doctors: [string, string][]; specialties: string[]; diagnoses: string[]; statuses: string[];
}) {
  const set = <K extends keyof DashFilters>(k: K, v: DashFilters[K]) => setDraft({ ...draft, [k]: v });
  const fieldSx = { bgcolor: "#fff", borderRadius: "8px", minWidth: 145, flex: "1 1 145px", "& .MuiOutlinedInput-notchedOutline": { borderColor: BLUE_BD }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: BLUE }, "& .MuiOutlinedInput-root:focus .MuiOutlinedInput-notchedOutline": { borderColor: BLUE, borderWidth: 1 } };
  const adorn = (icon: string) => ({ input: { startAdornment: <InputAdornment position="start"><Box sx={{ color: BLUE, display: "grid" }}><Icon name={icon} size={15} /></Box></InputAdornment> } });
  const sel = (label: string, icon: string, k: keyof DashFilters, opts: [string, string][]) => (
    <TextField fullWidth={false} select size="small" label={label} value={draft[k]} onChange={(e) => set(k, e.target.value as never)} sx={fieldSx} slotProps={adorn(icon)}>
      <MenuItem value="">All</MenuItem>
      {opts.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
    </TextField>
  );
  // Editing a date by hand turns the range into a custom one.
  const date = (label: string, k: "from" | "to") => (
    <TextField fullWidth={false} size="small" type="date" label={label} value={draft[k]} onChange={(e) => { setRange("custom"); set(k, e.target.value); }} sx={fieldSx} slotProps={{ inputLabel: { shrink: true }, ...adorn("FiCalendar") }} />
  );
  const pickRange = (r: RangeKey) => {
    setRange(r);
    if (r !== "custom") setDraft({ ...draft, from: rangeFrom(r), to: "" });
  };
  return (
    <Paper variant="outlined" component="form" onSubmit={(e) => { e.preventDefault(); onApply(); }} sx={{ px: 1, py: 0.75, background: `linear-gradient(90deg, #FFFFFF 0%, ${BLUE_LT} 100%)`, borderColor: BLUE_BD, borderRadius: "0.9rem", boxShadow: "0 1px 3px rgba(16,37,77,0.05)" }}>
      <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: { xs: "wrap", lg: "nowrap" }, alignItems: "center", "& .MuiTextField-root": { minWidth: { lg: 0 } }, "& .MuiButton-root": { flexShrink: 0 } }}>
        <TextField fullWidth={false} select size="small" label="Time range" value={range} onChange={(e) => pickRange(e.target.value as RangeKey)} sx={fieldSx} slotProps={adorn("FiClock")}>
          {RANGES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        {date("From", "from")}
        {range === "custom" && date("To", "to")}
        {sel("Doctor", "FiUser", "doctorId", doctors)}
        {/* {sel("Specialty", "FiAward", "specialty", specialties.map((s) => [s, s]))} */}
        {sel("Event type", "FiLayers", "kind", (Object.keys(EV_KIND) as EvKind[]).map((k) => [k, EV_KIND[k].label]))}
        {sel("Diagnosis", "FiSearch", "diagnosis", diagnoses.map((d) => [d, d]))}
        {/* {sel("Status", "FiCheckCircle", "status", statuses.map((s) => [s, s]))} */}
        <Button type="submit" variant="contained" size="small" disableElevation startIcon={<Icon name="FiFilter" />} sx={{ height: 40, px: 2, bgcolor: BLUE, "&:hover": { bgcolor: BLUE_DK }, textTransform: "none", fontWeight: 700 }}>Apply filter</Button>
        <Button type="button" size="small" variant="outlined" onClick={onReset} sx={{ height: 40, borderColor: BLUE_BD, textTransform: "none", fontWeight: 600 }}>Reset</Button>
      </Stack>
    </Paper>
  );
}

// ── Doctor comparison timeline: doctor columns × clinical-event rows ────────
const ROW_LABEL_W = 200;
const COL_MIN_W = 224;
const GRID_GAP = 6;
const CELL_MIN_H = 66;

/** Event date/time as a comparable number; an undated record is always oldest. */
const recordTime = (date: string | null | undefined) => {
  if (!date) return Number.NEGATIVE_INFINITY;
  const t = Date.parse(date);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/**
 * The one record the timeline shows for a (doctor × event category) cell.
 * Newest actual event date/time wins; a missing date never beats a dated
 * record. Grouping itself happens by doctor key + row before this is called.
 */
function latestOf<T extends { date: string | null }>(items: T[]): T | null {
  let best: T | null = null;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const time = recordTime(item.date);
    if (!best) { best = item; bestTime = time; continue; }
    if (time > bestTime) { best = item; bestTime = time; }
  }
  return best;
}

function DoctorColumnHeader({ d }: { d: CompDoctor }) {
  const t = COMP_TONES[d.tone];
  const white = { fg: t.fg, bg: "#FFFFFF", line: t.border };
  return (
    <Box sx={{ p: 0.75, borderRadius: "0.9rem", bgcolor: t.bg, border: 1, borderColor: t.border, minWidth: 0, minHeight: 78, boxSizing: "border-box" }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        <DocAvatar name={d.name} photoUrl={d.photoUrl} size={34} colors={{ bg: "#FFFFFF", fg: t.fg }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: t.fg, lineHeight: 1.25 }} noWrap>{d.name}</Typography>
          <Typography sx={{ fontSize: 10.5, color: t.fg, opacity: 0.85, lineHeight: 1.25 }} noWrap title={d.specialties.join(", ")}>
            {d.specialties.join(", ") || "Specialty not recorded"}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: "wrap", mt: 0.25, alignItems: "center", "& > span": { mb: 0 } }}>
        {d.clinic && <Tag tone={white} icon="FiMapPin">{d.clinic}</Tag>}
        <Tag tone={white} icon="FiClipboard">{d.eventCount} record{d.eventCount === 1 ? "" : "s"}</Tag>
      </Stack>
    </Box>
  );
}

/** One real record inside a (event row × doctor column) cell — the doctor's own, clickable. */
function RecordPill({ rec, tone, onOpen }: { rec: CompRecord; tone: CompTone; onOpen: (r: CompRecord) => void }) {
  const row = COMP_ROWS.find((r) => r.key === rec.row);
  return (
    <Box
      role="button" tabIndex={0} aria-label={`${row?.label ?? "Record"}: ${rec.title}`}
      onClick={() => onOpen(rec)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(rec); } }}
      sx={{ px: 0.75, py: 0.5, borderRadius: "0.7rem", bgcolor: "#fff", border: 1, borderColor: "#E4ECF7", borderLeft: `4px solid ${tone.border}`, cursor: "pointer", transition: "box-shadow 150ms, border-color 150ms", "&:hover, &:focus-visible": { boxShadow: "0 4px 12px rgba(7,86,181,0.13)", borderColor: tone.border, outline: "none" } }}
    >
      {/* Line 1: date + status. Line 2: title + supporting detail (wraps, never truncated). */}
      <Stack direction="row" useFlexGap sx={{ gap: 0.5, alignItems: "center", flexWrap: "wrap", mb: 0.25, "& > span": { m: 0 } }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: BLUE_DK }}>{rec.date ? dayLabel(rec.date, { year: "2-digit" }) : "Date not recorded"}</Typography>
        {rec.status && <Tag tone={{ fg: statusTone(rec.status).fg, bg: statusTone(rec.status).bg, line: statusTone(rec.status).line }}>{rec.status}</Tag>}
      </Stack>
      <Typography component="div" sx={{ fontSize: 12, lineHeight: 1.3, overflowWrap: "anywhere" }}>
        <Box component="span" sx={{ fontWeight: 700 }}>{rec.title}</Box>
        {rec.detail && <Box component="span" sx={{ color: "text.secondary", fontSize: 11 }}>{` · ${rec.detail}`}</Box>}
      </Typography>
    </Box>
  );
}

function ComparisonTable({ comp, filtered, onOpen }: { comp: Comparison; filtered: boolean; onOpen: (r: CompRecord) => void }) {
  const { doctors, records } = comp;
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Width of the comparison area, so doctor columns can be sized to show at
  // most three at once — any further doctors are reached by scrolling.
  const [wrapWidth, setWrapWidth] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") {
      setWrapWidth(el.getBoundingClientRect().width);
      return;
    }
    const ro = new ResizeObserver((entries) => { setWrapWidth(entries[0]?.contentRect.width ?? 0); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Display-only grouping: one latest record per doctor and event category.
  // The grouped source records are untouched, so summaries, insights and the
  // detailed record/history sections keep showing every record as before.
  const latestByCell = useMemo(() => {
    const groups = new Map<string, CompRecord[]>();
    for (const r of records) {
      const k = `${r.doctorKey}\u0000${r.row}`;
      const list = groups.get(k);
      if (list) list.push(r);
      else groups.set(k, [r]);
    }
    const latest = new Map<string, CompRecord>();
    for (const [k, list] of groups) {
      const rec = latestOf(list);
      if (rec) latest.set(k, rec);
    }
    return latest;
  }, [records]);

  if (doctors.length === 0) return <Muted>{filtered ? "No records match these filters." : "No clinical records available."}</Muted>;

  const cellKey = (doctorKey: string, row: CompRowKey) => `${doctorKey}\u0000${row}`;
  // More than three doctors: fixed column width that fits three columns in
  // the comparison area (never below the readability floor); the rest scroll
  // in from the right while the event-label column stays pinned left.
  // Three or fewer: the columns share the available width.
  const capped = doctors.length > 3;
  const colW = capped && wrapWidth > 0 ? Math.max(COL_MIN_W, Math.floor((wrapWidth - ROW_LABEL_W - 3 * GRID_GAP) / 3)) : COL_MIN_W;
  const track = capped ? `${colW}px` : `minmax(${COL_MIN_W}px, 1fr)`;
  const gridTemplate = `${ROW_LABEL_W}px repeat(${doctors.length}, ${track})`;
  const gridMinWidth = ROW_LABEL_W + doctors.length * ((capped ? colW : COL_MIN_W) + GRID_GAP);
  const syncHeader = () => { if (bodyRef.current && headerRef.current) headerRef.current.scrollLeft = bodyRef.current.scrollLeft; };
  const syncBody = () => { if (bodyRef.current && headerRef.current) bodyRef.current.scrollLeft = headerRef.current.scrollLeft; };

  return (
    <Box ref={wrapRef}>
      {/* Sticks under the fixed dashboard app bar while the event rows scroll. */}
      <Box sx={{ position: "sticky", top: { xs: 56, sm: 64 }, zIndex: (t) => t.zIndex.appBar - 1, bgcolor: "background.paper", pb: 0.5 }}>
        <Box ref={headerRef} onScroll={syncBody} sx={{ overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: gridTemplate, gap: `${GRID_GAP}px`, minWidth: gridMinWidth }}>
            {/* sticky top-left corner keeps the doctor headers readable while scrolling */}
            <Box aria-hidden sx={{ position: "sticky", left: 0, zIndex: 4, bgcolor: "background.paper", boxShadow: `8px 0 0 #FFFFFF, 10px 0 12px rgba(18,33,58,0.06)` }} />
            {doctors.map((d) => <DoctorColumnHeader key={d.key} d={d} />)}
          </Box>
        </Box>
      </Box>
      <Box ref={bodyRef} onScroll={syncHeader} sx={{ overflowX: "auto", pb: 0.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: gridTemplate, gap: `${GRID_GAP}px`, minWidth: gridMinWidth }}>
          {COMP_ROWS.map((row, ri) => {
            const rowBg = ri % 2 ? "#F7FAFD" : "#FFFFFF";
            const rowCount = records.filter((r) => r.row === row.key).length;
            return (
              <Fragment key={row.key}>
                <Box sx={{ position: "sticky", left: 0, zIndex: 3, bgcolor: rowBg, py: 1, pr: 1, minHeight: CELL_MIN_H, display: "flex", alignItems: "center", gap: 0.75, boxShadow: `8px 0 0 ${rowBg}, 10px 0 12px rgba(18,33,58,0.05)` }}>
                  <Box sx={{ width: 26, height: 26, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: row.bg, color: row.color, flexShrink: 0 }}><Icon name={row.icon} size={13} /></Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 12, color: row.color, lineHeight: 1.25 }}>{row.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                      {rowCount > 0 ? `${rowCount} record${rowCount === 1 ? "" : "s"}` : "Not recorded"}
                    </Typography>
                  </Box>
                </Box>
                {doctors.map((d) => {
                  const rec = latestByCell.get(cellKey(d.key, row.key));
                  const tone = COMP_TONES[d.tone];
                  return (
                    // Grid items stretch, so every cell of a row is as tall as the row's tallest cell.
                    <Box key={d.key} sx={{ bgcolor: rowBg, borderRadius: "0.9rem", border: 1, borderColor: BLUE_BD, p: 0.5, minWidth: 0, minHeight: CELL_MIN_H, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      {rec ? (
                        <RecordPill key={rec.key} rec={rec} tone={tone} onOpen={onOpen} />
                      ) : (
                        <Typography sx={{ color: "text.disabled", fontSize: 12, px: 0.5, textAlign: "center" }}><Dash /></Typography>
                      )}
                    </Box>
                  );
                })}
              </Fragment>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

// ── Comparison summary (right side) ──────────────────────────────────────────
function ComparisonSummary({ comp }: { comp: Comparison }) {
  const s = comp.summary;
  const rows: { label: string; value: string; icon: string; tone: { fg: string; bg: string } }[] = [
    { label: "Doctors Involved", value: String(s.doctors), icon: "FiUsers", tone: { fg: BLUE_DK, bg: BLUE_LT } },
    { label: "Diagnoses Recorded", value: String(s.diagnoses), icon: "FiSearch", tone: { fg: BLUE_DK, bg: BLUE_LT } },
    { label: "Consultations", value: String(s.consultations), icon: "FiUser", tone: { fg: BLUE_DK, bg: BLUE_LT } },
    { label: "Medical Reports", value: String(s.reports), icon: "FiFileText", tone: { fg: BLUE_DK, bg: BLUE_LT } },
    { label: "Matching Diagnoses", value: String(s.matching.count), icon: "FiCheckCircle", tone: { fg: "#116149", bg: "#E2F5EC" } },
    { label: "Separate Diagnoses", value: String(s.separate), icon: "FiColumns", tone: { fg: BLUE_DK, bg: BLUE_LT } },
    { label: "Conflicting Diagnoses", value: "Not Assessed", icon: "FiHelpCircle", tone: { fg: "#9A5B0D", bg: "#FFF0DC" } },
    { label: "Reconciliation", value: "Not Recorded", icon: "FiGitMerge", tone: { fg: "#344054", bg: "#F3F4F6" } },
  ];
  return (
    <Stack spacing={0.75}>
      {rows.map((r) => (
        <Stack key={r.label} direction="row" spacing={1} sx={{ alignItems: "center", px: 1, minHeight: 38, borderRadius: "0.9rem", border: 1, borderColor: BLUE_BD, bgcolor: "#fff" }}>
          <Box sx={{ width: 24, height: 24, borderRadius: "8px", display: "grid", placeItems: "center", bgcolor: r.tone.bg, color: r.tone.fg, flexShrink: 0 }}><Icon name={r.icon} size={13} /></Box>
          <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: NAVY, minWidth: 0 }} noWrap>{r.label}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: r.tone.fg, whiteSpace: "nowrap" }}>{r.value}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

// ── Key insights (only when the records support them) ────────────────────────
function KeyInsightsPanel({ comp }: { comp: Comparison }) {
  if (comp.insights.length === 0) return <Muted>No comparison insights from the records shown yet.</Muted>;
  return (
    <Stack spacing={1}>
      {comp.insights.map((i) => (
        <Stack key={i.key} direction="row" spacing={1} sx={{ alignItems: "flex-start", p: 1.25, borderRadius: 2.5, bgcolor: BLUE_LT, border: 1, borderColor: BLUE_BD }}>
          <Box sx={{ width: 24, height: 24, borderRadius: 1.25, display: "grid", placeItems: "center", bgcolor: "#fff", color: i.color, flexShrink: 0 }}><Icon name={i.icon} size={12} /></Box>
          <Typography variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.45, overflowWrap: "anywhere" }}>{i.text}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

// ── Diagnosis details by doctor (cards open the existing DiagnosisDetail) ───
function DiagnosisCards({ comp, onView }: { comp: Comparison; onView: (dxKey: string) => void }) {
  const groups = comp.doctors
    .map((d) => ({ d, dx: comp.dxRows.filter((x) => x.doctorKey === d.key) }))
    .filter((g) => g.dx.length > 0);
  if (groups.length === 0) return <Muted>No diagnoses recorded yet.</Muted>;
  return (
    <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2, minmax(0,1fr))", lg: "repeat(3, minmax(0,1fr))", xl: "repeat(4, minmax(0,1fr))" } }}>
      {groups.map(({ d, dx }) => {
        const t = COMP_TONES[d.tone];
        const white = { fg: t.fg, bg: "#FFFFFF", line: t.border };
        return (
          <Box key={d.key} sx={{ p: 1.25, borderRadius: "12px", bgcolor: t.bg, border: 1, borderColor: t.border, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1 }}>
              <DocAvatar name={d.name} photoUrl={d.photoUrl} size={32} colors={{ bg: "#FFFFFF", fg: t.fg }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: t.fg }} noWrap>{d.name}</Typography>
                <Typography sx={{ fontSize: 11, color: t.fg, opacity: 0.85 }} noWrap>{d.specialties.join(", ") || d.clinic || "Diagnoses as recorded"}</Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Tag tone={white}>{dx.length} diagnosi{dx.length === 1 ? "s" : "es"}</Tag>
            </Stack>
            <Stack spacing={0.75}>
              {dx.map((x) => {
                const retired = x.entry?.status === "entered_in_error";
                return (
                  <Box key={x.key} sx={{ p: 1, borderRadius: "10px", bgcolor: "#FFFFFF", border: 1, borderColor: "#E4ECF7", borderLeft: `4px solid ${t.border}`, minWidth: 0 }}>
                    <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, overflowWrap: "anywhere" }}>{x.name}</Typography>
                      <Tag tone={dxTone(x.type)}>{x.type === "from prescription" ? "From Rx" : x.type}</Tag>
                      {x.entry && <Tag tone={retired ? TONE.rose : TONE.green}>{retired ? "Entered in error" : "Active"}</Tag>}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
                      {[dayLabel(x.date), x.code ? `${x.codeSystem ?? "ICD"} ${x.code}` : null].filter(Boolean).join(" · ")}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => onView(x.key)} startIcon={<Icon name="FiEye" />} sx={{ mt: 0.5, borderRadius: "8px", textTransform: "none", fontWeight: 600 }}>
                      View details
                    </Button>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Right-side detail drawer ────────────────────────────────────────────────
function Block({ title, icon, tone, children }: { title: string; icon: string; tone: Tone; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#EEE9FB" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Box sx={{ width: 26, height: 26, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: tone.bg, color: tone.line }}><Icon name={icon} size={14} /></Box>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: tone.fg }}>{title}</Typography>
      </Stack>
      <Stack spacing={0.75}>{children}</Stack>
    </Paper>
  );
}

function VisitDrawer({ sel, h, onClose, onView }: { sel: { row?: DashRow; ev?: DashEvent } | null; h: MedicalHistory; onClose: () => void; onView: (d: PatientDocument) => void }) {
  const row = sel?.row;
  const ev = sel?.ev;
  const c = row?.consultation;
  const rxs = row?.bookingId ? signedRx(h).filter((r) => r.bookingId === row.bookingId) : [];
  const doc = row?.doc ?? ev?.doc;
  const today = istToday();
  const doctor = row?.doctor ?? ev?.doctor ?? null;
  const t = row ? rowTone(row) : TONE.purple;
  const status = row?.status ?? ev?.status ?? null;
  const notes = (c?.consultationNotes ?? []).filter((n) => n.complaints || n.onExamination);
  const dxNotes = (c?.consultationNotes ?? []).filter((n) => n.diagnosis);
  return (
    <Drawer anchor="right" open={Boolean(sel)} onClose={onClose} slotProps={{ backdrop: { sx: { bgcolor: "rgba(31,20,64,0.35)" } }, paper: { sx: { width: { xs: "100%", sm: 480 }, bgcolor: "#FAF8FF", borderTopLeftRadius: { sm: 20 }, borderBottomLeftRadius: { sm: 20 } } } }}>
      {sel && (
        <>
          <Box sx={{ p: 2, bgcolor: t.bg, borderBottom: 1, borderColor: "#E4DAFB" }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <DocAvatar name={doctor?.name} photoUrl={doctor?.photoUrl} size={48} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800, color: t.fg, lineHeight: 1.25 }} noWrap>{row?.kind === "report" ? (doc ? docName(doc) : "Report") : doctor?.name ?? "Doctor not recorded"}</Typography>
                <Typography variant="body2" sx={{ color: t.fg, opacity: 0.85 }} noWrap>{[(row?.specialties ?? ev?.specialties ?? []).join(", "), dayLabel(row?.date ?? ev?.date ?? null)].filter(Boolean).join(" · ")}</Typography>
              </Box>
              <IconButton onClick={onClose} aria-label="Close details" sx={{ bgcolor: "#fff", "&:hover": { bgcolor: "#fff" } }}><Icon name="FiX" /></IconButton>
            </Stack>
            <Stack direction="row" useFlexGap sx={{ gap: 0.5, mt: 1.25, flexWrap: "wrap" }}>
              {status && <Tag tone={statusTone(status)}>{status}</Tag>}
              {c && <Tag tone={TONE.purple} icon={c.visit.appointmentType === "video" ? "FiVideo" : "FiMapPin"}>{c.visit.appointmentType === "video" ? "Video consultation" : "In clinic"}</Tag>}
              {row?.bookingId && <Tag tone={TONE.gray}>Consultation #{row.bookingId}</Tag>}
              {(row?.clinic ?? ev?.clinic) && <Tag tone={TONE.teal} icon="FiMapPin">{row?.clinic ?? ev?.clinic}</Tag>}
            </Stack>
          </Box>

          <Stack spacing={1.25} sx={{ p: 2, overflowY: "auto" }}>
            {row && row.diagnoses.length > 0 && (
              <Block title="Diagnosis" icon="FiSearch" tone={TONE.orange}>
                {row.diagnoses.map((d, i) => (
                  <Box key={i}>
                    <Tag tone={dxTone(d.type)}>{d.name}</Tag>
                    <Typography variant="caption" color="text.secondary" component="div">{diagnosisTypeLabel(d.type)}{d.code ? ` · ICD ${d.code}` : ""}</Typography>
                  </Box>
                ))}
                {dxNotes.map((n) => <Typography key={n.id} variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{n.diagnosis}</Typography>)}
              </Block>
            )}
            {notes.length > 0 && (
              <Block title="Clinical notes" icon="FiEdit3" tone={TONE.purple}>
                {notes.map((n) => <Typography key={n.id} variant="body2" sx={{ overflowWrap: "anywhere" }}>{[n.complaints, n.onExamination].filter(Boolean).join(" · ")}</Typography>)}
              </Block>
            )}
            {(doc || (row?.records.length ?? 0) > 0) && (
              <Block title="Medical records" icon="FiFileText" tone={TONE.blue}>
                {doc && (
                  <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: TONE.blue.bg }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#fff", color: TONE.blue.line }}><Icon name="FiFileText" size={20} /></Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }} noWrap>{docName(doc)}</Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {[documentKindLabel(doc), fileTypeLabel(doc), fileSize(doc.fileSize), doc.uploadedAt ? `uploaded ${dayLabel(doc.uploadedAt)}` : null].filter(Boolean).join(" · ")}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button size="small" variant="contained" onClick={() => onView(doc)} startIcon={<Icon name="FiEye" />}>Preview</Button>
                      <Button size="small" variant="outlined" onClick={() => void downloadDocument(doc, docName(doc))} startIcon={<Icon name="FiDownload" />}>Download</Button>
                    </Stack>
                  </Box>
                )}
                {!doc && row?.records.map((x, i) => <Typography key={i} variant="body2">Investigation advised: <b>{x}</b></Typography>)}
              </Block>
            )}
            {rxs.length > 0 && (
              <Block title="Medicines" icon="FiPackage" tone={TONE.green}>
                {rxs.map((r) => (
                  <Box key={r.id}>
                    <Typography variant="caption" color="text.secondary">{r.rxNumber ?? "Prescription"} · prescribed by {r.doctor?.name ?? "Doctor"}</Typography>
                    {r.items.length ? <MedicinesTable items={r.items} prescribedBy={r.doctor?.name ?? null} /> : <Muted>Medication not needed.</Muted>}
                    {r.items.some((i) => courseOf(r, i, today).status === "active") && <Tag tone={TONE.green}>Within prescribed duration</Tag>}
                  </Box>
                ))}
              </Block>
            )}
            {row?.kind === "visit" && (row.treatment || c?.followUp) && (
              <Block title="Treatment and follow-up" icon="FiActivity" tone={TONE.teal}>
                {row.treatment && <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{row.treatment}</Typography>}
                {c?.followUp?.comments && <Typography variant="caption" color="text.secondary">{c.followUp.comments}</Typography>}
              </Block>
            )}
            {!row && ev?.detail && (
              <Block title={EV_KIND[ev.kind].label} icon={EV_KIND[ev.kind].icon} tone={TONE.purple}>
                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{ev.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{ev.detail}</Typography>
              </Block>
            )}
            {row?.kind === "visit" && <Typography variant="caption" color="text.secondary">Parts of another doctor&apos;s visit that the patient has not shared are not shown.</Typography>}
          </Stack>
        </>
      )}
    </Drawer>
  );
}

// ── Analytics ───────────────────────────────────────────────────────────────
function Card({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: string | null }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, minWidth: 0, borderRadius: "14px", borderColor: BLUE_BD, boxShadow: "0 1px 3px rgba(16,37,77,0.05)" }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, color: NAVY }}>{title}</Typography>
      {empty ? <Muted>{empty}</Muted> : <Box sx={{ height: 210 }}>{children}</Box>}
    </Paper>
  );
}
const grid = { display: "grid", gap: 1.25, gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2, minmax(0,1fr))", lg: "repeat(3, minmax(0,1fr))", xl: "repeat(4, minmax(0,1fr))" } } as const;

function Bars({ data, color = "#7543C6", horizontal }: { data: { name: string; value: number }[]; color?: string; horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 8 : -20, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        {horizontal ? <><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /></> : <><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /></>}
        <Tooltip />
        <Bar dataKey="value" name="Count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
function Trend({ data, color = "#7543C6" }: { data: { label: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="label" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip />
        <Line type="monotone" dataKey="value" name="Count" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
const need = (data: unknown[], min = 1, msg = "Not enough records to chart yet.") => (data.length >= min ? null : msg);

const VITAL_CHARTS: { title: string; unit: string; series: { key: VitalKey; name: string; color: string }[] }[] = [
  { title: "Blood pressure", unit: "mmHg", series: [{ key: "bpSystolic", name: "Systolic", color: "#7543C6" }, { key: "bpDiastolic", name: "Diastolic", color: "#138477" }] },
  { title: "Heart rate / pulse", unit: "bpm", series: [{ key: "heartRateBpm", name: "Heart rate", color: "#D97706" }, { key: "pulseRateBpm", name: "Pulse", color: "#16834A" }] },
  { title: "SpO₂", unit: "%", series: [{ key: "spo2Percent", name: "SpO₂", color: "#138477" }] },
  { title: "Temperature", unit: "°F", series: [{ key: "temperatureF", name: "Temperature", color: "#D97706" }] },
  { title: "Weight", unit: "kg", series: [{ key: "weightKg", name: "Weight", color: "#7543C6" }] },
  { title: "BMI", unit: "kg/m²", series: [{ key: "bmi", name: "BMI", color: "#16834A" }] },
];

function Analytics({ h, docs, events, rows, vitals }: { h: MedicalHistory; docs: PatientDocument[]; events: DashEvent[]; rows: DashRow[]; vitals: VitalEntry[] }) {
  const today = istToday();
  const visits = rows.filter((r) => r.kind === "visit");
  const rx = signedRx(h);
  const dxEvents = events.filter((e) => e.kind === "diagnosis");
  const dxTypes = countBy(dxEvents, (e) => (e.detail ?? "").includes("provisional") ? "Provisional" : (e.detail ?? "").includes("final") ? "Confirmed" : (e.detail ?? "").includes("differential") ? "Differential" : "Type not recorded");
  const medRows = rx.flatMap((r) => r.items.map((i) => ({ r, i, st: courseOf(r, i, today).status })));
  const currentMeds = new Set(medRows.filter((m) => m.st === "active").map((m) => m.i.medicineName.toLowerCase())).size;
  const allMeds = new Set(medRows.map((m) => m.i.medicineName.toLowerCase())).size;
  const reportsMonth = byMonth(docs, (d) => d.recordDate);
  const fups = events.filter((e) => e.kind === "follow_up");
  const treat = events.filter((e) => e.kind === "treatment");
  const vSorted = [...vitals].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
  const chronic = new Set(h.longTermConditions.map((c) => c.title).filter(Boolean)).size;

  return (
    <Stack spacing={2}>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>Clinical analytics</Typography>
      <StatRow tone="purple" stats={[
        { label: "Consultations", value: String(visits.length) },
        { label: "Diagnoses recorded", value: String(dxEvents.length) },
        { label: "Reports", value: String(docs.length) },
        { label: "Prescriptions", value: String(rx.length) },
        { label: "Chronic conditions", value: String(chronic) },
      ]} />

      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>Consultations</Typography>
      <Box sx={grid}>
        <Card title="By doctor" empty={need(visits)}><Bars horizontal data={countBy(visits, (r) => r.doctor?.name ?? "Not recorded")} /></Card>
        <Card title="By specialty" empty={need(visits.filter((r) => r.specialties.length))}><Bars data={countBy(visits.flatMap((r) => r.specialties.map((s) => ({ s }))), (x) => x.s)} color="#138477" /></Card>
        <Card title="Clinic vs video" empty={need(visits.filter((r) => r.consultation))}><Donut data={countBy(visits.filter((r) => r.consultation), (r) => r.consultation?.visit.appointmentType === "video" ? "Video" : "In clinic")} /></Card>
        <Card title="Monthly consultations" empty={need(byMonth(visits, (r) => r.date), 2)}><Trend data={byMonth(visits, (r) => r.date)} /></Card>
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>Diagnoses</Typography>
      <Box sx={grid}>
        <Card title="Provisional vs confirmed (as recorded)" empty={need(dxEvents)}><Donut data={dxTypes} /></Card>
        <Card title="Diagnoses over time" empty={need(byMonth(dxEvents, (e) => e.date), 2)}><Trend data={byMonth(dxEvents, (e) => e.date)} color="#D97706" /></Card>
        <Card title="Chronic / long-term conditions" empty={need(h.longTermConditions)}>
          <Stack spacing={0.5} sx={{ overflow: "auto", height: "100%" }}>{h.longTermConditions.map((c) => <Typography key={c.id} variant="body2">{c.title}{c.author?.name ? <Typography component="span" variant="caption" color="text.secondary"> · {c.author.name}</Typography> : null}</Typography>)}</Stack>
        </Card>
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>Reports and investigations</Typography>
      <Box sx={grid}>
        <Card title="Reports by type" empty={need(docs)}><Bars data={countBy(docs, reportGroup)} color="#138477" horizontal /></Card>
        <Card title="Reports by test month" empty={need(reportsMonth, 2)}><Trend data={reportsMonth} color="#138477" /></Card>
        <Card title="Tests advised" empty={need(h.investigations)}><Bars horizontal data={countBy(h.investigations, (i) => i.title)} color="#138477" /></Card>
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>Medicines and prescriptions</Typography>
      <Box sx={grid}>
        <Card title={`Current (${currentMeds}) vs historical (${Math.max(allMeds - currentMeds, 0)}) medicines`} empty={need(medRows)}>
          <Donut data={[{ name: "Within prescribed duration", value: currentMeds }, { name: "Course ended / no duration", value: Math.max(allMeds - currentMeds, 0) }].filter((d) => d.value > 0)} />
        </Card>
        <Card title="Medicines by prescribing doctor" empty={need(medRows)}><Bars horizontal data={countBy(medRows, (m) => m.r.doctor?.name ?? "Not recorded")} color="#16834A" /></Card>
        <Card title="Prescriptions per month" empty={need(byMonth(rx, (r) => r.visitDate ?? r.finalizedAt?.slice(0, 10) ?? null), 2)}><Trend data={byMonth(rx, (r) => r.visitDate ?? r.finalizedAt?.slice(0, 10) ?? null)} color="#16834A" /></Card>
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>Vitals</Typography>
      <Box sx={grid}>
        {VITAL_CHARTS.map((vc) => {
          const data = vSorted.map((e) => ({ label: dayLabel(e.recordedOn, { year: "2-digit" }), ...Object.fromEntries(vc.series.map((s) => [s.key, e.values[s.key] == null || e.values[s.key] === "" ? null : Number(e.values[s.key])])) }));
          const points = Math.max(...vc.series.map((s) => data.filter((d) => (d as Record<string, unknown>)[s.key] != null).length));
          return (
            <Card key={vc.title} title={`${vc.title} (${vc.unit})`} empty={points >= 2 ? null : points === 1 ? "Only one reading recorded — no trend to show." : "No readings recorded."}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ left: -15, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} domain={["auto", "auto"]} unit="" /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                  {vc.series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={`${s.name} (${vc.unit})`} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          );
        })}
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>Treatment and follow-up</Typography>
      <Box sx={grid}>
        <Card title="Follow-up status" empty={need(fups)}><Bars data={countBy(fups, (e) => e.detail?.split(" · ").pop() ?? "Scheduled")} color="#D97706" /></Card>
        <Card title="Treatment plans over time" empty={need(byMonth(treat, (e) => e.date), 2)}><Trend data={byMonth(treat, (e) => e.date)} color="#16834A" /></Card>
        <Card title="Latest follow-ups" empty={need(fups)}>
          <Stack spacing={0.5} sx={{ overflow: "auto", height: "100%" }}>{fups.slice(0, 8).map((f) => <Typography key={f.id} variant="body2">{dayLabel(f.date)} · {f.doctor?.name ?? "Doctor"}</Typography>)}</Stack>
        </Card>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Counts come only from the records you are permitted to see. Months without records are not plotted, and a trend line needs at least two readings.
      </Typography>
    </Stack>
  );
}
