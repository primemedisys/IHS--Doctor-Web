"use client";

/**
 * Treatment Summary — signed prescriptions only, each attributed to the doctor
 * who wrote it (never to the viewing doctor).
 *
 * "Current" means ONE thing here: the medicine is still inside the duration the
 * prescriber wrote (see derive.courseOf). A medicine with no written duration
 * is "duration not specified", never "active". The record keeps no
 * discontinuation reason, so none is shown.
 *
 * The PDF button asks the existing endpoint; the server allows it for the
 * prescriber, or for another doctor only with the patient's medications grant.
 * A refusal is shown as a message — the button is a convenience, not the gate.
 */
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { prescriptionService } from "@/features/prescriptions/services/prescription.service";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory } from "../hooks";
import { dayLabel, istToday } from "../format";
import { MedicinesTable } from "../components/HistoryViews";
import { OthersHiddenLine } from "../components/RecordAccess";
import { RecordsFrame, Section, StatRow, Muted, Facts } from "./RecordsKit";
import { TimelinePanel } from "./TimelinePanel";
import { consultationOf, courseOf, type Course, medicineKey, rxDay, signedRx, specialtyOf, visitOf } from "./derive";
import type { EmrIdentity, HistoryRx, MedicalHistory } from "@/types/emr";

export function TreatmentSummaryPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="treatment-summary">
      {(ws) => <Body patientId={patientId} patient={ws.patient} />}
    </RecordsFrame>
  );
}

function Body({ patientId, patient }: { patientId: string; patient: EmrIdentity }) {
  const q = useMedicalHistory(patientId);
  if (q.isError) return <ErrorState title="Couldn't load the treatment history" description={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={120} />)}</Stack>;
  return <Loaded h={q.data} patientId={patientId} patient={patient} />;
}

type RxCourses = { item: HistoryRx["items"][number]; course: Course }[];
type RxEntry = { rx: HistoryRx; courses: RxCourses };

