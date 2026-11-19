"use client";

/**
 * Previous Consultations — what the doctor reads BEFORE today's consultation.
 *
 * One read-only block between the Smart Consultation bar and today's clinical
 * sections: the access strip for other doctors' records, the patient's history
 * at a glance, then every earlier consultation as its own expandable record,
 * newest first. Each record shows only what was recorded IN that visit (the
 * server joins everything on the visit's booking id).
 *
 * Common information (complaint, diagnosis, vitals, advice, follow-up, notes,
 * history) is visible to a treating doctor; a visit's prescription and tests
 * arrive only with the patient's grant — the server leaves them out, and they
 * render here as a lock with "Request access".
 */
import { useState, type ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { AccentTile } from "@/components/common/AccentTile";
import { Icon } from "@/components/common/Icon";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory } from "../hooks";
import { dayLabel, istToday, timeLabel, VISIT_STATUS } from "../format";
import { ConsultationRecord, historyLabel } from "./HistoryViews";
import { LockedNotice, RecordAccessBar } from "./RecordAccess";
import type { EmrIdentity, HistoryConsultation, MedicalHistory } from "@/types/emr";

const PAGE = 5;

/** Visits that already happened: never today's open visit, an upcoming booking or a no-show. */
export function pastConsultations(h: MedicalHistory, currentBookingId: string | null) {
  const today = istToday();
  return h.consultations.filter(
    (c) =>
      c.visit.bookingId !== currentBookingId &&
      c.visit.status !== "no_show" &&
      (c.visit.status === "completed" || c.visit.date <= today),
  );
}

