"use client";

/**
 * Clinical Records — the patient's whole consultation history across every
 * doctor, newest first. Each consultation is its own expandable record (the
 * same ConsultationRecord the workbench uses, joined on the visit's booking
 * id), followed by the server-filtered chronological timeline.
 */
import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { VISIT_STATUS, dayLabel, istToday, timeLabel } from "../format";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory } from "../hooks";
import { ConsultationRecord } from "../components/HistoryViews";
import { LockedNotice } from "../components/RecordAccess";
import { MedicinesTable } from "../components/HistoryViews";
import { RecordsFrame, Section, StatRow, Muted, Facts } from "./RecordsKit";
import { TimelinePanel } from "./TimelinePanel";
import { courseOf, currentMedicines, diagnosisRows, diagnosisTypeLabel, rxDay, signedRx, visitOf } from "./derive";
import type { MedicalHistory } from "@/types/emr";

export function ClinicalRecordsPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="clinical-records">
      {() => <Body patientId={patientId} />}
    </RecordsFrame>
  );
}

function Body({ patientId }: { patientId: string }) {
  const q = useMedicalHistory(patientId);
  if (q.isError) return <ErrorState title="Couldn't load the clinical records" description={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={110} />)}</Stack>;
  return <Loaded h={q.data} patientId={patientId} />;
}