async function openPdf(rx: HistoryRx) {
  try {
    const blob = await prescriptionService.pdf(rx.id);
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${rx.rxNumber ?? `prescription-${rx.id}`}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
}

function Loaded({ h, patientId, patient }: { h: MedicalHistory; patientId: string; patient: EmrIdentity }) {
  const today = istToday();
  const all = useMemo(() => signedRx(h).slice().sort((a, b) => String(rxDay(b)).localeCompare(String(rxDay(a)))), [h]);
  const [doctor, setDoctor] = useState("");
  const doctors = [...new Set(all.map((r) => r.doctor?.name).filter((n): n is string => Boolean(n)))].sort();
  const list = all.filter((r) => !doctor || r.doctor?.name === doctor);

  const withCourse = list.map((rx) => ({ rx, courses: rx.items.map((item) => ({ item, course: courseOf(rx, item, today) })) }));
  const current = withCourse.filter((x) => x.courses.some((c) => c.course.status === "active"));
  const previous = withCourse.filter((x) => !current.includes(x));
  const activeMeds = new Set(all.flatMap((rx) => rx.items.filter((i) => courseOf(rx, i, today).status === "active").map(medicineKey)));
  const distinct = new Set(all.flatMap((rx) => rx.items.map(medicineKey)));
  const rxCapped = h.capped.prescriptions ? "+" : "";

  return (
    <Stack spacing={2}>
      <StatRow
        tone="green"
        stats={[
          { label: "Prescriptions", value: `${all.length}${rxCapped}` },
          { label: "Distinct medicines", value: String(distinct.size) },
          { label: "Within prescribed duration", value: String(activeMeds.size) },
          { label: "Prescribers", value: String(doctors.length) },
          { label: "Last prescribed", value: dayLabel(rxDay(all[0] ?? ({} as HistoryRx))) },
        ]}
      />
      <OthersHiddenLine category="medications" />
      {doctors.length > 1 && (
        <TextField fullWidth={false} select size="small" label="Prescribing doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)} sx={{ maxWidth: 240 }}>
          <MenuItem value="">All doctors</MenuItem>
          {doctors.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
      )}

      <Section title="Current treatment" hint="Prescriptions with a medicine still inside its written duration.">
        {current.length === 0 ? (
          <Muted>No prescription is currently within its prescribed duration.</Muted>
        ) : (
          <Stack spacing={1.25}>{current.map((x) => <RxCard key={x.rx.id} h={h} {...x} />)}</Stack>
        )}
      </Section>

      <Section title="Previous treatment" hint="Older prescriptions, newest first.">
        {previous.length === 0 ? (
          <Muted>No previous prescriptions available.</Muted>
        ) : (
          <PreviousList h={h} items={previous} capped={h.capped.prescriptions} />
        )}
      </Section>

      <Section title="Medicines the patient reports" hint="Patient-added, not a prescription.">
        {patient.currentMedications.length ? (
          <Stack spacing={0.25}>
            {patient.currentMedications.map((m) => (
              <Typography key={m.medicineName} variant="body2">
                {m.medicineName}{[m.dosage, m.frequency].filter(Boolean).length ? ` — ${[m.dosage, m.frequency].filter(Boolean).join(", ")}` : ""}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Muted>{patient.noCurrentMedications ? "None" : "Not provided"}</Muted>
        )}
      </Section>

      <Section title="Treatment timeline">
        <TimelinePanel patientId={patientId} defaultGroup="prescriptions" groups={["prescriptions", "followups"]} />
      </Section>
    </Stack>
  );
}

function PreviousList({ h, items, capped }: { h: MedicalHistory; items: RxEntry[]; capped: boolean }) {
  const [shown, setShown] = useState(8);
  return (
    <Stack spacing={1.25}>
      {items.slice(0, shown).map((x) => <RxCard key={x.rx.id} h={h} rx={x.rx} courses={x.courses} />)}
      {shown < items.length && (
        <Button onClick={() => setShown((n) => n + 8)} sx={{ alignSelf: "center" }}>Show older prescriptions ({items.length - shown} more)</Button>
      )}
      {capped && shown >= items.length && <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>Showing the most recent prescriptions.</Typography>}
    </Stack>
  );
}

function RxCard({ h, rx, courses }: { h: MedicalHistory; rx: HistoryRx; courses: RxCourses }) {
  const c = consultationOf(h, rx.bookingId);
  const v = visitOf(h, rx.bookingId);
  const structured = (c?.diagnoses ?? []).map((d) => d.title).filter((t): t is string => Boolean(t));
  const diagnosis = structured.length ? structured.join(", ") : rx.diagnosis ?? c?.rxDiagnosis ?? null;
  const prescriber = rx.doctor?.name ?? v?.doctor?.name ?? "Unknown doctor";
  const follow = c?.followUp;
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", transition: "box-shadow 150ms", "&:hover": { boxShadow: 1 } }}>
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75, px: 1.5, py: 1, bgcolor: "#E5F5E9", borderBottom: 1, borderColor: "#B8E3C5" }}>
        <Icon name="FiCheckCircle" size={16} />
        <Typography sx={{ fontWeight: 700, color: "#12643B" }}>{rx.rxNumber ?? `Prescription #${rx.id}`}</Typography>
        <Chip size="small" label={dayLabel(rxDay(rx))} sx={{ height: 20 }} />
        {c?.isMine && <Chip size="small" color="primary" variant="outlined" label="Your prescription" sx={{ height: 20 }} />}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<Icon name="FiDownload" />} onClick={() => void openPdf(rx)}>PDF</Button>
      </Stack>
      <Box sx={{ p: 1.5 }}>
        <Facts
          items={[
            { k: "Prescribed by", v: prescriber },
            { k: "Specialty", v: specialtyOf(v).join(", ") },
            { k: "Signed", v: rx.finalizedAt ? new Date(rx.finalizedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : null },
            { k: "Consultation", v: rx.bookingId ? `#${rx.bookingId}` : "Walk-in (no booked consultation)" },
            { k: "Related diagnosis", v: diagnosis },
            { k: "Follow-up", v: follow?.followUpOn ? `${dayLabel(follow.followUpOn)}${follow.note ? ` · ${follow.note}` : ""}` : null },
          ]}
        />
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.8 }}>Medicines</Typography>
        {rx.noMedication && !rx.items.length ? <Muted>Medication not needed.</Muted> : <MedicinesTable items={rx.items} prescribedBy={prescriber} />}
        <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: "wrap", mt: 0.75 }}>
          {courses.map(({ item, course }) => (
            <Chip
              key={item.medicineName + (item.strength ?? "")}
              size="small"
              variant="outlined"
              color={course.status === "active" ? "success" : "default"}
              label={`${item.medicineName}: ${course.status === "active" ? `within prescribed duration (${dayLabel(course.start)} – ${dayLabel(course.end)})` : course.status === "completed" ? `prescribed course ended ${dayLabel(course.end)}` : "duration not specified"}`}
            />
          ))}
        </Stack>
        {rx.advice && <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}><b>Advice:</b> {rx.advice}</Typography>}
      </Box>
    </Paper>
  );
}
