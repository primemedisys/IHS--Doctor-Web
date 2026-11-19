"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { Icon } from "@/components/common/Icon";

export interface StatisticCardProps {
  icon: string;
  value: string | number;
  label: string;
  color?: "primary" | "secondary" | "success" | "info" | "warning";
  sx?: SxProps<Theme>;
}

/** Compact KPI tile for the "platform statistics" section. */
export function StatisticCard({ icon, value, label, color = "primary", sx }: StatisticCardProps) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", p: 3, ...sx }}>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 56,
          height: 56,
          borderRadius: (t) => `${t.tokens.radius.lg}px`,
          bgcolor: "grey.100",
          color: `${color}.main`,
        }}
      >
        <Icon name={icon} size={26} />
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
