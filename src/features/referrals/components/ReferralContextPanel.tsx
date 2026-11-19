"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FiFileText } from "react-icons/fi";
import { ErrorState, Loading } from "@/components/feedback";
import { RxPdfPreviewDialog } from "@/features/prescriptions";
import { useReferralCase, useReferralCasePdf } from "../hooks";
import type { IncomingReferral, ReferralCasePrescription } from "@/types/referral";
import type { ClinicalNote } from "@/types/appointment";

/** The six note fields in the order the doctor records them. */
type NoteTextKey = "complaints" | "onExamination" | "historyMedical" | "historySurgical" | "diagnosis" | "treatment";
const NOTE_FIELDS: { key: NoteTextKey; label: string }[] = [
  { key: "complaints", label: "Complaints (C/O)" },
  { key: "onExamination", label: "On examination (O/E)" },
  { key: "historyMedical", label: "History — Medical" },
  { key: "historySurgical", label: "History — Surgical" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "treatment", label: "Treatment" },
];
const NOTE_VITALS: { key: keyof ClinicalNote["vitals"]; label: string }[] = [
  { key: "bloodPressure", label: "BP" },
  { key: "pulseRateBpm", label: "Pulse" },
  { key: "weightKg", label: "Weight" },
  { key: "heightCm", label: "Height" },
  { key: "temperatureF", label: "Temp °F" },
  { key: "spo2Percent", label: "SpO₂" },
];

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const firstName = (name: string | null | undefined) =>
  (name ?? "the doctor").replace(/^dr\.?\s+/i, "").split(/\s+/)[0];

/**
 * The ONE thing a referred consultation has that an ordinary one doesn't: who
 * sent the patient, why, and what that doctor already prescribed and recorded.
 * Everything else about consulting the patient (facts, description, prescribe,
 * refer onward, complete) is the ordinary appointment flow this panel mounts
 * inside — so the referral screen is the appointment screen plus this context.
 */
export function ReferralContextPanel({ referral }: { referral: IncomingReferral }) {
  const { data, isLoading, isError, refetch } = useReferralCase(referral.id);
  const [rxOpen, setRxOpen] = useState(false);
  const pdf = useReferralCasePdf(referral.id, rxOpen);

  const fromName = referral.fromDoctor?.name ?? "The referring doctor";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: (t) => `${t.tokens.radius.md}px`,
        bgcolor: "action.hover",
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      {/* Who referred + why */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <Avatar src={referral.fromDoctor?.photo ?? undefined} sx={{ width: 40, height: 40 }}>
          {fromName.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Referred to you by
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {fromName}
            {referral.fromDoctor?.specialization ? ` · ${referral.fromDoctor.specialization}` : ""}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip size="small" variant="outlined" label={fmtDate(referral.createdAt)} />
      </Stack>

      <Label>Reason for referral</Label>
      <Typography variant="body2" sx={{ mb: referral.note ? 1.5 : 0 }}>
        {referral.reason}
      </Typography>
      {referral.note && (
        <>
          <Label>Note to you</Label>
          <Typography variant="body2">{referral.note}</Typography>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      {isLoading ? (
        <Loading label="Loading the shared case…" />
      ) : isError || !data ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Stack spacing={2}>
          {/* The referring doctor's prescription */}
          <Box>
            <Label>{firstName(fromName)}&apos;s prescription</Label>
            {data.prescription ? (
              <PrescriptionBlock rx={data.prescription} onViewPdf={() => setRxOpen(true)} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No prescription was issued for that consultation.
              </Typography>
            )}
          </Box>

          {/* The referring doctor's notes */}
          <Box>
            <Label>
              {firstName(fromName)}&apos;s notes ({data.reports.length})
            </Label>
            {data.reports.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No consultation notes were recorded.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {data.reports.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      {data?.prescription && (
        <RxPdfPreviewDialog
          open={rxOpen}
          onClose={() => setRxOpen(false)}
          title={`Prescription · ${data.prescription.rxNumber ?? ""}`}
          blob={pdf.data}
          isLoading={pdf.isLoading}
          isError={pdf.isError}
          onRetry={() => pdf.refetch()}
          fileName={`${data.prescription.rxNumber ?? "prescription"}.pdf`}
        />
      )}
    </Box>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, display: "block", mb: 0.5 }}
    >
      {children}
    </Typography>
  );
}

function PrescriptionBlock({ rx, onViewPdf }: { rx: ReferralCasePrescription; onViewPdf: () => void }) {
  return (
    <Box sx={{ p: 1.75, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: (t) => `${t.tokens.radius.md}px`, bgcolor: "background.paper" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
        <Box>
          {rx.rxNumber && (
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {rx.rxNumber}
            </Typography>
          )}
          {rx.diagnosis && (
            <Typography variant="caption" color="text.secondary">
              Dx: {rx.diagnosis}
            </Typography>
          )}
        </Box>
        <Button size="small" variant="outlined" startIcon={<FiFileText size={14} />} onClick={onViewPdf} sx={{ textTransform: "none", fontWeight: 700 }}>
          View PDF
        </Button>
      </Stack>
      {rx.items.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {rx.items.map((it, i) => (
            <Typography key={i} variant="body2">
              • <b>{it.medicineName}</b>
              {it.dosage ? ` — ${it.dosage}` : ""}
              {it.frequency ? ` · ${it.frequency}` : ""}
              {it.durationDays ? ` · ${it.durationDays} days` : ""}
            </Typography>
          ))}
        </Stack>
      )}
      {rx.advice && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
          Advice: {rx.advice}
        </Typography>
      )}
    </Box>
  );
}

function NoteCard({ note }: { note: ClinicalNote }) {
  const rows = NOTE_FIELDS.filter((f) => {
    const v = note[f.key];
    return typeof v === "string" && v.trim() !== "";
  });
  const vitals = NOTE_VITALS.map((f) => ({ label: f.label, value: note.vitals?.[f.key] })).filter(
    (v) => v.value !== null && v.value !== undefined && String(v.value).trim() !== "",
  );

  return (
    <Box sx={{ p: 1.75, borderRadius: (t) => `${t.tokens.radius.md}px`, bgcolor: "background.paper", border: (t) => `1px solid ${t.palette.divider}` }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: rows.length || vitals.length ? 1 : 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {fmtDate(note.date)}
        </Typography>
        {note.doctorName && <Chip size="small" variant="outlined" label={note.doctorName} />}
      </Stack>
      {rows.length > 0 && (
        <>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={1}>
            {rows.map((f) => (
              <Box key={f.key}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {f.label}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {note[f.key]}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}
      {vitals.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: rows.length > 0 ? 1.5 : 0 }} useFlexGap>
          {vitals.map((v) => (
            <Chip key={v.label} size="small" variant="outlined" label={`${v.label}: ${v.value}`} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
