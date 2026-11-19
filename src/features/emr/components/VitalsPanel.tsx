"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { CARD_TONES } from "@/theme/palette";
import { getErrorMessage } from "@/utils/error";
import { useAddVitals, usePatientVitals } from "../hooks";
import { OthersHiddenLine } from "./RecordAccess";
import { dayLabel, instantLabel, VITAL_CARD_TONE, VITAL_TONE } from "../format";
import type { NewVitals, VitalEntry, VitalField, VitalKey, VitalsMatrix } from "@/types/emr";

/** The table columns, in the reference screenshot's order (BMI/WHR derived). */
const LIST_KEYS: VitalKey[] = [
  "weightKg", "waistCm", "temperatureF", "spo2Percent", "respiratoryRate", "pulseRateBpm", "heartRateBpm",
  "hipCm", "heightCm", "headCircumferenceCm", "bpSystolic", "bpDiastolic", "bmi", "waistHipRatio",
];

/**
 * Charts: one per measurement; BP draws systolic + diastolic together.
 * Desktop order (4 per row): BP · Weight · BMI · Heart rate / Pulse · SpO₂ ·
 * Respiratory rate · Temperature / Height · Waist · Hip · Waist-hip ratio /
 * Head circumference — every measurement the list view shows.
 */
const CHARTS: { id: string; title: string; unit: string; keys: VitalKey[] }[] = [
  { id: "bp", title: "Blood pressure", unit: "mmHg", keys: ["bpSystolic", "bpDiastolic"] },
  { id: "weight", title: "Weight", unit: "kg", keys: ["weightKg"] },
  { id: "bmi", title: "BMI", unit: "kg/m²", keys: ["bmi"] },
  { id: "hr", title: "Heart rate", unit: "bpm", keys: ["heartRateBpm"] },
  { id: "pulse", title: "Pulse rate", unit: "bpm", keys: ["pulseRateBpm"] },
  { id: "spo2", title: "SpO₂", unit: "%", keys: ["spo2Percent"] },
  { id: "rr", title: "Respiratory rate", unit: "/min", keys: ["respiratoryRate"] },
  { id: "temp", title: "Temperature", unit: "°F", keys: ["temperatureF"] },
  { id: "height", title: "Height", unit: "cm", keys: ["heightCm"] },
  { id: "waist", title: "Waist", unit: "cm", keys: ["waistCm"] },
  { id: "hip", title: "Hip", unit: "cm", keys: ["hipCm"] },
  { id: "whr", title: "Waist-hip ratio", unit: "", keys: ["waistHipRatio"] },
  { id: "head", title: "Head circumference", unit: "cm", keys: ["headCircumferenceCm"] },
];

const PAGE = 15;

/** The moment a reading was taken, for sorting/axes (older rows only have a date). */
const whenOf = (e: VitalEntry) => e.recordedAt ?? `${e.recordedOn}T00:00:00+05:30`;

