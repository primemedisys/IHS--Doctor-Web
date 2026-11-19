"use client";

import { AccentTile } from "@/components/common/AccentTile";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FiAlertTriangle } from "react-icons/fi";
import { getInitials } from "@/utils/format";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { dayLabel, instantLabel, titleCase, VITAL_TONE } from "../format";
import type { EmrWorkspace, LatestVital, VitalKey, VitalStatus } from "@/types/emr";

/**
 * The latest-vitals summary, in the reference order and two rows: vital signs,
 * then body measurements. BP is ONE entry (the pair is judged together).
 * Every field always has its slot so the columns line up; "—" means never
 * measured — nothing is filled in.
 */
type SummaryField = { key: VitalKey; label: string; unit: string };
const SUMMARY_ROWS: { label: string; fields: SummaryField[] }[] = [
  {
    label: "Vital signs",
    fields: [
      { key: "bpSystolic", label: "BP", unit: "mmHg" },
      { key: "heartRateBpm", label: "Heart rate", unit: "bpm" },
      { key: "pulseRateBpm", label: "Pulse", unit: "bpm" },
      { key: "respiratoryRate", label: "Respiratory rate", unit: "/min" },
      { key: "spo2Percent", label: "SpO₂", unit: "%" },
      { key: "temperatureF", label: "Temperature", unit: "°F" },
    ],
  },
  {
    label: "Body measurements",
    fields: [
      { key: "heightCm", label: "Height", unit: "cm" },
      { key: "weightKg", label: "Weight", unit: "kg" },
      { key: "bmi", label: "BMI", unit: "" },
      { key: "waistCm", label: "Waist", unit: "cm" },
      { key: "hipCm", label: "Hip", unit: "cm" },
      { key: "waistHipRatio", label: "Waist-to-hip ratio", unit: "" },
      { key: "headCircumferenceCm", label: "Head circumference", unit: "cm" },
    ],
  },
];

/**
 * One column template for both rows, so a label in row 1 sits exactly above
 * the label in row 2 (row 1 leaves the 7th column empty on wide screens).
 */
const VITALS_COLUMNS = {
  xs: "repeat(2, minmax(0, 1fr))",
  sm: "repeat(3, minmax(0, 1fr))",
  md: "repeat(4, minmax(0, 1fr))",
  lg: "repeat(7, minmax(0, 1fr))",
} as const;

/** The card colour identifies the vital; the status still colours the value. */
const VITAL_CARD_TONE: Partial<Record<VitalKey, CardTone>> = {
  bpSystolic: "red",
  bpDiastolic: "red",
  bloodPressure: "red",
  heartRateBpm: "green",
  pulseRateBpm: "orange",
  respiratoryRate: "purple",
  spo2Percent: "teal",
  temperatureF: "orange",
  heightCm: "teal",
  weightKg: "purple",
  bmi: "orange",
  waistCm: "green",
  hipCm: "green",
  waistHipRatio: "green",
  headCircumferenceCm: "teal",
};

/** The day a reading was taken (`recordedOn` is always set; compared as YYYY-MM-DD). */
const readingDay = (v: LatestVital) => v.recordedOn.slice(0, 10);

/** One strip entry: value + its verdict, BP as "sys/dia" (or the legacy string). */
function reading(ws: EmrWorkspace, key: VitalKey): { value: string; v: LatestVital; status: VitalStatus; label?: string | null } | null {
  const L = ws.latestVitals;
  if (key === "bpSystolic") {
    const pair = L.bloodPressure;
    const sys = L.bpSystolic;
    const dia = L.bpDiastolic;
    const v = sys ?? dia ?? pair;
    if (!v) return null;
    const value = sys || dia ? `${sys?.value ?? "—"}/${dia?.value ?? "—"}` : String(pair?.value ?? "—");
    return { value, v, status: pair?.status ?? v.status, label: pair?.label ?? v.label };
  }
  const v = L[key];
  return v ? { value: String(v.value), v, status: v.status, label: v.label } : null;
}

/**
 * Patient identity banner + latest vitals. Every value shown exists in the
 * record; a vital never measured reads "—" (never an invented number), and
 * each value carries the time it was measured.
 */
