"use client";

import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { SectionTitle } from "@/components/typography/SectionTitle";
import { ROUTES } from "@/constants/routes";
import { doctors } from "@/data";

import { Section } from "./Section";

const featured = [...doctors].sort((a, b) => b.rating - a.rating).slice(0, 6);

/** Highest-rated doctors, six at a time. */
export function TopSpecialists() {
  return (
    <Section>
      <SectionTitle
        eyebrow="Trusted by patients"
        title="Top specialists"
        subtitle="Highly rated, verified doctors across India."
        action={
          <Button component={Link} href={ROUTES.findDoctor} variant="text">
            View all
          </Button>
        }
      />
      <Grid container spacing={3}>
        {featured.map((doctor) => (
          <Grid key={doctor.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <DoctorCard doctor={doctor} />
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}
