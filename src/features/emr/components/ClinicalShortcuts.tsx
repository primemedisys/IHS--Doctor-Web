"use client";

/**
 * Four clinical shortcut cards under the patient header: Clinical Records,
 * Medical Reports, Diagnosis Records and Treatment Summary.
 *
 * A lens over data the Workbench already loads, never a second store:
 *   - the structured history (GET /doctor/emr/patients/:id/history), the same
 *     cached query Previous Consultations reads, so no extra request;
 *   - the patient's documents (GET /doctor/emr/patients/:id/documents), which
 *     only ever contain what this doctor may open.
 * Both are filtered by the server for consent, so a count can never include a
 * record the doctor cannot see. Every number is counted from those rows.
 *
 * Each card opens its own full page under /dashboard/workbench/patients/:id/
 * (clinical-records | medical-reports | diagnosis-records | treatment-summary).
 */
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { AccentTile, type AccentKey } from "@/components/common/AccentTile";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { documentGroupOf, documentKindLabel } from "@/features/records/documentKinds";
import { useMedicalHistory, usePatientDocuments } from "../hooks";
import { dayLabel, istToday } from "../format";
import { ROUTES } from "@/constants/routes";
import { currentMedicines } from "../records/derive";
import { pastConsultations } from "./PreviousVisits";
import { useRecordAccess } from "./RecordAccess";
import type { EmrIdentity, HistoryConsultation, HistoryRx, MedicalHistory, PatientDocument } from "@/types/emr";

// ── Counting (pure; every figure comes from the rows the server sent) ───────

const latest = (dates: (string | null | undefined)[]) =>
  dates.filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10)).sort().at(-1) ?? null;

/** Finalized prescriptions from earlier visits — never today's, never a draft. */
export function previousPrescriptions(h: MedicalHistory, currentBookingId: string | null): HistoryRx[] {
  return h.prescriptions.filter((rx) => rx.status === "finalized" && (rx.bookingId == null || rx.bookingId !== currentBookingId));
}

const rxDate = (rx: HistoryRx) => rx.visitDate ?? rx.finalizedAt?.slice(0, 10) ?? rx.createdAt?.slice(0, 10) ?? null;

/** The reports & documents a doctor reads here: everything except filed prescriptions. */
const reportDocs = (docs: PatientDocument[]) => docs.filter((d) => documentGroupOf(d) !== "prescriptions");

/** Entries recorded in a past consultation: complaints, examinations, diagnoses, tests, notes, vitals readings. */
const recordCount = (c: HistoryConsultation) =>
  c.complaints.length +
  c.examinations.length +
  (c.diagnoses?.length ?? 0) +
  (c.investigations?.length ?? 0) +
  (c.notes?.length ?? 0) +
  (c.consultationNotes?.length ?? 0) +
  c.vitals.length;

// ── Card ────────────────────────────────────────────────────────────────────

interface Stat { label: string; value: string }

/** The four shortcut accents map straight onto full-card pastel tones. */
const SHORTCUT_TONE: Partial<Record<AccentKey, CardTone>> = {
  purple: "purple",
  teal: "teal",
  orange: "orange",
  green: "green",
  red: "red",
  navy: "blue",
  grey: "gray",
  amber: "orange",
};

