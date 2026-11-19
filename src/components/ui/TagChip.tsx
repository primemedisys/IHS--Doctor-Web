"use client";

import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import NextLink from "next/link";
import type { ReactElement } from "react";

export interface TagChipProps {
  label: string;
  href: string;
  icon?: ReactElement;
  color?: "default" | "primary" | "secondary";
  sx?: SxProps<Theme>;
}

/** A clickable tonal pill that links somewhere — used for symptoms, specialties and quick filters. */
export function TagChip({ label, href, icon, color = "default", sx }: TagChipProps) {
  return (
    <Chip
      component={NextLink}
      href={href}
      label={label}
      icon={icon}
      clickable
      variant="filled"
      sx={[
        (theme) => {
          const base = color === "default" ? theme.palette.text.primary : theme.palette[color].main;
          const light = theme.palette.mode === "light";
          const idleAlpha = color === "default" ? (light ? 0.06 : 0.1) : light ? 0.1 : 0.18;
          const hoverAlpha = color === "default" ? (light ? 0.12 : 0.16) : light ? 0.18 : 0.28;
          return {
            fontWeight: 600,
            color: color === "default" ? "text.primary" : `${color}.main`,
            bgcolor: alpha(base, idleAlpha),
            border: "1px solid",
            borderColor: color === "default" ? "divider" : "transparent",
            "& .MuiChip-icon": { color: "inherit" },
            "&:hover": { bgcolor: alpha(base, hoverAlpha) },
          };
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
