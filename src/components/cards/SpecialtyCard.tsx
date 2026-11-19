"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { cardHover } from "@/theme/styles";

export interface SpecialtyCardProps {
  name: string;
  icon: string;
  href: string;
  doctorsCount?: number;
}

/** Icon tile linking to a specialty-filtered doctor search. */
export function SpecialtyCard({ name, icon, href, doctorsCount }: SpecialtyCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        ...cardHover,
        // On hover, the icon tile darkens slightly — no colour flood, no scale.
        "&:hover .specialty-icon": {
          bgcolor: "grey.200",
        },
      }}
    >
      <CardActionArea component={Link} href={href} sx={{ height: "100%", p: 2.5 }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
          <Box
            className="specialty-icon"
            sx={{
              display: "grid",
              placeItems: "center",
              width: 52,
              height: 52,
              borderRadius: (t) => `${t.tokens.radius.lg}px`,
              bgcolor: "grey.100",
              color: "primary.main",
              transition: (t) =>
                t.transitions.create(["background-color", "color", "transform"], {
                  duration: t.tokens.duration.fast,
                }),
            }}
          >
            <Icon name={icon} size={24} />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {name}
          </Typography>
          {doctorsCount != null && (
            <Typography variant="caption" color="text.secondary">
              {doctorsCount}+ doctors
            </Typography>
          )}
        </Stack>
      </CardActionArea>
    </Card>
  );
}