export function PatientHeader({ ws }: { ws: EmrWorkspace }) {
  const p = ws.patient;
  const enc = ws.encounter;
  const latestTimes = Object.values(ws.latestVitals)
    .map((v) => v?.recordedAt ?? v?.recordedOn)
    .filter(Boolean) as string[];
  const newest = latestTimes.sort().at(-1);
  const newestDay = Object.values(ws.latestVitals).reduce<string | null>((max, v) => {
    const d = v ? readingDay(v) : null;
    return d && (!max || d > max) ? d : max;
  }, null);

  const visitText = enc
    ? `#${enc.bookingId} · ${dayLabel(enc.date)} · ${enc.appointmentType === "video" ? "Video" : "In-clinic"}${
        enc.clinic ? ` · ${enc.clinic.name}${enc.clinic.city ? `, ${enc.clinic.city}` : ""}` : ""
      }`
    : null;

  // Aligned identity columns; "Current visit" spans two so it never truncates.
  const facts: { k: string; v: string | null; wide?: boolean }[] = [
    { k: "Reg. no", v: p.regNo },
    { k: "Age", v: p.age != null ? `${p.age} years` : null },
    { k: "Date of birth", v: p.dateOfBirth ? dayLabel(p.dateOfBirth) : null },
    { k: "Mobile", v: p.phone },
    { k: "Blood group", v: p.bloodGroup && p.bloodGroup !== "unknown" ? p.bloodGroup : null },
    { k: "Registered", v: p.registeredAt ? instantLabel(p.registeredAt).split(",")[0] : null },
    { k: "Current visit", v: visitText, wide: true },
  ];

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", minWidth: 0 }}>
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          display: "grid",
          gap: { xs: 1.5, md: 3 },
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(240px, 300px) minmax(0, 1fr)" },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, alignItems: "center" }}>
          <Avatar src={p.avatarUrl ?? undefined} sx={{ width: 64, height: 64, fontSize: 22, bgcolor: "secondary.main" }}>
            {getInitials(p.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.25, color: "text.primary" }}>
              {p.name}
            </Typography>
            <Stack direction="row" useFlexGap sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
              {p.gender && <Chip size="small" label={titleCase(p.gender)} sx={{ height: 22 }} />}
              {p.allergies.length ? (
                p.allergies.map((a) => (
                  <Chip
                    key={a.name}
                    size="small"
                    color="error"
                    icon={<FiAlertTriangle />}
                    label={`Allergy: ${a.name}${a.severity ? ` (${a.severity})` : ""}`}
                    sx={{ height: 24, fontWeight: 700, border: 1, borderColor: "error.light" }}
                  />
                ))
              ) : (
                <Chip
                  size="small"
                  variant="outlined"
                  color={p.noKnownAllergies ? "success" : "default"}
                  label={p.noKnownAllergies ? "No known allergies" : "Allergies not recorded"}
                  sx={{ height: 22 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        <Box
          component="dl"
          sx={{
            m: 0,
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
            columnGap: 3,
            rowGap: 1.5,
            "& dt": { fontSize: 11.5, fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase", color: "text.secondary", lineHeight: 1.4 },
            "& dd": { m: 0, mt: 0.25, fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: "text.primary", overflowWrap: "anywhere" },
          }}
        >
          {facts.map((f) => (
            <Box key={f.k} sx={{ minWidth: 0, gridColumn: f.wide ? { xs: "1 / -1", lg: "span 2" } : undefined }}>
              <dt>{f.k}</dt>
              <dd>{f.v ?? "—"}</dd>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Latest vitals: a borderless label-over-value grid ───────────── */}
      <Box sx={{ borderTop: 1, borderColor: "divider", px: { xs: 2, md: 2.5 }, pt: 1.75, pb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 1.25, flexWrap: "wrap" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AccentTile icon="FiActivity" accent="teal" size={28} iconSize={15} />
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, color: "text.primary" }}>
              Latest vitals
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {newest ? `Most recent reading ${newest.length > 10 ? instantLabel(newest) : dayLabel(newest)}` : "No readings recorded yet"}
          </Typography>
        </Stack>
        {/* No boxes, rules or fills — alignment alone carries the grid.
            Abnormal values take the colour (and the word) of the existing
            clinical reference-range verdict. A reading older than the newest
            one says which day it is from. */}
        <Stack spacing={1.75}>
          {SUMMARY_ROWS.map((row) => (
            <Box
              key={row.label}
              component="dl"
              aria-label={row.label}
              sx={{
                m: 0,
                display: "grid",
                columnGap: 2,
                rowGap: 1.5,
                gridTemplateColumns: VITALS_COLUMNS,
                "& dt": { fontSize: 11.5, fontWeight: 500, color: "text.secondary", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                "& dd": { m: 0, mt: 0.25, fontSize: 16, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },
              }}
            >
              {row.fields.map((f) => {
                const r = reading(ws, f.key);
                const tone = r && r.status ? VITAL_TONE[r.status] : null;
                const abnormal = Boolean(r && r.status !== "normal" && r.status !== "unknown");
                const day = r ? readingDay(r.v) : null;
                const older = Boolean(day && newestDay && day !== newestDay);
                const card = CARD_TONES[VITAL_CARD_TONE[f.key] ?? "gray"];
                return (
                  <Tooltip
                    key={f.key}
                    placement="top-start"
                    title={r ? `Measured ${r.v.recordedAt ? instantLabel(r.v.recordedAt) : dayLabel(r.v.recordedOn)}${r.label ? ` · ${r.label}` : ""}` : "Not recorded"}
                  >
                    <Box
                      sx={{
                        minWidth: 0,
                        px: 0.75,
                        py: 0.6,
                        borderRadius: 1.25,
                        bgcolor: card.bg,
                        border: 1,
                        borderColor: card.border,
                      }}
                    >
                      <Box component="dt" sx={{ color: `${card.fg} !important` }}>{f.label}</Box>
                      <Box component="dd" sx={{ color: abnormal && tone ? `${tone}.main` : r ? card.heading : "text.disabled" }}>
                        {r ? r.value : "—"}
                        {r && f.unit ? (
                          <Box component="span" sx={{ fontWeight: 500, fontSize: 12, color: card.fg, ml: 0.5 }}>
                            {f.unit}
                          </Box>
                        ) : null}
                      </Box>
                      {abnormal && r ? (
                        <Typography component="span" sx={{ display: "block", fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: tone ? `${tone}.main` : undefined }}>
                          {r.label ?? titleCase(r.status)}
                        </Typography>
                      ) : older ? (
                        <Typography component="span" sx={{ display: "block", fontSize: 11, lineHeight: 1.3, color: card.fg }}>
                          {dayLabel(day)}
                        </Typography>
                      ) : null}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}
