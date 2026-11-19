"use client";

/**
 * My Patients → one patient: a READ-ONLY review of the record, built from the
 * very same API data and components as the Patient Workbench (header + latest
 * vitals, vitals history, previous consultations, history lists), so the two
 * pages can never disagree. Nothing here edits the patient's own details or a
 * past record; clinical work happens in the Workbench ("Open in Workbench").
 *
 * Access is the server's: common information is visible to a treating doctor;
 * other doctors' prescriptions and reports arrive only with the patient's grant
 * (they render as a lock with "Request access").
 */
import type { ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Icon } from "@/components/common/Icon";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import { useEmrWorkspace, useMedicalHistory } from "../hooks";
import { dayLabel } from "../format";
import { PatientHeader } from "./PatientHeader";
import { VitalsPanel } from "./VitalsPanel";
import { PreviousConsultations, pastConsultations } from "./PreviousVisits";
import { RecordAccessProvider } from "./RecordAccess";
import {
  DiagnosisHistorySection,
  MedicalHistorySection,
  NotesHistorySection,
  PrescriptionHistorySection,
  TestsHistorySection,
} from "./HistorySections";

const SECTIONS = [
  { id: "vitals", label: "Vitals history", icon: "FiActivity" },
  { id: "consultations", label: "Previous consultations", icon: "FiClock" },
  { id: "history", label: "Medical history", icon: "FiBook" },
  { id: "diagnoses", label: "Diagnoses", icon: "FiCrosshair" },
  { id: "prescriptions", label: "Prescriptions", icon: "FiFileText" },
  { id: "tests", label: "Tests & reports", icon: "FiFile" },
  { id: "notes", label: "Doctor notes", icon: "FiFeather" },
  { id: "followups", label: "Follow-ups", icon: "FiCalendar" },
] as const;