function GlanceBlock({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "text.secondary", mb: 0.5 }}>
        <Icon name={icon} size={14} />
        <Typography variant="overline" sx={{ lineHeight: 1.6, fontWeight: 700 }}>{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <Typography variant="body2" color="text.secondary">{children}</Typography>;

/** Long-term conditions, past history and recent diagnoses — one compact row. */
function HistoryGlance({ h, patient }: { h: MedicalHistory; patient?: EmrIdentity }) {
  const conditions = [
    ...h.longTermConditions.map((e) => ({ key: `c-${e.id}`, label: e.title ?? "", by: e.author?.name ?? null })),
    ...(patient?.conditions ?? []).map((c) => ({ key: `p-${c.name}`, label: `${c.name}${c.diagnosedYear ? ` (${c.diagnosedYear})` : ""}`, by: "patient" })),
  ].filter((c) => c.label);
  const diagnoses = [
    ...new Set([
      ...h.diagnoses.map((d) => d.title).filter((t): t is string => Boolean(t)),
      ...h.prescriptionDiagnoses.map((d) => d.diagnosis).filter(Boolean),
    ]),
  ].slice(0, 8);
  const history = h.medicalHistory.slice(0, 3);
  return (
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" } }}>
      <GlanceBlock title="Long-term conditions" icon="FiHeart">
        {conditions.length ? (
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {conditions.map((c) => (
              <Chip key={c.key} size="small" variant="outlined" color={c.by === "patient" ? "default" : "primary"} label={c.label} title={c.by === "patient" ? "Declared by the patient" : c.by ? `Recorded by ${c.by}` : undefined} />
            ))}
          </Stack>
        ) : <Muted>None recorded</Muted>}
      </GlanceBlock>
      <GlanceBlock title="Past medical history" icon="FiBook">
        {history.length ? (
          <Stack spacing={0.25}>
            {history.map((e) => {
              const detail = Object.values(e.details ?? {}).filter((v) => v != null && String(v).trim()).map(String)[0] ?? e.remarks ?? "";
              return (
                <Typography key={e.id} variant="body2" noWrap title={detail}>
                  <b>{historyLabel(e.category)}</b>{detail ? ` — ${detail}` : ""}
                </Typography>
              );
            })}
            {h.medicalHistory.length > history.length && <Typography variant="caption" color="text.secondary">+{h.medicalHistory.length - history.length} more in Patient History</Typography>}
          </Stack>
        ) : <Muted>None recorded</Muted>}
      </GlanceBlock>
      <GlanceBlock title="Previous diagnoses" icon="FiCrosshair">
        {diagnoses.length ? (
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {diagnoses.map((d) => <Chip key={d} size="small" label={d} />)}
          </Stack>
        ) : <Muted>None recorded</Muted>}
      </GlanceBlock>
    </Box>
  );
}

/** The one-line summary of a consultation (the accordion's header). */
function Summary({ c }: { c: HistoryConsultation }) {
  const v = c.visit;
  const status = VISIT_STATUS[v.status];
  const complaint =
    c.complaints.map((x) => x.title).filter(Boolean).join(", ") ||
    c.prescription?.chiefComplaint?.replace(/^\s*\d+\.\s*/gm, "").replace(/\n/g, ", ") ||
    null;
  const diagnosis =
    (c.diagnoses ?? [])
      .filter((d) => d.title)
      .map((d) => `${d.title}${d.code ? ` (${d.code})` : ""}`)
      .join(", ") ||
    c.prescription?.diagnosis?.replace(/^\s*\d+\.\s*/gm, "").replace(/\n/g, ", ") ||
    c.rxDiagnosis ||
    null;
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, color: "text.primary" }}>Consultation #{v.bookingId}</Typography>
        <Chip size="small" label={`${dayLabel(v.date)}${v.startTime ? ` · ${timeLabel(v.startTime)}` : ""}`} />
        <Chip size="small" variant="outlined" icon={<Icon name={v.appointmentType === "video" ? "FiVideo" : "FiMapPin"} size={13} />} label={v.appointmentType === "video" ? "Video" : "In-clinic"} />
        {status && <Chip size="small" color={status.color} label={status.label} />}
        {c.isMine && <Chip size="small" color="primary" variant="outlined" label="Your visit" />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
        {v.doctor?.name ?? "Doctor"}
        {v.doctor?.specializations.length ? ` · ${v.doctor.specializations.join(", ")}` : ""}
        {v.clinic ? ` · ${v.clinic.name}` : ""}
      </Typography>
      {(complaint || diagnosis) && (
        <Typography variant="body2" sx={{ mt: 0.25 }} noWrap>
          {complaint && <><Box component="span" sx={{ color: "text.secondary" }}>Complaint: </Box>{complaint}</>}
          {complaint && diagnosis ? " · " : ""}
          {diagnosis && <><Box component="span" sx={{ color: "text.secondary" }}>Diagnosis: </Box>{diagnosis}</>}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The read-only history block. `currentBookingId` is excluded (it is today's
 * visit, edited below); pass null on read-only pages to list every past visit.
 */
export function PreviousConsultations({
  patientId,
  currentBookingId,
  patient,
  showAccessBar = true,
}: {
  patientId: string;
  currentBookingId: string | null;
  patient?: EmrIdentity;
  showAccessBar?: boolean;
}) {
  const q = useMedicalHistory(patientId);
  const [shown, setShown] = useState(PAGE);
  // One record by default — the latest COMPLETED previous consultation — so the
  // block stays short; "View All" lists every earlier visit (newest first).
  const [showAll, setShowAll] = useState(false);
  // The latest consultation starts open; the doctor opens any other on demand.
  const [open, setOpen] = useState<Set<string> | null>(null);

  const past = q.data ? pastConsultations(q.data, currentBookingId) : [];
  // `past` is already newest first (date, then time). Prefer a completed visit;
  // a patient with none yet still sees their most recent earlier visit.
  const latest = past.find((c) => c.visit.status === "completed") ?? past[0];
  const listed = showAll ? past.slice(0, shown) : latest ? [latest] : [];
  const openSet = open ?? new Set(latest ? [latest.visit.bookingId] : []);
  const toggle = (id: string) =>
    setOpen(() => {
      const next = new Set(openSet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby="previous-consultations-title"
      sx={(t) => ({ minWidth: 0, borderRadius: `${t.tokens.radius.xl}px`, overflow: "hidden" })}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={(t) => ({ alignItems: "center", flexWrap: "wrap", gap: 1, px: { xs: 1.5, md: 2 }, py: 1.1, borderBottom: 1, borderColor: "divider", bgcolor: t.tokens.surface.subtle })}
      >
        <AccentTile icon="FiClock" accent="grey" size={28} iconSize={15} />
        <Typography id="previous-consultations-title" variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
          Previous Consultations
        </Typography>
        {q.data && <Chip size="small" label={past.length} />}
        <Typography variant="caption" color="text.secondary" sx={{ ml: { md: "auto" } }}>Read-only · newest first</Typography>
      </Stack>

      <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2 }, minWidth: 0 }}>
        {showAccessBar && <RecordAccessBar />}
        {q.isLoading && <Muted>Loading previous consultations…</Muted>}
        {q.isError && <Alert severity="error">{getErrorMessage(q.error)}</Alert>}
        {q.data && (
          <>
            <HistoryGlance h={q.data} patient={patient} />
            {past.length === 0 ? (
              <Muted>No previous medical records available.</Muted>
            ) : (
              <Stack spacing={1}>
                {!showAll && latest && (
                  <Typography variant="caption" color="text.secondary">
                    {latest.visit.status === "completed" ? "Latest completed consultation" : "Latest previous consultation"}
                  </Typography>
                )}
                {listed.map((c) => {
                  const id = c.visit.bookingId;
                  return (
                    <Accordion
                      key={id}
                      disableGutters
                      expanded={openSet.has(id)}
                      onChange={() => toggle(id)}
                      slotProps={{ transition: { unmountOnExit: true } }}
                      sx={(t) => ({
                        border: 1,
                        borderColor: "divider",
                        borderRadius: `${t.tokens.radius.lg}px !important`,
                        borderLeft: `4px solid ${c.isMine ? t.palette.primary.main : t.palette.grey[300]}`,
                        boxShadow: "none",
                        "&::before": { display: "none" },
                        overflow: "hidden",
                      })}
                    >
                      <AccordionSummary
                        expandIcon={<Icon name="FiChevronDown" />}
                        aria-controls={`consult-${id}-content`}
                        id={`consult-${id}-header`}
                        sx={{ px: 1.5, "& .MuiAccordionSummary-content": { minWidth: 0, my: 1 } }}
                      >
                        <Summary c={c} />
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: "divider" }}>
                        <ConsultationRecord c={c} hideHeader renderLocked={(category) => <LockedNotice category={category} compact />} />
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                {!showAll && past.length > 1 && (
                  <Button variant="outlined" startIcon={<Icon name="FiChevronsDown" />} onClick={() => setShowAll(true)} sx={{ alignSelf: "center" }}>
                    View All Previous Consultations ({past.length})
                  </Button>
                )}
                {showAll && shown < past.length && (
                  <Button onClick={() => setShown((n) => n + PAGE)} sx={{ alignSelf: "center" }}>
                    Show older consultations ({past.length - shown} more)
                  </Button>
                )}
                {showAll && past.length > 1 && (
                  <Button
                    startIcon={<Icon name="FiChevronsUp" />}
                    onClick={() => {
                      setShowAll(false);
                      setShown(PAGE);
                    }}
                    sx={{ alignSelf: "center" }}
                  >
                    Show Latest Only
                  </Button>
                )}
                {showAll && q.data.capped.consultations && shown >= past.length && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                    Showing the most recent {past.length} consultations.
                  </Typography>
                )}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
