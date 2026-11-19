import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageContainer } from "@/components/common";
import { FeatureCard } from "@/components/cards";

const pillars = [
  {
    icon: "FiTarget",
    title: "Mission",
    description: "Help every patient discover verified doctors by symptom, specialty and location with confidence.",
  },
  {
    icon: "FiEye",
    title: "Vision",
    description: "A national healthcare discovery layer that makes trusted care easier to find across India.",
  },
  {
    icon: "FiShield",
    title: "Trust",
    description: "Prioritize verified profiles, transparent qualifications, clear availability and patient-friendly information.",
  },
];

const roadmap = ["Doctor discovery MVP", "Verified profile workflows", "AI-assisted symptom guidance", "Clinic and hospital integrations"];

export function AboutPageContent() {
  return (
    <PageContainer title="About IHS" subtitle="A healthcare discovery platform built around trust, access and clarity.">
      <Stack spacing={5}>
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" component="h1" sx={{ maxWidth: 820 }}>
            Building India&apos;s most trusted way to discover verified healthcare.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 760 }}>
            India Health System is not a hospital management product. It is a patient-first discovery experience
            designed to connect people with the right specialist, location and care context faster.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {pillars.map((pillar) => (
            <Grid key={pillar.title} size={{ xs: 12, md: 4 }}>
              <FeatureCard {...pillar} />
            </Grid>
          ))}
        </Grid>

        <Box>
          <Typography variant="h4" gutterBottom>
            Roadmap
          </Typography>
          <Grid container spacing={2}>
            {roadmap.map((item, index) => (
              <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
                  <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                    0{index + 1}
                  </Typography>
                  <Typography sx={{ mt: 1, fontWeight: 700 }}>{item}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>
    </PageContainer>
  );
}
