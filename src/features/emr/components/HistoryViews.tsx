"use client";

/**
 * Structured clinical history — the SAME presentation in the patient's
 * Medical Record (frontend-patient) and the doctor's workbench
 * (frontend- doctor). The two apps keep an identical copy of this file; both
 * render the one backend shape (medicalHistory.service + serializeMedicalHistory),
 * so a visit's diagnosis, prescription and notes read the same on both sides.
 *
 * Nothing here decides access. A part the viewer may not see arrives as
 * `null` (or listed in `locked`) and is drawn through `renderLocked`, which the
 * doctor app fills with "Request access" and the patient app never needs.
 */
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { dayLabel, instantLabel, titleCase, VISIT_STATUS } from "../format";
import type {
  AccessCategory,
  ClinicalEntry,
  HistoryConsultation,
  HistoryNote,
  HistoryRx,
  MedicalHistory,
  VisitRxItem,
  VitalEntry,
  VitalKey,
} from "@/types/medicalHistory";

export type RenderLocked = (category: AccessCategory) => ReactNode;

export const TIMING_LABEL: Record<string, string> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  anytime: "Any time",
};

const durationLabel = (i: VisitRxItem) =>
  i.durationDays ? `${i.durationDays} ${i.durationUnit}${i.durationDays > 1 ? "s" : ""}` : null;

const Muted = ({ children }: { children: ReactNode }) => (
  <Typography variant="body2" color="text.secondary">{children}</Typography>
);

/** Light table rules: subtle row dividers, muted headers, no box around every cell. */
const lightTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  "& th": { color: "text.secondary", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" },
  "& td, & th": { borderBottom: 1, borderColor: "divider", px: 1, py: 0.6, textAlign: "left", verticalAlign: "top" },
  "& tbody tr:last-of-type td": { borderBottom: 0 },
  "& td:first-of-type, & th:first-of-type": { pl: 0 },
} as const;

/**
 * Medicines exactly as prescribed — a missing value is a dash, never a guess.
 * `prescribedBy` (optional) adds the prescriber's column, for lists that put
 * several prescriptions side by side.
 */
