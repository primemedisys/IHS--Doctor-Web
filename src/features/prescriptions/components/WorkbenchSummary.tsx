"use client";

/**
 * The Patient Workbench record a prescription is written from (backend
 * migration 059) — patient, consultation and clinical information, read-only.
 *
 * Nothing here is typed again: it is edited in the Workbench and pulled in by
 * "Refresh from Workbench" (and once more, server-side, when the prescription
 * is signed). Entries the doctor did not mark "show to patient" are listed for
 * the doctor but marked as not printed — the patient receives the prescription.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";
import { ROUTES } from "@/constants/routes";
import { dayLabel, instantLabel, timeLabel, titleCase } from "@/features/emr/format";
import type { WorkbenchSnapshot, WorkbenchVitals } from "@/types/prescription";

const dash = "—";
const sexLabel = (g: string | null) => (g ? titleCase(g) : dash);

/** Label above value — the row/column rhythm used across the record. */
function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: wide ? "1 / -1" : undefined }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography component="div" variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
        {children ?? dash}
      </Typography>
    </Box>
  );
}

const grid = (min: number) => ({
  display: "grid",
  gap: 1.25,
  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: `repeat(auto-fill, minmax(${min}px, 1fr))` },
});

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1.8, display: "block" }}>
      {children}
    </Typography>
  );
}

const VITALS: { key: keyof NonNullable<WorkbenchVitals["values"]>; label: string; unit: string }[] = [
  { key: "bloodPressure", label: "BP", unit: "mmHg" },
  { key: "heartRateBpm", label: "Heart rate", unit: "bpm" },
  { key: "pulseRateBpm", label: "Pulse", unit: "bpm" },
  { key: "respiratoryRate", label: "Resp. rate", unit: "/min" },
  { key: "spo2Percent", label: "SpO₂", unit: "%" },
  { key: "temperatureF", label: "Temperature", unit: "°F" },
  { key: "heightCm", label: "Height", unit: "cm" },
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "bmi", label: "BMI", unit: "" },
];

export function WorkbenchVitalsBlock({ vitals }: { vitals: WorkbenchVitals }) {
  if (vitals.source === "none" || !vitals.values) {
    return <Typography variant="body2" color="text.secondary">No vitals recorded for this patient yet.</Typography>;
  }
  const v = vitals.values;
  const when = vitals.recordedAt ? instantLabel(vitals.recordedAt) : dayLabel(vitals.recordedOn);
  const sourceText =
    vitals.source === "consultation"
      ? `Recorded in this consultation · ${when}`
      : vitals.source === "same_day"
        ? `Recorded on the consultation day (not linked to the visit) · ${when}`
        : `Latest reading on file · ${when} — not from this consultation`;
  return (
    <Box>
      <Box sx={grid(104)}>
        {VITALS.map((f) => (
          <Field key={f.key} label={f.label}>
            {v[f.key] != null ? `${v[f.key]}${f.unit ? ` ${f.unit}` : ""}` : dash}
          </Field>
        ))}
      </Box>
      <Typography variant="caption" color={vitals.printable ? "text.secondary" : "warning.main"} sx={{ display: "block", mt: 0.75 }}>
        {sourceText}
        {vitals.printable ? "" : " · shown for reference, NOT printed on this prescription. Record today's vitals in the Workbench."}
      </Typography>
    </Box>
  );
}

/** Sits inside a line of text (a <p>), so it renders as an inline <span>, not a <div>. */
function NotPrinted() {
  return <Chip component="span" size="small" label="Not shown to patient · not printed" sx={{ height: 20, ml: 0.75, verticalAlign: "middle" }} />;
}

/** Investigation / package orders of this consultation, as ordered in the Workbench. */
function InvestigationList({ items }: { items: NonNullable<WorkbenchSnapshot["investigations"]> }) {
  if (!items.length) return <Typography variant="body2" color="text.secondary">None ordered in this consultation.</Typography>;
  return (
    <Stack spacing={0.5}>
      {items.map((i) => (
        <Typography key={i.id} variant="body2">
          <b>{i.title}</b>
          {[
            i.type ? titleCase(i.type) : null,
            i.priority && i.priority !== "routine" ? i.priority.toUpperCase() : null,
            i.quantity && i.quantity > 1 ? `Qty ${i.quantity}` : null,
            i.instruction,
          ]
            .filter(Boolean)
            .map((t) => ` · ${t}`)
            .join("")}
          {!i.patientVisible && <NotPrinted />}
        </Typography>
      ))}
    </Stack>
  );
}

