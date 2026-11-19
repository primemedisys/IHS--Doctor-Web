"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { ROUTES } from "@/constants/routes";
import { useOnboarding } from "../hooks";

const IN_SCOPE = ["professional", "specialties", "portfolio", "documents"] as const;

/**
 * Dashboard-home "complete your profile" card. Hidden once the profile is
 * submitted/approved; otherwise shows n/4 progress and links to the wizard.
 */
export function OnboardingNudge() {
  const { data: status } = useOnboarding();
  if (!status) return null;

  const done = IN_SCOPE.filter((k) => status.steps[k]).length;
  const total = IN_SCOPE.length;

  // Nothing to nudge once submitted or approved.
  if (status.isSubmitted || status.verificationStatus === "approved") return null;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Complete your profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {done} of {total} required steps done — finish up to get verified and go live.
          </Typography>
          <LinearProgress variant="determinate" value={(done / total) * 100} sx={{ height: 8, borderRadius: 4, maxWidth: 360 }} />
        </Box>
        <Button component={NextLink} href={ROUTES.dashboard.onboarding} variant="contained" endIcon={<FiArrowRight />}>
          {done === 0 ? "Get started" : "Continue"}
        </Button>
      </Stack>
    </Paper>
  );
}
