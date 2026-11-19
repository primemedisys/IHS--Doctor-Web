"use client";

/**
 * "Save & Generate Prescription" — the last step of the current consultation.
 *
 * The Workbench is the single source of truth for the prescription, so this:
 *   1. saves every section's typed-but-unsaved input (UnsavedWork) through that
 *      section's own save path — a failure stops here and keeps the input;
 *   2. re-reads the SAVED consultation from the server and checks what a
 *      prescription needs (chief complaint, diagnosis, a medication decision);
 *   3. refreshes this visit's ONE prescription draft from the Workbench
 *      (POST /doctor/prescriptions/:id/sync-workbench — idempotent);
 *   4. opens it for review and signing.
 * It never creates a second prescription: the draft is the visit's existing
 * one (the Medication Order writes it), an already-signed one is just opened,
 * and a second click while running is ignored.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { queryKeys } from "@/constants/queryKeys";
import { getErrorMessage } from "@/utils/error";
import { prescriptionService } from "@/features/prescriptions/services/prescription.service";
import type { Prescription } from "@/types/prescription";
import { emrService } from "../services/emr.service";
import { emrKeys } from "../hooks";
import { useUnsavedRegistry } from "./UnsavedWork";

interface Missing {
  label: string;
  hint: string;
  sectionId: string;
}

type Step = "idle" | "saving" | "checking" | "generating";
const STEP_LABEL: Record<Step, string> = {
  idle: "Save & Generate Prescription",
  saving: "Saving the consultation…",
  checking: "Checking the saved record…",
  generating: "Generating the prescription…",
};

/** The visit's live prescription, or null when it has none yet (a 404 is the answer, not an error). */
async function visitPrescription(bookingId: string): Promise<Prescription | null> {
  try {
    return await prescriptionService.getByBooking(bookingId);
  } catch (e) {
    if (e instanceof AxiosError && e.response?.status === 404) return null;
    throw e;
  }
}

export function GeneratePrescription({
  patientId,
  bookingId,
  canRecord,
  onJump,
}: {
  patientId: string;
  bookingId: string | null;
  canRecord: boolean;
  onJump: (sectionId: string) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const registry = useUnsavedRegistry();
  const running = useRef(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<{ message: string; sectionId?: string } | null>(null);
  const [missing, setMissing] = useState<Missing[]>([]);

  const run = async () => {
    if (!bookingId || running.current) return; // a second click while running does nothing
    running.current = true;
    setError(null);
    setMissing([]);
    try {
      // 1. Save typed-but-unsaved input, one section at a time.
      setStep("saving");
      for (const entry of registry?.list() ?? []) {
        try {
          await entry.flush();
        } catch (e) {
          setError({ message: getErrorMessage(e), sectionId: entry.sectionId });
          onJump(entry.sectionId);
          return;
        }
      }
      qc.invalidateQueries({ queryKey: emrKeys.all });

      // 2. What a prescription needs, read back from the SAVED record.
      setStep("checking");
      const [complaints, diagnoses, rx] = await Promise.all([
        emrService.entries(patientId, { kind: "complaint", bookingId }),
        emrService.entries(patientId, { kind: "diagnosis", bookingId }),
        visitPrescription(bookingId),
      ]);
      const ofThisVisit = (rows: { bookingId: string | null; status: string }[]) =>
        rows.some((r) => r.bookingId === bookingId && r.status === "active");

      if (rx?.status === "finalized") {
        toast.info(`This consultation's prescription ${rx.rxNumber ?? ""} is already signed — opening it. Amend it to change anything.`);
        router.push(ROUTES.dashboard.prescription(rx.id));
        return;
      }

      const gaps: Missing[] = [];
      if (!ofThisVisit(complaints)) gaps.push({ label: "Chief Complaint", hint: "Add at least one complaint.", sectionId: "emr-section-complaint" });
      if (!ofThisVisit(diagnoses)) gaps.push({ label: "Diagnosis", hint: "Add at least one diagnosis (with its ICD code where it applies).", sectionId: "emr-section-diagnosis" });
      if (!rx || (!rx.items.length && !rx.noMedication)) {
        gaps.push({ label: "Medication Order", hint: "Save the medicines, or tick “Medication not needed”.", sectionId: "emr-section-medication" });
      }
      if (gaps.length || !rx) {
        setMissing(gaps);
        if (gaps[0]) onJump(gaps[0].sectionId);
        return;
      }

      // 3. Refresh the visit's one draft from the saved Workbench record.
      setStep("generating");
      const fresh = await prescriptionService.syncWorkbench(rx.id);
      qc.setQueryData(queryKeys.prescriptions.detail(rx.id), fresh);
      qc.invalidateQueries({ queryKey: queryKeys.prescriptions.byBooking(bookingId) });

      // 4. Only now — after every save succeeded — open it.
      toast.success("Consultation saved — prescription generated");
      router.push(ROUTES.dashboard.prescription(rx.id));
    } catch (e) {
      setError({ message: getErrorMessage(e) });
    } finally {
      running.current = false;
      setStep("idle");
    }
  };

  const busy = step !== "idle";
  const disabled = !bookingId || !canRecord;

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Save and generate prescription"
      sx={(t) => ({ p: { xs: 1.5, md: 2 }, borderRadius: `${t.tokens.radius.xl}px`, bgcolor: t.tokens.surface.subtle })}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "center" } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
            Finish the consultation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {disabled
              ? "Available on a confirmed or completed visit with you."
              : "Saves everything above, then builds the prescription from this consultation — complaint, findings, diagnosis, vitals, investigations, medicines, published advice and follow-up. Nothing is typed twice."}
          </Typography>
        </Box>
        <Button
          size="large"
          variant="contained"
          disabled={disabled || busy}
          onClick={() => void run()}
          startIcon={<Icon name={busy ? "FiLoader" : "FiFileText"} />}
          sx={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {STEP_LABEL[step]}
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mt: 1.5 }}
          action={error.sectionId ? <Button color="inherit" size="small" onClick={() => onJump(error.sectionId ?? "")}>Go to section</Button> : undefined}
        >
          Not generated — {error.message} Your entries are kept.
        </Alert>
      )}
      {missing.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Complete these before the prescription is generated:</Typography>
          <Stack spacing={0.5}>
            {missing.map((m) => (
              <Stack key={m.label} direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="body2"><b>{m.label}</b> — {m.hint}</Typography>
                <Button size="small" onClick={() => onJump(m.sectionId)}>Go to {m.label}</Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}
    </Paper>
  );
}