const anchor = (id: string) => `profile-${id}`;

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  return (
    <Paper
      component="section"
      variant="outlined"
      id={anchor(id)}
      aria-labelledby={`${anchor(id)}-title`}
      sx={(t) => ({ minWidth: 0, scrollMarginTop: 128, borderRadius: `${t.tokens.radius.xl}px`, overflow: "hidden" })}
    >
      <Stack direction="row" spacing={1} sx={(t) => ({ alignItems: "center", px: { xs: 1.5, md: 2 }, py: 1.1, borderBottom: 1, borderColor: "divider", bgcolor: t.tokens.surface.subtle })}>
        <Box sx={{ display: "flex", color: "secondary.main" }}><Icon name={icon} size={17} /></Box>
        <Typography id={`${anchor(id)}-title`} variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>{title}</Typography>
      </Stack>
      <Box sx={{ p: { xs: 1.5, md: 2 }, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

/** Every follow-up planned in a past consultation, newest first (read-only). */
function FollowUpHistory({ patientId }: { patientId: string }) {
  const q = useMedicalHistory(patientId);
  if (q.isLoading) return <Typography variant="body2" color="text.secondary">Loading…</Typography>;
  if (q.isError || !q.data) return <Typography variant="body2" color="error">{getErrorMessage(q.error)}</Typography>;
  const rows = pastConsultations(q.data, null).filter((c) => c.followUp && (c.followUp.followUpOn || c.followUp.note || c.followUp.comments));
  if (!rows.length) return <Typography variant="body2" color="text.secondary">No follow-ups recorded.</Typography>;
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          minWidth: 560,
          borderCollapse: "collapse",
          fontSize: 13,
          "& th": { color: "text.secondary", fontWeight: 600, fontSize: 12 },
          "& td, & th": { borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "left", verticalAlign: "top" },
        }}
      >
        <thead><tr><th>Follow-up on</th><th>Status</th><th>Plan</th><th>Planned by</th><th>From consultation</th></tr></thead>
        <tbody>
          {rows.map((c) => {
            const f = c.followUp!;
            return (
              <tr key={c.visit.bookingId}>
                <td><b>{f.followUpOn ? dayLabel(f.followUpOn) : "No date set"}</b></td>
                <td>{f.status ? <Chip size="small" label={f.status.label} /> : "—"}</td>
                <td>
                  {[f.note, f.serviceName && `${f.serviceName}${f.serviceQuantity ? ` ×${f.serviceQuantity}` : ""}`, f.homeCare && "At home", f.comments].filter(Boolean).join(" · ") || "—"}
                </td>
                <td>{c.visit.doctor?.name ?? "—"}</td>
                <td>#{c.visit.bookingId} · {dayLabel(c.visit.date)}</td>
              </tr>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
}

export function PatientProfileView({ patientId }: { patientId: string }) {
  const ws = useEmrWorkspace(patientId, null);

  if (ws.isLoading) return <Loading label="Opening patient profile…" />;
  if (ws.isError || !ws.data) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorState title="Can't open this patient" description={getErrorMessage(ws.error)} onRetry={() => ws.refetch()} />
        <Box sx={{ textAlign: "center" }}>
          <Button component={Link} href={ROUTES.dashboard.patients}>Back to My Patients</Button>
        </Box>
      </Box>
    );
  }
  const data = ws.data;

  return (
    <RecordAccessProvider patientId={patientId} access={data.access}>
      <Stack spacing={1.5} sx={{ minWidth: 0 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button size="small" component={Link} href={ROUTES.dashboard.patients} startIcon={<Icon name="FiArrowLeft" />}>My Patients</Button>
            <Typography variant="caption" color="text.secondary">/ {data.patient.name}</Typography>
            <Chip size="small" variant="outlined" icon={<Icon name="FiEye" size={13} />} label="Read-only" />
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" component={Link} href={`${ROUTES.dashboard.patientTimeline(patientId)}?view=timeline`} startIcon={<Icon name="FiList" />}>
              Treatment timeline
            </Button>
            <Button size="small" variant="contained" component={Link} href={ROUTES.dashboard.emrPatient(patientId)} startIcon={<Icon name="FiEdit3" />}>
              Open in Workbench
            </Button>
          </Stack>
        </Stack>

        {/* 1–2. Patient details + latest vitals (the Workbench header). */}
        <PatientHeader ws={data} />

        {/* Section shortcuts — scrolls inside itself on narrow screens. */}
        <Paper variant="outlined" component="nav" aria-label="Profile sections" sx={(t) => ({ px: 1, py: 0.75, borderRadius: `${t.tokens.radius.lg}px`, overflowX: "auto" })}>
          <Stack direction="row" spacing={0.5} sx={{ width: "max-content" }}>
            {SECTIONS.map((s) => (
              <Button key={s.id} size="small" color="inherit" href={`#${anchor(s.id)}`} startIcon={<Icon name={s.icon} size={14} />} sx={{ color: "text.secondary", fontWeight: 600, whiteSpace: "nowrap" }}>
                {s.label}
              </Button>
            ))}
          </Stack>
        </Paper>

        <Section id="vitals" title="Vitals history" icon="FiActivity">
          <VitalsPanel patientId={patientId} bookingId={null} canRecord={false} readOnly />
        </Section>

        <Box id={anchor("consultations")} sx={{ scrollMarginTop: 128 }}>
          <PreviousConsultations patientId={patientId} currentBookingId={null} patient={data.patient} />
        </Box>

        <Section id="history" title="Medical history & long-term conditions" icon="FiBook">
          <MedicalHistorySection patientId={patientId} patient={data.patient} />
        </Section>
        <Section id="diagnoses" title="Diagnoses" icon="FiCrosshair">
          <DiagnosisHistorySection patientId={patientId} />
        </Section>
        <Section id="prescriptions" title="Prescriptions & medicines" icon="FiFileText">
          <PrescriptionHistorySection patientId={patientId} patient={data.patient} />
        </Section>
        <Section id="tests" title="Tests & reports" icon="FiFile">
          <TestsHistorySection patientId={patientId} />
        </Section>
        <Section id="notes" title="Doctor notes" icon="FiFeather">
          <NotesHistorySection patientId={patientId} />
        </Section>
        <Section id="followups" title="Follow-up history" icon="FiCalendar">
          <FollowUpHistory patientId={patientId} />
        </Section>
      </Stack>
    </RecordAccessProvider>
  );
}
