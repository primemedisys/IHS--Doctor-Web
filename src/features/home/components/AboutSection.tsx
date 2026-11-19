"use client";

import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiEye, FiTarget } from "react-icons/fi";
import { Box } from "@mui/material";
import { SectionTitle } from "@/components/typography/SectionTitle";
import { Section } from "./Section";

const pillars = [
  {
    icon: <FiTarget />,
    title: "Our mission",
    body: "Build India's most trusted digital healthcare discovery platform, where every patient can find verified doctors by symptom, specialty and location.",
  },
  {
    icon: <FiEye />,
    title: "Our vision",
    body: "A connected national healthcare ecosystem that makes quality care discoverable, transparent and accessible for everyone.",
  },
];

/** Brief mission/vision band linking to the full About page. */
export function AboutSection() {
  return (
    <Section>
      <SectionTitle eyebrow="Why IHS" title="Healthcare discovery you can trust" />
      <Grid container spacing={4}>
        {pillars.map((p) => (
          <Grid key={p.title} size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={2}>
              <Box
                sx={{
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  width: 48,
                  height: 48,
                  borderRadius: (t) => `${t.tokens.radius.md}px`,
                  bgcolor: "grey.100",
                  color: "primary.main",
                }}
              >
                {p.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {p.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  {p.body}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}
