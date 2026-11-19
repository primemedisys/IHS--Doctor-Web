"use client";

/**
 * The read-only medical-record history sections of the workbench (backend
 * migration 057): past history & long-term conditions, diagnoses,
 * prescriptions, tests and notes across ALL visits — the same structure and
 * the same data the patient sees on their Medical Record page.
 *
 * Every section reads the one history query. What another doctor recorded is
 * included by the server only for the categories the patient granted; the
 * one-line notice says when some of it is private and offers Request access.
 */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory } from "../hooks";
import { ConditionList, DiagnosisHistory, InvestigationHistory, MedicalHistoryList, NotesHistory, PrescriptionHistory } from "./HistoryViews";
import { OthersHiddenLine } from "./RecordAccess";
import { PatientDocumentsList } from "./PatientDocuments";
import type { EmrIdentity, MedicalHistory } from "@/types/emr";

function useHistory(patientId: string): { data: MedicalHistory | null; fallback: React.ReactNode } {
  const q = useMedicalHistory(patientId);
  if (q.isLoading) return { data: null, fallback: <Typography variant="body2" color="text.secondary">Loading…</Typography> };
  if (q.isError) return { data: null, fallback: <Alert severity="error">{getErrorMessage(q.error)}</Alert> };
  return { data: q.data ?? null, fallback: null };
}

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mb: 0.75 }}>{title}</Typography>
    {children}
  </Box>
);

export function MedicalHistorySection({ patientId, patient }: { patientId: string; patient: EmrIdentity }) {
  const { data, fallback } = useHistory(patientId);
  if (!data) return <>{fallback}</>;
  return (
    <Box>
      <OthersHiddenLine category="medical_history" />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" } }}>
        <Sub title="Past medical history">
          <MedicalHistoryList entries={data.medicalHistory} empty="No past medical history available." />
        </Sub>
        <Stack spacing={2}>
          <Sub title="Long-term conditions (recorded by doctors)">
            <ConditionList entries={data.longTermConditions} empty="No long-term conditions available." />
          </Sub>
          <Sub title="Conditions declared by the patient">
            {patient.conditions.length ? (
              <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5 }}>
                {patient.conditions.map((c) => (
                  <Chip key={c.name} size="small" variant="outlined" label={`${c.name}${c.diagnosedYear ? ` (${c.diagnosedYear})` : ""}`} />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">{patient.noKnownConditions ? "No known conditions" : "Not provided"}</Typography>
            )}
          </Sub>
        </Stack>
      </Box>
    </Box>
  );
}

export function DiagnosisHistorySection({ patientId }: { patientId: string }) {
  const { data, fallback } = useHistory(patientId);
  if (!data) return <>{fallback}</>;
  return (
    <Box>
      <OthersHiddenLine category="diagnoses" />
      <DiagnosisHistory h={data} empty="No previous diagnoses available." />
    </Box>
  );
}

export function PrescriptionHistorySection({ patientId, patient }: { patientId: string; patient: EmrIdentity }) {
  const { data, fallback } = useHistory(patientId);
  if (!data) return <>{fallback}</>;
  return (
    <Stack spacing={2}>
      <Sub title="Prescribed by doctors">
        <OthersHiddenLine category="medications" />
        <PrescriptionHistory prescriptions={data.prescriptions} capped={data.capped.prescriptions} empty="No previous prescriptions available." />
      </Sub>
      <Sub title="Prescription documents (uploaded or filed)">
        <PatientDocumentsList patientId={patientId} groups={["prescriptions"]} />
      </Sub>
      <Sub title="Medicines the patient says they take (not a prescription)">
        {patient.currentMedications.length ? (
          <Stack spacing={0.25}>
            {patient.currentMedications.map((m) => (
              <Typography key={m.medicineName} variant="body2">
                {m.medicineName}{[m.dosage, m.frequency].filter(Boolean).length ? ` — ${[m.dosage, m.frequency].filter(Boolean).join(", ")}` : ""}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">{patient.noCurrentMedications ? "None" : "Not provided"}</Typography>
        )}
      </Sub>
    </Stack>
  );
}

export function TestsHistorySection({ patientId }: { patientId: string }) {
  const { data, fallback } = useHistory(patientId);
  if (!data) return <>{fallback}</>;
  return (
    <Box>
      <OthersHiddenLine category="investigations" />
      <InvestigationHistory entries={data.investigations} empty="No previous tests available." />
      {/* The patient's uploaded reports, scans and other medical documents —
          only those the patient approved for you (or that you filed). */}
      <Box sx={{ mt: 1.5 }}>
        <PatientDocumentsList patientId={patientId} groups={["investigations", "other"]} />
      </Box>
    </Box>
  );
}

export function NotesHistorySection({ patientId }: { patientId: string }) {
  const { data, fallback } = useHistory(patientId);
  if (!data) return <>{fallback}</>;
  return (
    <Box>
      <OthersHiddenLine category="doctor_notes" />
      <NotesHistory notes={data.doctorNotes} legacy={data.consultationNotes} empty="No previous doctor notes available." />
    </Box>
  );
}