function ShortcutCard({
  title,
  icon,
  accent,
  description,
  stats,
  empty,
  footer,
  loading,
  error,
  onOpen,
  action,
}: {
  title: string;
  icon: string;
  accent: AccentKey;
  description: string;
  stats: Stat[];
  /** Shown instead of the figures when there is nothing to count. */
  empty: string | null;
  footer?: ReactNode;
  loading: boolean;
  error: boolean;
  onOpen: () => void;
  action: string;
}) {
  const card = CARD_TONES[SHORTCUT_TONE[accent] ?? "gray"];
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({
        borderRadius: `${t.tokens.radius.xl}px`,
        overflow: "hidden",
        minWidth: 0,
        display: "flex",
        bgcolor: card.bg,
        borderColor: card.border,
      })}
    >
      <ButtonBase
        onClick={onOpen}
        aria-label={`${title} — ${action}`}
        sx={(t) => ({
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          textAlign: "left",
          px: 2,
          pt: 1.75,
          pb: 1.5,
          minHeight: 184,
          transition: t.transitions.create(["background-color", "box-shadow"], { duration: 150 }),
          "&:hover": { bgcolor: "rgba(255,255,255,0.35)" },
          "&:hover .shortcut-arrow": { transform: "translateX(2px)" },
          "&.Mui-focusVisible": { boxShadow: `inset 0 0 0 2px ${card.fg}` },
        })}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
          <AccentTile icon={icon} accent={accent} size={34} iconSize={17} sx={{ bgcolor: "rgba(255,255,255,0.7)", color: card.fg }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, fontSize: 15, color: card.heading, lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", lineHeight: 1.35, color: card.fg }} noWrap>
              {description}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ flex: 1, mt: 1.25 }}>
          {loading ? (
            <Typography variant="body2" sx={{ color: card.fg }}>Loading…</Typography>
          ) : error ? (
            <Typography variant="body2" color="error">Couldn&apos;t load these records.</Typography>
          ) : empty ? (
            <Typography variant="body2" sx={{ color: card.fg }}>{empty}</Typography>
          ) : (
            <Box
              component="dl"
              sx={{
                m: 0,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                columnGap: 1.5,
                rowGap: 1,
                "& dt": { fontSize: 11.5, fontWeight: 600, color: card.fg, lineHeight: 1.35 },
                "& dd": { m: 0, mt: 0.25, fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: card.heading, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" },
              }}
            >
              {stats.map((s) => (
                <Box key={s.label} sx={{ minWidth: 0 }}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </Box>
              ))}
            </Box>
          )}
          {!loading && !error && footer ? <Box sx={{ mt: 1 }}>{footer}</Box> : null}
        </Box>

        <Divider sx={{ mt: 1.25, mb: 1, borderColor: card.border }} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: card.fg }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 12.5 }}>{action}</Typography>
          <Box className="shortcut-arrow" sx={{ display: "flex", transition: "transform 150ms" }}>
            <Icon name="FiArrowRight" size={14} />
          </Box>
        </Stack>
      </ButtonBase>
    </Paper>
  );
}

/** A small lock line on a card when some of that kind of record needs the patient's approval. */
function CardLock({ text }: { text: string }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
      <Icon name="FiLock" size={12} />
      <Typography variant="caption" color="text.secondary">{text}</Typography>
    </Stack>
  );
}

// ── The section ─────────────────────────────────────────────────────────────