export function VitalsPanel({
  patientId,
  bookingId,
  canRecord,
  addOpen,
  onAddOpenChange,
  readOnly = false,
}: {
  patientId: string;
  bookingId: string | null;
  canRecord: boolean;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
  /** Review pages (My Patients): no Add vitals button at all. */
  readOnly?: boolean;
}) {
  const [view, setView] = useState<"list" | "graph">("list");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [localOpen, setLocalOpen] = useState(false);
  const open = addOpen ?? localOpen;
  const setOpen = onAddOpenChange ?? setLocalOpen;
  const vitals = usePatientVitals(patientId, { from: from || undefined, to: to || undefined });

  return (
    <Stack spacing={1}>
      <OthersHiddenLine category="vitals" />
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => v && setView(v)} aria-label="Vitals view">
          <ToggleButton value="list">
            <Icon name="FiList" style={{ marginRight: 6 }} /> List view
          </ToggleButton>
          <ToggleButton value="graph">
            <Icon name="FiTrendingUp" style={{ marginRight: 6 }} /> Graph view
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} sx={{ width: 150 }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} sx={{ width: 150 }} slotProps={{ inputLabel: { shrink: true } }} />
        {(from || to) && (
          <Button size="small" onClick={() => { setFrom(""); setTo(""); }}>
            Clear dates
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {!readOnly && (
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon name="FiPlus" />}
          disabled={!canRecord || !bookingId}
          onClick={() => setOpen(true)}
        >
          Add vitals
        </Button>
        )}
      </Stack>

      {vitals.isError && <Alert severity="error">{getErrorMessage(vitals.error)}</Alert>}
      {vitals.data && (view === "list" ? <VitalsTable matrix={vitals.data} /> : <VitalsGraphs matrix={vitals.data} />)}
      {vitals.isLoading && <Typography variant="body2" color="text.secondary">Loading vitals…</Typography>}

      {open && bookingId && (
        <AddVitalsDialog patientId={patientId} bookingId={bookingId} onClose={() => setOpen(false)} />
      )}
    </Stack>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function VitalsTable({ matrix }: { matrix: VitalsMatrix }) {
  const [shown, setShown] = useState(PAGE);
  const fieldBy = useMemo(() => new Map(matrix.fields.map((f) => [f.key, f])), [matrix.fields]);
  const cols = LIST_KEYS.map((k) => fieldBy.get(k)).filter(Boolean) as VitalField[];
  const rows = matrix.entries; // newest first (server order)

  if (!rows.length) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No vitals recorded for this period.</Typography>;
  }

  return (
    <>
      {/* Every measurement column stays. Headers wrap (label over unit) so the
          columns are only as wide as their numbers; what still doesn't fit
          scrolls INSIDE this box with the date pinned, never the page. */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440, maxWidth: "100%", overflowX: "auto" }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            "& td, & th": { px: 0.75, py: 0.4, fontSize: 12.5 },
            "& td": { whiteSpace: "nowrap" },
            // Wrap only BETWEEN words ("Heart rate" over "bpm"), never inside one.
            "& th": { whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "normal", hyphens: "manual", lineHeight: 1.2, verticalAlign: "bottom", fontWeight: 700, minWidth: 52 },
            "& td:first-of-type, & th:first-of-type": { position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper", borderRight: 1, borderColor: "divider" },
            "& th:first-of-type": { zIndex: 3 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120, bgcolor: CARD_TONES.gray.bg, color: CARD_TONES.gray.heading }}>Date &amp; time</TableCell>
              {cols.map((f) => {
                const card = CARD_TONES[VITAL_CARD_TONE[f.key] ?? "gray"];
                return (
                  <TableCell key={f.key} align="right" sx={{ bgcolor: card.bg, borderBottomColor: card.border, color: card.heading }}>
                    {f.label}
                    {f.unit && <Box component="span" sx={{ display: "block", color: card.fg, fontWeight: 400, fontSize: 11 }}>{f.unit}</Box>}
                  </TableCell>
                );
              })}
              <TableCell sx={{ bgcolor: CARD_TONES.gray.bg, color: CARD_TONES.gray.heading }}>By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, shown).map((e, i) => {
              const older = rows[i + 1];
              return (
                <TableRow key={e.id} hover>
                  <TableCell>{e.recordedAt ? instantLabel(e.recordedAt) : dayLabel(e.recordedOn)}</TableCell>
                  {cols.map((f) => {
                    const v = e.values[f.key];
                    const st = e.statuses[f.key]?.status;
                    const tone = st ? VITAL_TONE[st] : null;
                    const prev = older?.values[f.key];
                    // A trend arrow only when BOTH this and the previous reading are numbers.
                    const trend = typeof v === "number" && typeof prev === "number" && v !== prev ? (v > prev ? "▲" : "▼") : "";
                    return (
                      <TableCell key={f.key} align="right" sx={{ color: tone && st !== "normal" ? `${tone}.main` : undefined, fontWeight: tone && st !== "normal" ? 700 : 400 }}>
                        {v ?? "—"}
                        {trend && (
                          <Box component="span" sx={{ ml: 0.5, fontSize: 10, color: "text.secondary" }} aria-label={trend === "▲" ? "up from previous" : "down from previous"}>
                            {trend}
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>{e.recordedBy?.name ?? (e.source === "patient" ? "Patient" : e.source)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min(shown, rows.length)} of {rows.length} readings · newest first · coloured values are outside the adult reference range
        </Typography>
        {shown < rows.length && (
          <Button size="small" onClick={() => setShown((n) => n + PAGE)}>
            View more
          </Button>
        )}
      </Stack>
    </>
  );
}

// ── Graph view ───────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000;
/** Plot height inside each compact card. */
const CHART_HEIGHT = 150;
type Point = { t: number } & Record<string, number | null>;

/** Y ticks short enough for a compact card yet still distinct: 98.45, 56.58, 0.935. */
const yTick = (v: number) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(Math.abs(v) < 10 ? 3 : 2))));

const istDate = (t: number, opts: Intl.DateTimeFormatOptions) =>
  new Date(t).toLocaleDateString("en-IN", { ...opts, timeZone: "Asia/Kolkata" });

/**
 * Tick labels that stay readable in a narrow card: day + month while the
 * readings span under ~10 months, month + year beyond that. Fixed locale and
 * time zone, so server and client agree.
 */
const tickFormatterFor = (spanMs: number) =>
  spanMs > 300 * DAY_MS
    ? (t: number) => istDate(t, { month: "short", year: "2-digit" })
    : (t: number) => istDate(t, { day: "2-digit", month: "short" });

/**
 * Every chart as a compact card: four per row on desktop, two on tablets, one
 * on phones. Only REAL readings are plotted — never interpolated or padded —
 * and a single reading is drawn as one dot, with no line implying a trend.
 */
function VitalsGraphs({ matrix }: { matrix: VitalsMatrix }) {
  const theme = useTheme();
  const colors = [theme.palette.primary.main, theme.palette.success.main];
  const fieldBy = useMemo(() => new Map(matrix.fields.map((f) => [f.key, f])), [matrix.fields]);
  // Oldest → newest for a time axis.
  const ordered = useMemo(() => [...matrix.entries].sort((a, b) => whenOf(a).localeCompare(whenOf(b))), [matrix.entries]);

  if (!ordered.length) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No vitals recorded for this period.</Typography>;
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
      }}
    >
      {CHARTS.map((c) => {
        const shown = ordered.filter((e) => c.keys.some((k) => typeof e.values[k] === "number"));
        // A reading saved with a date only has no real time — its tooltip shows the day alone.
        const dateOnly = new Set(shown.filter((e) => !e.recordedAt).map((e) => new Date(whenOf(e)).getTime()));
        const points: Point[] = shown.map((e) => ({
          t: new Date(whenOf(e)).getTime(),
          ...(Object.fromEntries(c.keys.map((k) => [k, typeof e.values[k] === "number" ? e.values[k] : null])) as Record<string, number | null>),
        }));
        const first = points[0];
        const last = points.at(-1);
        const normalField = fieldBy.get(c.keys[0]);
        const normal = normalField?.normal;
        const hasRange = Boolean(normal && normal.min != null && normal.max != null);
        const span = first && last ? last.t - first.t : 0;
        const single = points.length === 1;
        const latest = last ? c.keys.map((k) => last[k] ?? "—").join("/") : null;
        const range =
          !first || !last
            ? ""
            : single || istDate(first.t, { dateStyle: "medium" }) === istDate(last.t, { dateStyle: "medium" })
              ? istDate(first.t, { day: "2-digit", month: "short", year: "numeric" })
              : `${istDate(first.t, { day: "2-digit", month: "short", year: "2-digit" })} – ${istDate(last.t, { day: "2-digit", month: "short", year: "2-digit" })}`;
        const formatTick = tickFormatterFor(span);
        // One reading: a day either side so the dot sits mid-card with its own date as the only tick.
        const xDomain: [number | string, number | string] = single && first ? [first.t - DAY_MS, first.t + DAY_MS] : ["dataMin", "dataMax"];
        const xTicks = single && first ? [first.t] : undefined;
        const card = CARD_TONES[VITAL_CARD_TONE[c.keys[0]] ?? "gray"];
        return (
          <Paper
            key={c.id}
            variant="outlined"
            component="section"
            aria-label={`${c.title} chart`}
            sx={(t) => ({ p: 1.25, minWidth: 0, borderRadius: `${t.tokens.radius.xxl}px`, bgcolor: card.bg, borderColor: card.border, display: "flex", flexDirection: "column" })}
          >
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", minWidth: 0 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h3" sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, color: card.heading }} noWrap title={c.title}>
                  {c.title}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", lineHeight: 1.3, color: card.fg }} noWrap>
                  {points.length ? `${points.length} reading${single ? "" : "s"} · ${range}` : c.unit}
                </Typography>
              </Box>
              {latest && (
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography component="span" sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, display: "block", color: card.heading }}>{latest}</Typography>
                  <Typography component="span" variant="caption" sx={{ lineHeight: 1.2, color: card.fg }}>
                    {c.unit ? `${c.unit} · latest` : "latest"}
                  </Typography>
                </Box>
              )}
            </Stack>

            {points.length === 0 ? (
              <Box sx={{ height: CHART_HEIGHT, display: "grid", placeItems: "center" }}>
                <Typography variant="body2" sx={{ color: card.fg }}>No readings yet.</Typography>
              </Box>
            ) : (
              <Box sx={{ height: CHART_HEIGHT, mt: 0.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      scale="time"
                      domain={xDomain}
                      ticks={xTicks}
                      tickFormatter={formatTick}
                      minTickGap={18}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 10.5 }}
                      tickMargin={4}
                      stroke={theme.palette.text.secondary}
                    />
                    <YAxis tick={{ fontSize: 10.5 }} width={44} tickFormatter={yTick} stroke={theme.palette.text.secondary} domain={["auto", "auto"]} allowDecimals />
                    {hasRange && normal && (
                      <ReferenceArea y1={normal.min ?? undefined} y2={normal.max ?? undefined} fill={theme.palette.success.main} fillOpacity={0.08} ifOverflow="extendDomain" />
                    )}
                    <Tooltip
                      labelFormatter={(t) =>
                        dateOnly.has(Number(t))
                          ? istDate(Number(t), { day: "2-digit", month: "short", year: "numeric" })
                          : instantLabel(new Date(Number(t)).toISOString())
                      }
                      formatter={(v, name) => [`${v}${c.unit ? ` ${c.unit}` : ""}`, fieldBy.get(name as VitalKey)?.label ?? String(name)]}
                      contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, fontSize: 12 }}
                    />
                    {c.keys.length > 1 && (
                      <Legend
                        formatter={(k) => fieldBy.get(k as VitalKey)?.label ?? k}
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10.5, lineHeight: "14px" }}
                        verticalAlign="top"
                        height={16}
                      />
                    )}
                    {c.keys.map((k, i) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        stroke={colors[i % colors.length]}
                        strokeWidth={2}
                        dot={{ r: single ? 4 : 2.5 }}
                        activeDot={{ r: 4 }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Always one caption line, so every card in the grid is the same height. */}
            <Typography variant="caption" sx={{ display: "block", mt: 0.25, lineHeight: 1.3, color: card.fg }} noWrap>
              {points.length === 0
                ? " "
                : hasRange && normal
                  ? `Shaded: usual ${c.keys.length > 1 ? `${normalField?.label?.toLowerCase() ?? ""} ` : ""}range ${normal.display ?? `${normal.min}–${normal.max}`}`
                  : "No standard adult range"}
              {points.length > 0 && single ? " · one reading, no trend yet" : ""}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
}

// ── Add vitals ───────────────────────────────────────────────────────────────
const INPUTS: { key: keyof NewVitals; label: string; unit: string; step?: string; min: number; max: number }[] = [
  { key: "weightKg", label: "Weight", unit: "kg", step: "0.1", min: 0.5, max: 500 },
  { key: "heightCm", label: "Height", unit: "cm", step: "0.1", min: 20, max: 280 },
  { key: "waistCm", label: "Waist", unit: "cm", step: "0.1", min: 20, max: 300 },
  { key: "hipCm", label: "Hip", unit: "cm", step: "0.1", min: 20, max: 300 },
  { key: "temperatureF", label: "Temperature", unit: "°F", step: "0.1", min: 90, max: 110 },
  { key: "spo2Percent", label: "SpO₂", unit: "%", min: 50, max: 100 },
  { key: "respiratoryRate", label: "Respiratory rate", unit: "/min", min: 4, max: 80 },
  { key: "pulseRateBpm", label: "Pulse rate", unit: "bpm", min: 20, max: 300 },
  { key: "heartRateBpm", label: "Heart rate", unit: "bpm", min: 20, max: 300 },
  { key: "headCircumferenceCm", label: "Head circumference", unit: "cm", step: "0.1", min: 20, max: 80 },
  { key: "bpSystolic", label: "BP systolic", unit: "mmHg", min: 50, max: 300 },
  { key: "bpDiastolic", label: "BP diastolic", unit: "mmHg", min: 20, max: 200 },
];

const INTEGER_KEYS = new Set(["spo2Percent", "respiratoryRate", "pulseRateBpm", "heartRateBpm", "bpSystolic", "bpDiastolic"]);

function AddVitalsDialog({ patientId, bookingId, onClose }: { patientId: string; bookingId: string; onClose: () => void }) {
  const add = useAddVitals(patientId, bookingId);
  const [form, setForm] = useState<Record<string, string>>({});
  const [now, setNow] = useState(true);
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");

  const num = (k: string) => (form[k]?.trim() ? Number(form[k]) : null);
  const errors: Record<string, string> = {};
  for (const f of INPUTS) {
    const v = num(f.key);
    if (v == null) continue;
    if (!Number.isFinite(v)) errors[f.key] = "Not a number";
    else if (v < f.min || v > f.max) errors[f.key] = `${f.min}–${f.max}`;
    else if (INTEGER_KEYS.has(f.key) && !Number.isInteger(v)) errors[f.key] = "Whole number";
  }
  const sys = num("bpSystolic");
  const dia = num("bpDiastolic");
  if ((sys == null) !== (dia == null)) errors[sys == null ? "bpSystolic" : "bpDiastolic"] = "Enter both";
  if (sys != null && dia != null && dia >= sys) errors.bpDiastolic = "Must be below systolic";
  const anyValue = INPUTS.some((f) => num(f.key) != null);

  const h = num("heightCm");
  const w = num("weightKg");
  const bmi = h && w && !errors.heightCm && !errors.weightKg ? Math.round((w / (h / 100) ** 2) * 10) / 10 : null;
  const waist = num("waistCm");
  const hip = num("hipCm");
  const whr = waist && hip ? Math.round((waist / hip) * 100) / 100 : null;

  const save = () => {
    const body: NewVitals = { note: note.trim() || null };
    // Empty inputs are OMITTED — they stay empty, never saved as 0.
    for (const f of INPUTS) {
      const v = num(f.key);
      if (v != null) (body as Record<string, unknown>)[f.key] = v;
    }
    if (!now && at) body.recordedAt = new Date(at).toISOString();
    add.mutate(body, {
      onSuccess: () => {
        toast.success("Vitals saved");
        onClose();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add vitals</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" } }}>
          {INPUTS.map((f) => (
            <TextField key={f.key} size="small" label={f.label} type="number" value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} error={Boolean(errors[f.key])} helperText={errors[f.key] ?? " "} slotProps={{ htmlInput: { step: f.step ?? "1", min: f.min, max: f.max, inputMode: "decimal" }, input: { endAdornment: <InputAdornment position="end">{f.unit}</InputAdornment> } }} />
          ))}
        </Box>
        <Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
          <Typography variant="body2">
            BMI: <b>{bmi ?? "—"}</b> {bmi ? "kg/m²" : ""} <Typography component="span" variant="caption" color="text.secondary">(from height + weight)</Typography>
          </Typography>
          <Typography variant="body2">
            Waist-hip ratio: <b>{whr ?? "—"}</b>
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, mt: 1.5 }}>
          <FormControlLabel control={<Checkbox checked={now} onChange={(e) => setNow(e.target.checked)} />} label="Measured now" />
          {!now && (
            <TextField size="small" type="datetime-local" label="Measured at" value={at} onChange={(e) => setAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          )}
          <TextField size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 255 } }} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Leave a field empty if it wasn&apos;t measured. Each save adds a new reading — earlier readings are kept.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!anyValue || Object.keys(errors).length > 0 || (!now && !at) || add.isPending}>
          {add.isPending ? "Saving…" : "Save vitals"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
