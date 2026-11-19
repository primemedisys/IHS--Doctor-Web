"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useMemo, useState, type ReactNode } from "react";
import { FiArrowLeft, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { Loading } from "@/components/feedback";
import { useOnboarding, useOwnProfile, useSubmitForVerification } from "../hooks";
import type { OnboardingStepKey, OwnDoctorProfile } from "@/types/doctor-portfolio";
import { StepShell } from "./StepShell";
import { VerificationBanner } from "./VerificationBanner";
import { ProfessionalStep } from "./steps/ProfessionalStep";
import { SpecialtiesStep } from "./steps/SpecialtiesStep";
import { PortfolioStep } from "./steps/PortfolioStep";
import { ClinicsStep } from "./steps/ClinicsStep";
import { AvailabilityStep } from "./steps/AvailabilityStep";
import { DocumentsStep } from "./steps/DocumentsStep";

interface StepDef {
  key: OnboardingStepKey;
  label: string;
  description: string;
  render: (profile: OwnDoctorProfile) => ReactNode;
}

/** One page per step. Verification documents come last so "Submit" sits at the end. */
const STEPS: StepDef[] = [
  { key: "professional", label: "Professional details", description: "Qualification, registration number, experience & bio", render: (p) => <ProfessionalStep profile={p} /> },
  { key: "specialties", label: "Specialties & languages", description: "What you treat and the languages you consult in", render: (p) => <SpecialtiesStep profile={p} /> },
  { key: "portfolio", label: "Portfolio", description: "Photo, education, services, awards, links & more", render: (p) => <PortfolioStep profile={p} /> },
  { key: "clinics", label: "Clinics", description: "Your in-person practice locations", render: () => <ClinicsStep /> },
  { key: "availability", label: "Availability", description: "Your consulting & video consultation hours", render: () => <AvailabilityStep /> },
  { key: "documents", label: "Verification documents", description: "Degree, ID and council registration", render: () => <DocumentsStep /> },
];

/**
 * The portfolio editor (dashboard → settings), presented as a step-by-step
 * wizard: a progress bar + clickable stepper up top, then a single step per
 * "page" with Back / Next, ending in "Submit for verification". Same step
 * components as the onboarding wizard, so edits stay consistent everywhere.
 */
export function PortfolioEditor() {
  const onboarding = useOnboarding();
  const profileQuery = useOwnProfile();
  const submit = useSubmitForVerification();
  const status = onboarding.data;
  const profile = profileQuery.data;

  // Land on the first incomplete step once the status loads.
  const firstIncomplete = useMemo(() => {
    if (!status) return 0;
    const idx = STEPS.findIndex((s) => !status.steps[s.key]);
    return idx === -1 ? 0 : idx;
  }, [status]);

  const [activeStep, setActiveStep] = useState(0);
  // Seed the wizard on the first incomplete step, once — the supported
  // "adjust state while rendering" pattern (no effect needed).
  const [seeded, setSeeded] = useState(false);
  if (status && !seeded) {
    setSeeded(true);
    setActiveStep(firstIncomplete);
  }

  if (onboarding.isLoading || profileQuery.isLoading) return <Loading label="Loading your profile…" />;
  if (!status || !profile) return null;

  const completedCount = STEPS.filter((s) => status.steps[s.key]).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const current = STEPS[activeStep];
  const isLast = activeStep === STEPS.length - 1;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Complete your profile
        </Typography>
        <Typography color="text.secondary">
          Work through each step, then submit for verification to go live.
        </Typography>
      </Box>

      <VerificationBanner status={status} slug={profile.slug} />

      {/* Progress bar + clickable stepper */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {completedCount} of {STEPS.length} steps complete
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
            {progress}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: (t) => `${t.tokens.radius.pill}px`, mb: 3 }} />

        <Stepper activeStep={activeStep} alternativeLabel nonLinear>
          {STEPS.map((step, index) => (
            <Step key={step.key} completed={Boolean(status.steps[step.key])}>
              <StepButton color="inherit" onClick={() => setActiveStep(index)}>
                {step.label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* The current step — one page at a time */}
      <StepShell title={current.label} description={current.description} complete={Boolean(status.steps[current.key])}>
        {current.render(profile)}
      </StepShell>

      {/* Wizard navigation */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Button
            startIcon={<FiArrowLeft />}
            disabled={activeStep === 0}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            sx={{ order: { xs: 2, sm: 0 } }}
          >
            Back
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ order: { xs: 0, sm: 1 } }}>
            Step {activeStep + 1} of {STEPS.length}
          </Typography>

          {isLast ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<FiCheckCircle />}
              disabled={!status.canSubmit || status.isSubmitted}
              loading={submit.isPending}
              onClick={() =>
                submit.mutate(undefined, {
                  onError: () => {
                    const fresh = onboarding.data;
                    if (fresh) {
                      const idx = STEPS.findIndex((s) => !fresh.steps[s.key]);
                      if (idx !== -1) setActiveStep(idx);
                    }
                  },
                })
              }
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {status.isSubmitted ? "Submitted" : "Submit for verification"}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="large"
              endIcon={<FiArrowRight />}
              onClick={() => setActiveStep((s) => Math.min(STEPS.length - 1, s + 1))}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              Next
            </Button>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