export function ClinicalShortcuts({
  patientId,
  currentBookingId,
}: {
  patientId: string;
  currentBookingId: string | null;
  patient?: EmrIdentity;
}) {
  const router = useRouter();
  const history = useMedicalHistory(patientId);
  const docsQ = usePatientDocuments(patientId);
  const access = useRecordAccess();
  const go = (page: "clinical-dashboard" | "clinical-records" | "medical-reports" | "diagnosis-records" | "treatment-summary") => () =>
    router.push(ROUTES.dashboard.emrRecords(patientId, page, currentBookingId));

  const h = history.data;
  const hLoading = history.isLoading;
  const hError = history.isError;

  // 1. Clinical records — earlier visits only (never today's, upcoming or no-show).
  const past = h ? pastConsultations(h, currentBookingId) : [];
  const capped = h?.capped.consultations ? "+" : "";
  const rxs = h ? previousPrescriptions(h, currentBookingId) : [];
  const rxCapped = h?.capped.prescriptions ? "+" : "";
  const doctorCount = new Set(past.map((c) => c.visit.doctor?.id).filter(Boolean)).size;

  // 2. Reports — only documents this doctor may open (the server leaves out the rest).
  const reports = reportDocs(docsQ.data ?? []);
  const kinds = [...new Set(reports.map((d) => documentKindLabel(d)))];
  const reportsLocked = Boolean(access?.access && !access.granted("investigations"));

  // 3. Diagnoses — structured entries plus diagnoses written on older prescriptions.
  const dxRows = h ? [...h.diagnoses.map((d) => ({ visit: d.bookingId, date: d.visitDate ?? d.recordedOn ?? d.createdAt })), ...h.prescriptionDiagnoses.map((d) => ({ visit: d.bookingId, date: d.visitDate ?? d.date }))] : [];
  const dxCurrent = dxRows.filter((r) => currentBookingId != null && r.visit === currentBookingId).length;
  const dxLocked = Boolean(access?.access && !access.granted("diagnoses"));

  // 4. Treatment — signed prescriptions; "current" = inside the duration the prescriber wrote.
  const medicines = new Set(rxs.flatMap((rx) => rx.items.map((i) => `${i.medicineName.trim().toLowerCase()}|${(i.strength ?? "").replace(/\s+/g, "").toLowerCase()}`)));
  const currentMeds = h ? new Set(currentMedicines(h, istToday()).map((m) => m.item.medicineName.trim().toLowerCase())).size : 0;
  const medsLocked = Boolean(access?.access && !access.granted("medications"));

  return (
    <Box component="section" aria-label="Clinical summary">
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
        }}
      >
        <ShortcutCard
          title="Medical Records"
          icon="FiClipboard"
          accent="purple"
          description="Previous consultations and what was recorded"
          loading={hLoading}
          error={hError}
          empty={past.length ? null : "No Medical records available."}
          stats={[
            { label: "Previous consultations", value: `${past.length}${capped}` },
            { label: "Medical records", value: String(past.reduce((n, c) => n + recordCount(c), 0)) },
            { label: "Doctors involved", value: String(doctorCount) },
            { label: "Last consultation", value: past[0] ? dayLabel(past[0].visit.date) : "—" },
          ]}
          footer={past[0]?.visit.doctor?.name ? <Typography variant="caption" color="text.secondary">Last doctor: {past[0].visit.doctor.name}</Typography> : undefined}
          action="View clinical records"
          onOpen={go("clinical-dashboard")}
        />
        <ShortcutCard
          title="Medical Reports"
          icon="FiFileText"
          accent="teal"
          description="Lab reports, imaging and medical documents"
          loading={docsQ.isLoading}
          error={docsQ.isError}
          // Without the investigations grant the server returns only reports this
          // doctor filed, so "none uploaded" would not be true.
          empty={reports.length ? null : reportsLocked ? "No reports you can open yet." : "No medical reports uploaded."}
          stats={[
            { label: "Reports & documents", value: String(reports.length) },
            { label: "Latest report", value: dayLabel(latest(reports.map((d) => d.recordDate))) },
          ]}
          footer={
            <Stack spacing={0.75}>
              {kinds.length > 0 && (
                <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5 }}>
                  {kinds.slice(0, 3).map((k) => <Chip key={k} size="small" variant="outlined" label={k} sx={{ height: 22 }} />)}
                  {kinds.length > 3 && <Chip size="small" variant="outlined" label={`+${kinds.length - 3}`} sx={{ height: 22 }} />}
                </Stack>
              )}
              {reportsLocked && <CardLock text="Reports from the patient or other doctors need the patient's approval" />}
            </Stack>
          }
          action="View medical reports"
          onOpen={go("medical-reports")}
        />
        <ShortcutCard
          title="Diagnosis Records"
          icon="FiSearch"
          accent="orange"
          description="Current and previous diagnoses with ICD codes"
          loading={hLoading}
          error={hError}
          empty={dxRows.length ? null : "No diagnosis history available."}
          stats={[
            { label: "Total diagnoses", value: String(dxRows.length) },
            { label: "This consultation", value: String(dxCurrent) },
            { label: "Previous", value: String(dxRows.length - dxCurrent) },
            { label: "Latest diagnosis", value: dayLabel(latest(dxRows.map((r) => r.date))) },
          ]}
          footer={dxLocked ? <CardLock text="Other doctors' diagnoses need the patient's approval" /> : undefined}
          action="View diagnosis records"
          onOpen={go("diagnosis-records")}
        />
        <ShortcutCard
          title="Treatment Summary"
          icon="FiCheckCircle"
          accent="green"
          description="Previous prescriptions and medicines"
          loading={hLoading}
          error={hError}
          empty={rxs.length ? null : "No previous prescriptions available."}
          stats={[
            { label: "Previous prescriptions", value: `${rxs.length}${rxCapped}` },
            { label: "Distinct medicines", value: String(medicines.size) },
            { label: "Within prescribed duration", value: String(currentMeds) },
            { label: "Last prescribed", value: dayLabel(latest(rxs.map(rxDate))) },
          ]}
          footer={medsLocked ? <CardLock text="Other doctors' prescriptions need the patient's approval" /> : undefined}
          action="View treatment summary"
          onOpen={go("treatment-summary")}
        />
      </Box>
    </Box>
  );
}
