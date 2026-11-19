"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ClinicsStep } from "./steps/ClinicsStep";

/** Dashboard → Clinics: the full clinics manager (same step, flat). */
export function ClinicsManager() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          My clinics
        </Typography>
        <Typography color="text.secondary">
          Manage the places you consult in person — each with its own address, fee and hours.
        </Typography>
      </Stack>
      <ClinicsStep />
    </Stack>
  );
}
