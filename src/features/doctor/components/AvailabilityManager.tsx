"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AvailabilityStep } from "./steps/AvailabilityStep";

/** Dashboard → Availability: per-clinic + online weekly hours and blocked dates. */
export function AvailabilityManager() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Availability
        </Typography>
        <Typography color="text.secondary">
          Set the hours you consult at each clinic, and a separate schedule for video
          consults. Patients book a DAY and take a token — they don&apos;t pick a time.
        </Typography>
      </Stack>
      <AvailabilityStep />
    </Stack>
  );
}