function Loaded({ h, patientId }: { h: MedicalHistory; patientId: string }) {
  const today = istToday();
  // Consultations that already took place (an upcoming booking has no record yet).
  const visits = h.consultations.filter((c) => c.visit.status !== "no_show" && (c.visit.status === "completed" || c.visit.date <= today));
  const doctors = new Map(visits.filter((c) => c.visit.doctor).map((c) => [c.visit.doctor!.id, c.visit.doctor!.name ?? "Doctor"]));
  const latest = visits[0];
  const recordCount = (c: (typeof visits)[number]) =>
    c.complaints.length + c.examinations.length + (c.diagnoses?.length ?? 0) + (c.investigations?.length ?? 0) + (c.notes?.length ?? 0) + (c.consultationNotes?.length ?? 0) + c.vitals.length;

  const dx = diagnosisRows(h)[0] ?? null;
  const dxVisit = dx ? visitOf(h, dx.bookingId) : null;
  const meds = currentMedicines(h, today);

  const [doctorId, setDoctorId] = useState("");
  const shown = visits.filter((c) => !doctorId || c.visit.doctor?.id === doctorId);
  const capped = h.capped.consultations ? "+" : "";

  return (
    <Stack spacing={2}>
      <StatRow
        tone="purple"
        stats={[
          { label: "Consultations", value: `${visits.length}${capped}` },
          { label: "Clinical records", value: String(visits.reduce((n, c) => n + recordCount(c), 0)) },
          { label: "Doctors involved", value: String(doctors.size) },
          { label: "Latest consultation", value: latest ? dayLabel(latest.visit.date) : "—" },
          { label: "Last attending doctor", value: latest?.visit.doctor?.name ?? "—" },
        ]}
      />

      <Section title="Latest documented diagnosis" hint="Shown as the doctor recorded it — a later entry never counts as confirmed on its own.">
        {dx ? (
          <Facts
            items={[
              { k: "Diagnosis", v: dx.name },
              { k: "ICD code", v: dx.code ? `${[dx.codeSystem, dx.code].filter(Boolean).join(" ")}` : null },
              { k: "Type as recorded", v: diagnosisTypeLabel(dx.type) },
              { k: "Documented by", v: dx.doctor.name },
              { k: "Specialty", v: dx.specialties.join(", ") },
              { k: "Date", v: dx.date ? dayLabel(dx.date) : null },
              { k: "Consultation", v: dx.bookingId ? `#${dx.bookingId}${dxVisit ? ` · ${dayLabel(dxVisit.date)}` : ""}` : "Not linked to a consultation" },
            ]}
          />
        ) : (
          <Muted>No diagnosis has been documented.</Muted>
        )}
      </Section>

      <Section title="Current and recent medicines" hint="Judged only by the prescribed duration — not by whether the patient is taking them.">
        <RecentMedicines h={h} activeCount={meds.length} />
      </Section>

      <Section
        title="Consultation history"
        hint="Newest first. Each record is exactly what that doctor documented."
        actions={
          doctors.size > 1 ? (
            <TextField fullWidth={false} select size="small" label="Doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="">All doctors</MenuItem>
              {[...doctors].map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
            </TextField>
          ) : undefined
        }
      >
        {shown.length === 0 ? (
          <Muted>No clinical records available.</Muted>
        ) : (
          <Stack spacing={1}>
            {shown.map((c) => {
              const v = c.visit;
              const status = VISIT_STATUS[v.status];
              const dxNames = (c.diagnoses ?? []).map((d) => d.title).filter(Boolean);
              return (
                <Accordion key={v.bookingId} disableGutters variant="outlined" slotProps={{ transition: { unmountOnExit: true } }} sx={{ borderRadius: 2, "&:before": { display: "none" }, overflow: "hidden" }}>
                  <AccordionSummary expandIcon={<Icon name="FiChevronDown" />} sx={{ px: 1.5 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" useFlexGap sx={{ gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{dayLabel(v.date)}{v.startTime ? ` · ${timeLabel(v.startTime)}` : ""}</Typography>
                        <Chip size="small" label={`#${v.bookingId}`} sx={{ height: 20 }} />
                        <Chip size="small" color={status.color} variant="outlined" label={status.label} sx={{ height: 20 }} />
                        <Chip size="small" variant="outlined" label={v.appointmentType === "video" ? "Video" : "In clinic"} sx={{ height: 20 }} />
                        {c.isMine && <Chip size="small" color="primary" variant="outlined" label="Your consultation" sx={{ height: 20 }} />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {v.doctor?.name ?? "Doctor"}
                        {v.doctor?.specializations.length ? ` · ${v.doctor.specializations.join(", ")}` : ""}
                        {v.clinic ? ` · ${v.clinic.name}${v.clinic.city ? `, ${v.clinic.city}` : ""}` : ""}
                      </Typography>
                      {dxNames.length > 0 && <Typography variant="caption" color="text.secondary">Diagnosis: {dxNames.join(", ")}</Typography>}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 1.5, pt: 0 }}>
                    <ConsultationRecord c={c} hideHeader renderLocked={(cat) => <LockedNotice category={cat} compact scope="others" />} />
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Section>

      <Section title="Chronological timeline" hint="Every event from every doctor, with the doctor who created it.">
        <TimelinePanel patientId={patientId} />
      </Section>
    </Stack>
  );
}

/** Medicines of the newest signed prescription, with each one's course status. */
function RecentMedicines({ h, activeCount }: { h: MedicalHistory; activeCount: number }) {
  const today = istToday();
  const latest = signedRx(h).slice().sort((a, b) => String(rxDay(b)).localeCompare(String(rxDay(a))))[0];
  if (!latest) return <Muted>No prescriptions available.</Muted>;
  const rows = latest.items.map((item) => ({ item, course: courseOf(latest, item, today) }));
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {latest.rxNumber ?? "Prescription"} · {dayLabel(rxDay(latest))} · {latest.doctor?.name ?? "Doctor"}
        {` · ${activeCount} medicine${activeCount === 1 ? "" : "s"} within the prescribed duration across all prescriptions`}
      </Typography>
      {rows.length === 0 ? <Muted>Medication not needed.</Muted> : <MedicinesTable items={latest.items} prescribedBy={latest.doctor?.name ?? null} />}
      <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: "wrap" }}>
        {rows.map(({ item, course }) => (
          <Chip
            key={item.medicineName + (item.strength ?? "")}
            size="small"
            variant="outlined"
            color={course.status === "active" ? "success" : "default"}
            label={`${item.medicineName}: ${course.status === "active" ? `within prescribed duration, to ${dayLabel(course.end)}` : course.status === "completed" ? `prescribed course ended ${dayLabel(course.end)}` : "duration not specified"}`}
          />
        ))}
      </Stack>
    </Stack>
  );
}