export function WorkbenchSummary({
  snapshot,
  onRefresh,
  refreshing,
  readOnly = false,
  hideFollowUp = false,
}: {
  snapshot: WorkbenchSnapshot;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** A signed prescription: the snapshot frozen at signing. */
  readOnly?: boolean;
  /** The caller shows the follow-up itself (as printed). */
  hideFollowUp?: boolean;
}) {
  const { patient: p, consultation: c } = snapshot;
  // Snapshot version 2+ only; a snapshot frozen before has none of these.
  const history = snapshot.history ?? [];
  const comorbidities = snapshot.comorbidities ?? [];
  const investigations = snapshot.investigations ?? [];
  const v2 = snapshot.investigations !== undefined;
  const showFollowUp = !hideFollowUp && Boolean(snapshot.followUp?.followUpOn);
  const workbenchHref = p.id ? ROUTES.dashboard.emrPatient(p.id, c.bookingId) : null;

  return (
    <Paper variant="outlined" sx={(t) => ({ overflow: "hidden", borderRadius: `${t.tokens.radius.lg}px` })}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={(t) => ({
          px: 2,
          py: 1.25,
          alignItems: { sm: "center" },
          bgcolor: t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.04) : t.palette.grey[50],
          borderBottom: 1,
          borderColor: "divider",
        })}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {readOnly ? "Clinical information at signing" : "From the Patient Workbench"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {readOnly
              ? `Frozen with the prescription · captured ${instantLabel(snapshot.syncedAt)}`
              : `Consultation #${c.bookingId} · refreshed ${instantLabel(snapshot.syncedAt)} · edit these in the Workbench, not here`}
          </Typography>
        </Box>
        {!readOnly && (
          <Stack direction="row" spacing={1}>
            {onRefresh && (
              <Button size="small" startIcon={<FiRefreshCw />} onClick={onRefresh} disabled={refreshing}>
                {refreshing ? "Refreshing…" : "Refresh from Workbench"}
              </Button>
            )}
            {workbenchHref && (
              <Button size="small" variant="outlined" component={Link} href={workbenchHref} endIcon={<FiExternalLink />}>
                Open Workbench
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Stack spacing={1.5} sx={{ p: 2 }} divider={<Divider flexItem />}>
        <Box>
          <SectionLabel>Patient</SectionLabel>
          <Box sx={grid(150)}>
            <Field label="Name">{p.name}</Field>
            <Field label="Registration no.">{p.regNo}</Field>
            <Field label="Patient ID">{p.id}</Field>
            <Field label="Age / DOB">
              {p.age != null ? `${p.age} yrs` : dash}
              {p.dateOfBirth ? ` · ${dayLabel(p.dateOfBirth)}` : ""}
            </Field>
            <Field label="Gender">{sexLabel(p.gender)}</Field>
            <Field label="Mobile">{p.phone}</Field>
            <Field label="Blood group">{p.bloodGroup && p.bloodGroup !== "unknown" ? p.bloodGroup : dash}</Field>
            <Field label="Address" wide>{p.address}</Field>
          </Box>
        </Box>

        <Box>
          <SectionLabel>Consultation</SectionLabel>
          <Box sx={grid(150)}>
            <Field label="Consultation ID">#{c.bookingId}</Field>
            <Field label="Date & time">
              {dayLabel(c.date)}
              {c.startTime ? ` · ${timeLabel(c.startTime)}` : ""}
            </Field>
            <Field label="Doctor">{c.doctor?.name}</Field>
            <Field label="Specialty">{c.doctor?.specializations.length ? c.doctor.specializations.join(", ") : dash}</Field>
            <Field label="Type">{c.appointmentType === "video" ? "Video" : "In-clinic"}{c.clinic ? ` · ${c.clinic.name}` : ""}</Field>
            <Field label="Status">{titleCase(c.status)}</Field>
          </Box>
        </Box>

        <Box>
          <SectionLabel>Vitals</SectionLabel>
          <WorkbenchVitalsBlock vitals={snapshot.vitals} />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
          <Box sx={{ minWidth: 0 }}>
            <SectionLabel>Chief complaint</SectionLabel>
            {snapshot.complaints.length ? (
              <Stack spacing={0.5}>
                {snapshot.complaints.map((x) => (
                  <Typography key={x.id} variant="body2">
                    <b>{x.title}</b>
                    {[x.since && `since ${x.since}`, x.severity && titleCase(x.severity), x.remarks].filter(Boolean).map((t) => ` · ${t}`).join("")}
                    {!x.patientVisible && <NotPrinted />}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">Not recorded in the Workbench.</Typography>
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <SectionLabel>Diagnosis</SectionLabel>
            {snapshot.diagnoses.length ? (
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13, "& td, & th": { py: 0.5, pr: 1, textAlign: "left", verticalAlign: "top", borderBottom: 1, borderColor: "divider" }, "& th": { color: "text.secondary", fontWeight: 600, fontSize: 12 } }}>
                <thead>
                  <tr><th>Diagnosis</th><th>ICD code</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {snapshot.diagnoses.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <b>{d.title}</b>
                        {d.stage ? ` · Stage ${d.stage}` : ""}
                        {!d.patientVisible && <NotPrinted />}
                      </td>
                      <td title={d.codeDescription ?? undefined}>
                        {d.code ? (
                          <>
                            <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{d.code}</Box>
                            <Typography component="div" variant="caption" color="text.secondary">
                              {[d.codeSystem, d.codeVersion].filter(Boolean).join(" ") || "typed by hand"}
                            </Typography>
                          </>
                        ) : dash}
                      </td>
                      <td>{d.type ? titleCase(d.type) : dash}</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Not recorded in the Workbench.</Typography>
            )}
          </Box>
        </Box>

        {(snapshot.examinations.length > 0 || showFollowUp || v2) && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
            <Box sx={{ minWidth: 0 }}>
              <SectionLabel>Examination findings</SectionLabel>
              {snapshot.examinations.length ? (
                <Stack spacing={0.75}>
                  {snapshot.examinations.map((e) => (
                    <Box key={e.id}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.label}</Typography>
                      {e.findings.map((f) => (
                        <Typography key={f.label} variant="body2">
                          <Box component="span" sx={{ color: "text.secondary" }}>{f.label}: </Box>{f.value}
                        </Typography>
                      ))}
                      {e.remarks && <Typography variant="body2">{e.remarks}</Typography>}
                    </Box>
                  ))}
                  <Typography variant="caption" color="text.secondary">Examinations stay in the record; the prescription does not print them.</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None recorded.</Typography>
              )}
            </Box>
            {hideFollowUp ? (
              <Box sx={{ minWidth: 0 }}>
                <SectionLabel>Investigations ordered</SectionLabel>
                <InvestigationList items={investigations} />
              </Box>
            ) : (
            <Box sx={{ minWidth: 0 }}>
              <SectionLabel>Follow-up</SectionLabel>
              {snapshot.followUp?.followUpOn ? (
                <Typography variant="body2">
                  <b>{dayLabel(snapshot.followUp.followUpOn)}</b>
                  {snapshot.followUp.note ? ` · ${snapshot.followUp.note}` : ""}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">No follow-up date set in the Workbench.</Typography>
              )}
            </Box>
            )}
          </Box>
        )}

        {/* Relevant history of THIS consultation (snapshot version 2+). */}
        {v2 && (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
            <Box sx={{ minWidth: 0 }}>
              <SectionLabel>Relevant patient history</SectionLabel>
              {history.length ? (
                <Stack spacing={0.75}>
                  {history.map((h) => (
                    <Box key={h.id}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {h.label}
                        {!h.patientVisible && <NotPrinted />}
                      </Typography>
                      {h.findings.map((f) => (
                        <Typography key={f.label} variant="body2">
                          <Box component="span" sx={{ color: "text.secondary" }}>{f.label}: </Box>{f.value}
                        </Typography>
                      ))}
                      {h.remarks && <Typography variant="body2">{h.remarks}</Typography>}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None recorded in this consultation.</Typography>
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <SectionLabel>Comorbidities</SectionLabel>
              {comorbidities.length ? (
                <Stack spacing={0.5}>
                  {comorbidities.map((m) => (
                    <Typography key={m.id} variant="body2">
                      <b>{m.title}</b>
                      {[m.category, m.since && `since ${dayLabel(m.since)}`, m.remarks].filter(Boolean).map((t) => ` · ${t}`).join("")}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None recorded in this consultation.</Typography>
              )}
            </Box>
          </Box>
        )}

        {v2 && !hideFollowUp && (
          <Box>
            <SectionLabel>Investigations ordered</SectionLabel>
            <InvestigationList items={investigations} />
          </Box>
        )}

        {!readOnly && snapshot.diagnoses.some((d) => !d.patientVisible) && (
          <Alert severity="info" sx={{ py: 0 }}>
            Diagnoses not marked “Show to patient” are kept out of the printed prescription.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
