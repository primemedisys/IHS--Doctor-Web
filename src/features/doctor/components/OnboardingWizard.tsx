"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepContent from "@mui/material/StepContent";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FiCheckCircle, FiCircle, FiLock } from "react-icons/fi";
import { EmptyState, Loading } from "@/components/feedback";
import { PageContainer } from "@/components/common";
import { ROUTES } from "@/constants/routes";
import { useOnboarding, useOwnProfile, useSubmitForVerification } from "../hooks";
import type { OnboardingStepKey, OwnDoctorProfile } from "@/types/doctor-portfolio";
import { ProfessionalStep } from "./steps/ProfessionalStep";
import { SpecialtiesStep } from "./steps/SpecialtiesStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { VerificationBanner } from "./VerificationBanner";

interface StepDef {
  key: OnboardingStepKey;
  label: string;
  description: string;
  render: (profile: OwnDoctorProfile) => React.ReactNode;
}

/**
 * The three steps that gate verification — mirrors ONBOARDING_REQUIRED_STEPS in
 * the backend, which is authoritative. These are what an admin needs in order to
 * make a decision: who you are, what you practise, and the paperwork proving it.
 */
const STEPS: StepDef[] = [
  { key: "professional", label: "Professional details", description: "Qualification, registration number, experience", render: (p) => <ProfessionalStep profile={p} /> },
  { key: "specialties", label: "Specialties & languages", description: "What you treat and the languages you consult in", render: (p) => <SpecialtiesStep profile={p} /> },
  { key: "documents", label: "Documents", description: "Degree, ID and council registration for verification", render: () => <DocumentsStep /> },
];

/**
 * Everything that shapes how the practice LOOKS and RUNS, rather than proving
 * it is legitimate. Not a submission gate — edited in the Portfolio hub, before
 * or after verification. Still tracked here so the doctor can see what is left.
 */
const IN_PORTFOLIO: { key: OnboardingStepKey; label: string; description: string }[] = [
  { key: "portfolio", label: "Portfolio", description: "Photo, bio, education, services and links" },
  { key: "clinics", label: "Clinics", description: "Your practice locations" },
  { key: "availability", label: "Availability", description: "Consulting & video hours" },
];

const DEFERRED = [
  { label: "Bank details", description: "Where your payouts land" },
];

/** The completeness-driven onboarding wizard (frontend-plan.md §6.1). */
export function OnboardingWizard() {
  const onboarding = useOnboarding();
  const profileQuery = useOwnProfile();
  const submit = useSubmitForVerification();

  const status = onboarding.data;
  const profile = profileQuery.data;

  const firstIncomplete = useMemo(() => {
    if (!status) return 0;
    const idx = STEPS.findIndex((s) => !status.steps[s.key]);
    return idx === -1 ? STEPS.length - 1 : idx;
  }, [status]);

  // Open the first incomplete step once the status loads, and re-open it
  // whenever it moves (e.g. after saving a step). Adjust-state-during-render —
  // React's recommended alternative to a sync useEffect, which the lint config
  // rejects as a cascading render.
  const [activeStep, setActiveStep] = useState(firstIncomplete);
  const [seenFirstIncomplete, setSeenFirstIncomplete] = useState(firstIncomplete);
  if (firstIncomplete !== seenFirstIncomplete) {
    setSeenFirstIncomplete(firstIncomplete);
    setActiveStep(firstIncomplete);
  }

  if (onboarding.isLoading || profileQuery.isLoading) {
    return <PageContainer><Loading label="Loading your onboarding…" /></PageContainer>;
  }
  if (!status || !profile) {
    return (
      <PageContainer maxWidth="md">
        <EmptyState icon="FiAlertCircle" title="Couldn't load onboarding" description="Please refresh and try again." />
      </PageContainer>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Complete your profile
        </Typography>
        <Typography color="text.secondary">
          Finish the required steps, then submit for verification to go live.
        </Typography>
      </Box>

      <VerificationBanner status={status} slug={profile.slug} />

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 } }}>
        <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
          {STEPS.map((step, index) => (
            <Step key={step.key} completed={Boolean(status.steps[step.key])} active={activeStep === index}>
              <StepLabel
                onClick={() => setActiveStep(index)}
                sx={{ cursor: "pointer" }}
                optional={<Typography variant="caption" color="text.secondary">{step.description}</Typography>}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ py: 1 }}>{step.render(profile)}</Box>
              </StepContent>
            </Step>
          ))}

          {DEFERRED.map((d) => (
            <Step key={d.label} active={false} completed={false} disabled>
              <StepLabel
                icon={<FiLock />}
                optional={<Typography variant="caption" color="text.secondary">{d.description} · coming soon</Typography>}
                sx={{ opacity: 0.6 }}
              >
                {d.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Ready to go live?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {status.canSubmit
                ? "All required steps are complete. Submit for admin verification."
                : "Complete every required step above to enable submission."}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            disabled={!status.canSubmit || status.isSubmitted}
            loading={submit.isPending}
            onClick={() =>
              submit.mutate(undefined, {
                onError: () => {
                  // Backend rejected as incomplete — jump to the first missing step.
                  const fresh = onboarding.data;
                  if (fresh) {
                    const idx = STEPS.findIndex((s) => !fresh.steps[s.key]);
                    if (idx !== -1) setActiveStep(idx);
                  }
                },
              })
            }
          >
            {status.isSubmitted ? "Submitted" : "Submit for verification"}
          </Button>
        </Stack>
      </Paper>

      {/* Not gates — the rest of the profile, managed in the Portfolio hub.
          Shown here so "what's left" stays answerable from one page, and so a
          doctor who submits early still knows what remains before going live. */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Your public profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Not required for verification — you can complete these any time from the Portfolio page.
          They decide how patients see you once you are live.
        </Typography>
        <Stack spacing={1} sx={{ mb: 2 }}>
          {IN_PORTFOLIO.map((item) => {
            const done = Boolean(status.steps[item.key]);
            return (
              <Stack key={item.key} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ display: "grid", placeItems: "center", color: done ? "success.main" : "text.disabled" }}>
                  {done ? <FiCheckCircle size={17} /> : <FiCircle size={17} />}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
        <Button component={Link} href={ROUTES.dashboard.portfolio} variant="outlined">
          Go to Portfolio
        </Button>
      </Paper>
    </Stack>
  );
}
