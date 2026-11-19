"use client";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { ComponentType } from "react";
import { BookAppointmentArt, ConsultArt, SearchDoctorArt } from "@/components/illustrations";
import { SectionTitle } from "@/components/typography/SectionTitle";
import { Section } from "./Section";

const steps: { art: ComponentType<{ sx?: object }>; title: string; description: string }[] = [
  {
    art: SearchDoctorArt,
    title: "Search",
    description: "Find the right doctor by symptom, specialty, name or your city — filter by fee, language and availability.",
  },
  {
    art: BookAppointmentArt,
    title: "Book",
    description: "Pick a video consult or visit a specific clinic, choose a slot, and pay online or at the clinic.",
  },
  {
    art: ConsultArt,
    title: "Consult",
    description: "Join over video or visit in person, then get a digital prescription saved to your health record.",
  },
];

/** Three-step explainer for how the platform works, with illustrated cards. */
export function HowItWorks() {
  return (
    <Section>
      <SectionTitle
        align="center"
        eyebrow="Simple & transparent"
        title="How it works"
        subtitle="Three steps from symptom to consultation."
      />
      <Grid container spacing={4}>
        {steps.map((step, i) => {
          const Art = step.art;
          return (
            <Grid key={step.title} size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: "center", px: { md: 2 } }}>
                <Box
                  sx={{
                    mb: 2,
                    borderRadius: (t) => `${t.tokens.radius.xl}px`,
                    bgcolor: "grey.50",
                    p: { xs: 2, md: 3 },
                  }}
                >
                  <Art sx={{ maxWidth: 260, mx: "auto" }} />
                </Box>
                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", fontWeight: 700 }}
                >
                  Step {i + 1}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 320, mx: "auto" }}>
                  {step.description}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Section>
  );
}
