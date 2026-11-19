"use client";

import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import { SpecialtyCard } from "@/components/cards/SpecialtyCard";
import { SectionTitle } from "@/components/typography/SectionTitle";
import { ROUTES } from "@/constants/routes";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { specialties } from "@/data";
import { Section } from "./Section";

/** Grid of popular specialties, each linking to a filtered doctor search. */
export function PopularSpecialties() {
  return (
    <Section>
      <SectionTitle
        eyebrow="Browse"
        title="Popular specialties"
        subtitle="Jump straight to the right kind of care."
        action={
          <Button component={Link} href={ROUTES.findDoctor} variant="text">
            View all doctors
          </Button>
        }
      />
      <Grid container spacing={2}>
        {specialties.map((s) => (
          <Grid key={s.slug} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <SpecialtyCard
              name={s.name}
              icon={s.icon}
              doctorsCount={s.doctorsCount}
              href={`${ROUTES.findDoctor}?${SEARCH_PARAMS.specialty}=${s.slug}`}
            />
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}