export function MedicinesTable({ items, prescribedBy }: { items: VisitRxItem[]; prescribedBy?: string | null }) {
  if (!items.length) return <Muted>No medicines on this prescription.</Muted>;
  const withBy = prescribedBy !== undefined;
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box component="table" sx={{ ...lightTable, minWidth: withBy ? 720 : 620 }}>
        <thead>
          <tr><th>Medicine</th><th>Strength</th><th>Dose</th><th>Frequency</th><th>Food direction</th><th>Duration</th><th>Instructions</th>{withBy && <th>Prescribed by</th>}</tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.medicineName}-${idx}`}>
              <td><b>{i.medicineName}</b></td>
              <td>{i.strength ?? "—"}</td>
              <td>{i.dosage ?? "—"}</td>
              <td>{i.frequency ?? "—"}</td>
              <td>{i.timing ? TIMING_LABEL[i.timing] ?? titleCase(i.timing) : "—"}</td>
              <td>{durationLabel(i) ?? "—"}</td>
              <td>{i.notes ?? "—"}</td>
              {withBy && <td>{prescribedBy ?? "—"}</td>}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

const VITAL_SHOW: { key: VitalKey; label: string; unit: string }[] = [
  { key: "bloodPressure", label: "BP", unit: "mmHg" },
  { key: "heartRateBpm", label: "Heart rate", unit: "bpm" },
  { key: "pulseRateBpm", label: "Pulse", unit: "bpm" },
  { key: "respiratoryRate", label: "Resp. rate", unit: "/min" },
  { key: "spo2Percent", label: "SpO₂", unit: "%" },
  { key: "temperatureF", label: "Temp", unit: "°F" },
  { key: "heightCm", label: "Height", unit: "cm" },
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "bmi", label: "BMI", unit: "" },
];

/** The visit's newest reading as one aligned row: label above value, with the actual reading time. */
export function VitalsLine({ entries }: { entries: VitalEntry[] }) {
  const reading = entries[0];
  if (!reading || !VITAL_SHOW.some((f) => reading.values[f.key] != null)) return <Muted>No vitals recorded in this visit.</Muted>;
  return (
    <Box>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(3, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(88px, 1fr))" } }}>
        {VITAL_SHOW.map((f) => (
          <Box key={f.key} sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>{f.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {reading.values[f.key] != null ? (
                <>
                  {reading.values[f.key]}
                  {f.unit && <Box component="span" sx={{ fontWeight: 400, color: "text.secondary", fontSize: 12 }}> {f.unit}</Box>}
                </>
              ) : (
                <Box component="span" sx={{ color: "text.disabled" }}>—</Box>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        Reading taken {reading.recordedAt ? instantLabel(reading.recordedAt) : dayLabel(reading.recordedOn)}
        {entries.length > 1 ? ` · ${entries.length} readings in this visit, newest shown` : ""}
      </Typography>
    </Box>
  );
}

/** Detail fields of an entry (HPI, family history…) in reading order. */
export function HistoryDetails({ details }: { details: ClinicalEntry["details"] }) {
  const rank = (k: string) => (k === "presentIllness" ? 0 : k === "pastIllness" ? 1 : 2);
  const rows = Object.entries(details ?? {})
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .sort(([a], [b]) => rank(a) - rank(b));
  if (!rows.length) return null;
  const label = (k: string) =>
    ({ presentIllness: "Present illness", pastIllness: "Past illness" } as Record<string, string>)[k] ?? titleCase(k.replace(/([A-Z])/g, " $1"));
  return (
    <Box>
      {rows.map(([k, v]) => (
        <Typography key={k} variant="body2">
          <Box component="span" sx={{ color: "text.secondary" }}>{label(k)}: </Box>{String(v)}
        </Typography>
      ))}
    </Box>
  );
}

/** A section of a consultation: a quiet label, then its content. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" sx={{ lineHeight: 1.6, display: "block", color: "text.primary", fontWeight: 700, letterSpacing: 0.6 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** "ICD-10 2019" under a code, or "typed" for a hand-entered one. */
const codeSource = (d: ClinicalEntry) => (d.codeSystem ? [d.codeSystem, d.codeVersion].filter(Boolean).join(" ") : d.code ? "typed by hand" : "");

const who = (e: { author?: { name: string } | null }) => e.author?.name ?? "Unknown doctor";

// ── One consultation ─────────────────────────────────────────────────────────
/**
 * One past consultation as its own record: header, then what was recorded IN
 * that visit only (everything is joined on the visit's booking id upstream),
 * laid out in rows and columns — clinical summary, vitals, medicines, advice /
 * notes / follow-up — divided by hairlines, never a box around every field.
 */
export function ConsultationRecord({
  c,
  renderLocked,
  actions,
  mineLabel = "Your visit",
  hideHeader = false,
}: {
  c: HistoryConsultation;
  renderLocked?: RenderLocked;
  actions?: ReactNode;
  mineLabel?: string;
  /** Inside an expandable card whose summary already shows #, date, doctor and status. */
  hideHeader?: boolean;
}) {
  const v = c.visit;
  const lockedOf = (cat: AccessCategory) => c.locked.includes(cat);
  const locked = (cat: AccessCategory) => (renderLocked ? renderLocked(cat) : <Muted>Not shared.</Muted>);
  const status = VISIT_STATUS[v.status];
  const rx = c.prescription;
  const complaints = c.complaints.length
    ? c.complaints.map((x) => ({
        id: x.id,
        text: x.title ?? "",
        extra: [x.details?.duration ? `since ${x.details.duration} ${x.details.durationUnit ?? "day"}${Number(x.details.duration) > 1 ? "s" : ""}` : null, x.details?.severity ? titleCase(String(x.details.severity)) : null]
          .filter(Boolean)
          .join(" · "),
      }))
    : [rx?.chiefComplaint || c.consultationNotes?.find((n) => n.complaints)?.complaints].filter(Boolean).map((t, i) => ({ id: `t-${i}`, text: String(t), extra: "" }));
  const advice = rx?.advice || c.advice || null;
  const notes = [
    ...(c.notes ?? []).map((n) => ({ id: n.id, text: n.remarks, by: who(n) })),
    ...(c.consultationNotes ?? [])
      .filter((n) => n.treatment || n.onExamination)
      .map((n) => ({
        id: `cn-${n.id}`,
        text: [n.onExamination && `O/E: ${n.onExamination}`, n.treatment && `Rx: ${n.treatment}`].filter(Boolean).join("\n"),
        by: n.recordedByName ?? n.doctorName ?? "Doctor",
      })),
  ];
  const fu = c.followUp && (c.followUp.followUpOn || c.followUp.note || c.followUp.comments) ? c.followUp : null;

  // Diagnosis rows: structured entries (with ICD), else the line written on the prescription.
  const diagnosisBlock =
    c.diagnoses === null && !c.rxDiagnosis ? (
      locked("diagnoses")
    ) : c.diagnoses && c.diagnoses.length ? (
      <Box component="table" sx={lightTable}>
        <thead>
          <tr><th>Diagnosis</th><th>ICD code</th></tr>
        </thead>
        <tbody>
          {c.diagnoses.map((d) => (
            <tr key={d.id}>
              <td>
                <b>{d.title}</b>
                {(d.category || d.details?.stage) && (
                  <Typography component="div" variant="caption" color="text.secondary">
                    {[d.category ? titleCase(d.category) : null, d.details?.stage ? `Stage ${d.details.stage}` : null].filter(Boolean).join(" · ")}
                  </Typography>
                )}
              </td>
              <td title={d.codeDescription ?? undefined}>
                {d.code ? (
                  <>
                    <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{d.code}</Box>
                    <Typography component="div" variant="caption" color="text.secondary">{codeSource(d)}</Typography>
                  </>
                ) : (
                  <Box component="span" sx={{ color: "text.disabled" }}>—</Box>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Box>
    ) : rx?.diagnosis || c.rxDiagnosis ? (
      <Box>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{rx?.diagnosis || c.rxDiagnosis}</Typography>
        <Typography variant="caption" color="text.secondary">As written on the prescription</Typography>
      </Box>
    ) : (
      <Muted>Not recorded</Muted>
    );

  return (
    <Paper
      variant="outlined"
      component="article"
      aria-label={`Consultation #${v.bookingId}`}
      sx={(t) => ({
        overflow: "hidden",
        ...(hideHeader ? { border: 0 } : { borderLeft: `4px solid ${c.isMine ? t.palette.primary.main : t.palette.grey[300]}` }),
      })}
    >
      {!hideHeader && (
        <Stack
          direction="row"
          useFlexGap
          sx={(t) => ({ alignItems: "center", flexWrap: "wrap", gap: 0.75, px: 1.5, py: 1, bgcolor: t.tokens.surface.subtle, borderBottom: 1, borderColor: "divider" })}
        >
          <Box sx={{ minWidth: 0, mr: 0.5 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
              Consultation #{v.bookingId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {v.doctor?.name ?? "Doctor"}
              {v.doctor?.specializations.length ? ` · ${v.doctor.specializations.join(", ")}` : ""}
              {v.clinic ? ` · ${v.clinic.name}${v.clinic.city ? `, ${v.clinic.city}` : ""}` : v.appointmentType === "video" ? " · Online" : ""}
            </Typography>
          </Box>
          <Chip size="small" label={dayLabel(v.date)} />
          <Chip size="small" variant="outlined" label={v.appointmentType === "video" ? "Video consultation" : "In-clinic"} />
          {status && <Chip size="small" color={status.color} label={status.label} />}
          {c.isMine && <Chip size="small" color="primary" variant="outlined" label={mineLabel} />}
          <Box sx={{ flex: 1 }} />
          {actions}
        </Stack>
      )}

      <Stack divider={<Divider flexItem />} spacing={1.25} sx={{ p: 1.5 }}>
        {/* Clinical summary: Chief complaint | Diagnosis + ICD code */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 2fr)" } }}>
          <Section title="Chief complaint">
            {complaints.length ? (
              <Stack spacing={0.4}>
                {complaints.map((x) => (
                  <Typography key={x.id} variant="body2">
                    <b>{x.text}</b>
                    {x.extra && <Box component="span" sx={{ color: "text.secondary" }}> · {x.extra}</Box>}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Muted>Not recorded</Muted>
            )}
          </Section>
          <Section title="Diagnosis · ICD code">{diagnosisBlock}</Section>
        </Box>

        <Section title="Vitals">
          <VitalsLine entries={c.vitals} />
        </Section>

        {c.examinations.length > 0 && (
          <Section title="Examination">
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
              {c.examinations.map((e) => (
                <Box key={e.id} sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{titleCase(e.category)}</Typography>
                  <HistoryDetails details={e.details} />
                  {e.remarks && <Typography variant="body2">{e.remarks}</Typography>}
                </Box>
              ))}
            </Box>
          </Section>
        )}

        <Section title={`Prescribed medicines${rx?.rxNumber ? ` · ${rx.rxNumber}` : ""}${rx?.status === "draft" ? " · draft (not signed)" : ""}`}>
          {lockedOf("medications") ? (
            locked("medications")
          ) : rx ? (
            rx.noMedication && !rx.items.length ? <Muted>Medication not needed.</Muted> : <MedicinesTable items={rx.items} />
          ) : (
            <Muted>No prescription for this visit.</Muted>
          )}
        </Section>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" } }}>
          <Section title="Doctor's advice">
            {advice ? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{advice}</Typography> : <Muted>None recorded</Muted>}
          </Section>
          <Section title="Doctor's notes">
            {lockedOf("doctor_notes") ? (
              locked("doctor_notes")
            ) : notes.length ? (
              <Stack spacing={0.5}>
                {notes.map((n) => (
                  <Typography key={n.id} variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {n.text} <Typography component="span" variant="caption" color="text.secondary">— {n.by}</Typography>
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Muted>No published notes</Muted>
            )}
          </Section>
          <Section title="Follow-up">
            {fu ? (
              <Typography variant="body2">
                <b>{fu.followUpOn ? dayLabel(fu.followUpOn) : "No date set"}</b>
                {fu.status ? ` · ${fu.status.label}` : ""}
                {fu.serviceName ? ` · ${fu.serviceName}${fu.serviceQuantity ? ` ×${fu.serviceQuantity}` : ""}` : ""}
                {fu.homeCare ? " · at home" : ""}
                {fu.note ? ` · ${fu.note}` : ""}
              </Typography>
            ) : (
              <Muted>No follow-up recommended</Muted>
            )}
          </Section>
        </Box>

        {(lockedOf("investigations") || (c.investigations?.length ?? 0) > 0) && (
          <Section title="Tests ordered">
            {lockedOf("investigations")
              ? locked("investigations")
              : c.investigations!.map((i) => (
                  <Typography key={i.id} variant="body2">
                    <b>{i.title}</b>{i.category ? ` · ${titleCase(i.category)}` : ""}{i.remarks ? ` — ${i.remarks}` : ""}
                  </Typography>
                ))}
          </Section>
        )}
      </Stack>
    </Paper>
  );
}

/** Consultations newest first, each on its own; long histories reveal in pages. */
export function ConsultationList({
  consultations,
  renderLocked,
  actionsFor,
  empty = "No previous medical records available.",
  pageSize = 5,
  capped,
  mineLabel,
}: {
  consultations: HistoryConsultation[];
  renderLocked?: RenderLocked;
  actionsFor?: (c: HistoryConsultation) => ReactNode;
  empty?: string;
  pageSize?: number;
  capped?: boolean;
  mineLabel?: string;
}) {
  const [shown, setShown] = useState(pageSize);
  if (!consultations.length) return <Muted>{empty}</Muted>;
  return (
    <Stack spacing={1.25}>
      {consultations.slice(0, shown).map((c) => (
        <ConsultationRecord key={c.visit.bookingId} c={c} renderLocked={renderLocked} actions={actionsFor?.(c)} mineLabel={mineLabel} />
      ))}
      {shown < consultations.length && (
        <Button onClick={() => setShown((n) => n + pageSize)} sx={{ alignSelf: "center" }}>
          Show older consultations ({consultations.length - shown} more)
        </Button>
      )}
      {capped && shown >= consultations.length && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          Showing the most recent {consultations.length} consultations.
        </Typography>
      )}
    </Stack>
  );
}

// ── Lists across the whole record ────────────────────────────────────────────
/** Entries as cards with who recorded them and when (never edited here). */
export function EntryHistory({
  entries,
  empty,
  render,
}: {
  entries: ClinicalEntry[];
  empty: string;
  render: (e: ClinicalEntry) => ReactNode;
}) {
  if (!entries.length) return <Muted>{empty}</Muted>;
  return (
    <Stack spacing={0.75}>
      {entries.map((e) => (
        <Paper key={e.id} variant="outlined" sx={{ p: 1.25 }}>
          {render(e)}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Recorded by {who(e)} · {e.visitDate ? `consultation on ${dayLabel(e.visitDate)}` : instantLabel(e.createdAt)}
            {e.bookingId ? ` · #${e.bookingId}` : ""}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}

export const historyLabel = (k: string | null) => (k === "hpi" ? "Present & past illness" : `${titleCase(k)} history`);

export function MedicalHistoryList({ entries, empty }: { entries: ClinicalEntry[]; empty: string }) {
  return (
    <EntryHistory entries={entries} empty={empty} render={(e) => (
      <>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{historyLabel(e.category)}</Typography>
        <HistoryDetails details={e.details} />
        {e.remarks && <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{e.remarks}</Typography>}
      </>
    )} />
  );
}

export function ConditionList({ entries, empty }: { entries: ClinicalEntry[]; empty: string }) {
  return (
    <EntryHistory entries={entries} empty={empty} render={(e) => (
      <>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.title}</Typography>
        {e.remarks && <Typography variant="body2">{e.remarks}</Typography>}
        {e.recordedOn && <Typography variant="caption" color="text.secondary">Since {dayLabel(e.recordedOn)}</Typography>}
      </>
    )} />
  );
}

const tableSx = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  "& th": { color: "text.secondary", fontWeight: 600, fontSize: 12 },
  "& td, & th": { borderBottom: 1, borderColor: "divider", px: 1, py: 0.6, textAlign: "left", verticalAlign: "top" },
} as const;

/** Every diagnosis with its date, doctor and consultation. */
export function DiagnosisHistory({ h, empty }: { h: Pick<MedicalHistory, "diagnoses" | "prescriptionDiagnoses">; empty: string }) {
  const rows = [
    ...h.diagnoses.map((d) => ({
      key: d.id,
      name: d.title ?? "",
      code: d.code,
      codeSource: codeSource(d),
      codeDescription: d.codeDescription ?? null,
      type: titleCase(d.category),
      date: d.visitDate ?? d.recordedOn,
      doctor: who(d),
      visit: d.bookingId,
    })),
    ...h.prescriptionDiagnoses.map((d) => ({
      key: `rx-${d.prescriptionId}`,
      name: d.diagnosis,
      code: null as string | null,
      codeSource: "",
      codeDescription: null as string | null,
      type: "From prescription",
      date: d.visitDate ?? d.date?.slice(0, 10) ?? null,
      doctor: d.doctor?.name ?? "Unknown doctor",
      visit: d.bookingId,
    })),
  ].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  if (!rows.length) return <Muted>{empty}</Muted>;
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box component="table" sx={{ ...tableSx, minWidth: 600 }}>
        <thead><tr><th>Diagnosis</th><th>ICD code</th><th>Type</th><th>Date</th><th>Doctor</th><th>Consultation</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td><b>{r.name}</b></td>
              <td title={r.codeDescription ?? undefined}>
                {r.code ? (
                  <>
                    <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{r.code}</Box>
                    {r.codeSource && <Typography component="div" variant="caption" color="text.secondary">{r.codeSource}</Typography>}
                  </>
                ) : "—"}
              </td>
              <td>{r.type || "—"}</td>
              <td>{dayLabel(r.date)}</td>
              <td>{r.doctor}</td>
              <td>{r.visit ? `#${r.visit}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

/** Each prescription as written: prescriber, date, diagnosis, medicines, advice. */
export function PrescriptionHistory({
  prescriptions,
  empty,
  actionsFor,
  capped,
}: {
  prescriptions: HistoryRx[];
  empty: string;
  actionsFor?: (rx: HistoryRx) => ReactNode;
  capped?: boolean;
}) {
  const [shown, setShown] = useState(5);
  if (!prescriptions.length) return <Muted>{empty}</Muted>;
  return (
    <Stack spacing={1}>
      {prescriptions.slice(0, shown).map((rx) => (
        <Paper key={rx.id} variant="outlined" sx={{ p: 1.25 }}>
          <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75, mb: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{rx.rxNumber ?? "Prescription"}</Typography>
            <Chip size="small" label={dayLabel(rx.visitDate ?? rx.finalizedAt?.slice(0, 10) ?? rx.createdAt?.slice(0, 10))} />
            {rx.status === "draft" && <Chip size="small" color="warning" variant="outlined" label="Draft" />}
            <Typography variant="body2" color="text.secondary">
              {rx.doctor?.name ?? "Doctor"}{rx.bookingId ? ` · consultation #${rx.bookingId}` : " · walk-in"}
            </Typography>
            <Box sx={{ flex: 1 }} />
            {actionsFor?.(rx)}
          </Stack>
          {rx.diagnosis && <Typography variant="body2" sx={{ mb: 0.5 }}><Box component="span" sx={{ color: "text.secondary" }}>Diagnosis: </Box>{rx.diagnosis}</Typography>}
          {rx.noMedication && !rx.items.length ? <Muted>Medication not needed.</Muted> : <MedicinesTable items={rx.items} />}
          {rx.advice && <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}><b>Advice:</b> {rx.advice}</Typography>}
        </Paper>
      ))}
      {shown < prescriptions.length && (
        <Button onClick={() => setShown((n) => n + 5)} sx={{ alignSelf: "center" }}>
          Show older prescriptions ({prescriptions.length - shown} more)
        </Button>
      )}
      {capped && shown >= prescriptions.length && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>Showing the most recent {prescriptions.length} prescriptions.</Typography>
      )}
    </Stack>
  );
}

export function InvestigationHistory({ entries, empty }: { entries: ClinicalEntry[]; empty: string }) {
  if (!entries.length) return <Muted>{empty}</Muted>;
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box component="table" sx={{ ...tableSx, minWidth: 560 }}>
        <thead><tr><th>Test</th><th>Type</th><th>Priority</th><th>Instructions</th><th>Ordered</th><th>Doctor</th></tr></thead>
        <tbody>
          {entries.map((t) => (
            <tr key={t.id}>
              <td><b>{t.title}</b></td>
              <td>{titleCase(t.category) || "—"}</td>
              <td>{t.details?.priority === "stat" ? "Immediately" : titleCase(String(t.details?.priority ?? "routine"))}</td>
              <td>{t.remarks ?? "—"}</td>
              <td>{t.visitDate ? dayLabel(t.visitDate) : instantLabel(t.createdAt)}</td>
              <td>{who(t)}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

export function NotesHistory({ notes, legacy, empty }: { notes: ClinicalEntry[]; legacy: HistoryNote[]; empty: string }) {
  const rows = [
    ...notes.map((n) => ({ id: n.id, at: n.createdAt ?? "", text: n.remarks ?? "", by: who(n), visit: n.bookingId, draft: !n.patientVisible })),
    ...legacy
      .filter((n) => n.complaints || n.onExamination || n.treatment || n.diagnosis)
      .map((n) => ({
        id: `cn-${n.id}`,
        at: n.date,
        text: [n.complaints && `C/O: ${n.complaints}`, n.onExamination && `O/E: ${n.onExamination}`, n.diagnosis && `Dx: ${n.diagnosis}`, n.treatment && `Rx: ${n.treatment}`]
          .filter(Boolean)
          .join("\n"),
        by: n.recordedByName ?? n.doctorName ?? "Doctor",
        visit: n.bookingId,
        draft: false,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (!rows.length) return <Muted>{empty}</Muted>;
  return (
    <Stack spacing={0.75}>
      {rows.map((n) => (
        <Paper key={n.id} variant="outlined" sx={{ p: 1.25 }}>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{n.text}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {n.by} · {instantLabel(n.at)}{n.visit ? ` · consultation #${n.visit}` : ""}{n.draft ? " · draft (private)" : ""}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}
