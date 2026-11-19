"use client";

import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import { StateCard } from "@/components/cards/StateCard";
import { SectionTitle } from "@/components/typography/SectionTitle";
import { ROUTES } from "@/constants/routes";
import { states } from "@/data";
import { Section } from "./Section";

const topStates = [...states].sort((a, b) => b.doctorsCount - a.doctorsCount).slice(0, 8);

/**
 * "Healthcare map" section — an interactive, clickable state grid. A true
 * geographic India SVG can replace the grid later; the click→filter wiring
 * (state code -> Find Doctor) is already in place via StateCard.
 */
export function HealthcareMapSection() {
  return (
    <Section tinted>
      <SectionTitle
        eyebrow="Explore India"
        title="Healthcare by state"
        subtitle="Discover doctors, hospitals and specialists near you."
        action={
          <Button component={Link} href={ROUTES.healthcareMap} variant="text">
            Open full map
          </Button>
        }
      />
      <Grid container spacing={2}>
        {topStates.map((state) => (
          <Grid key={state.code} size={{ xs: 6, sm: 4, md: 3 }}>
            <StateCard state={state} />
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}
