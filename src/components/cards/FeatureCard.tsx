"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { Icon } from "@/components/common/Icon";

export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  /** Optional step number, e.g. for "How it works". */
  step?: number;
  sx?: SxProps<Theme>;
}

/** Icon + title + copy block for feature/how-it-works sections. */
export function FeatureCard({ icon, title, description, step, sx }: FeatureCardProps) {
  return (
    <Stack spacing={1.5} sx={{ p: 1, ...sx }}>
      <Box
        sx={{
          position: "relative",
          display: "grid",
          placeItems: "center",
          width: 56,
          height: 56,
          borderRadius: (t) => `${t.tokens.radius.lg}px`,
          bgcolor: "grey.100",
          color: "primary.main",
        }}
      >
        <Icon name={icon} size={26} />
        {step != null && (
          <Box
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              minWidth: 22,
              height: 22,
              px: 0.5,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {step}
          </Box>
        )}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
}
