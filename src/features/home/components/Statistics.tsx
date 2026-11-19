"use client";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import { StatisticCard } from "@/components/cards/StatisticCard";
import { doctors, specialties, states } from "@/data";
import { formatCompactNumber } from "@/utils/format";
import { Section } from "./Section";

const totalDoctors = states.reduce((sum, s) => sum + s.doctorsCount, 0);
const avgRating = (doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length).toFixed(1);

const stats = [
  { icon: "FiUsers", value: `${formatCompactNumber(totalDoctors)}+`, label: "Verified doctors", color: "primary" as const },
  { icon: "FiActivity", value: `${specialties.length}+`, label: "Specialties", color: "secondary" as const },
  { icon: "FiMapPin", value: states.length, label: "States covered", color: "info" as const },
  { icon: "FiStar", value: avgRating, label: "Average rating", color: "warning" as const },
];

/** Platform trust statistics. */
export function Statistics() {
  return (
    <Section tinted>
      <Card
        variant="outlined"
        sx={{
          p: { xs: 1, md: 2 },
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Grid container>
          {stats.map((stat) => (
            <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
              <StatisticCard icon={stat.icon} value={stat.value} label={stat.label} color={stat.color} />
            </Grid>
          ))}
        </Grid>
      </Card>
    </Section>
  );
}
