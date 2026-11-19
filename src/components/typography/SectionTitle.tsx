import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export interface SectionTitleProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Right-aligned action (e.g. "View all"); only in left alignment. */
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

/** Consistent heading block for landing/page sections. */
export function SectionTitle({ eyebrow, title, subtitle, align = "left", action, sx }: SectionTitleProps) {
  const centered = align === "center";
  return (
    <Stack
      direction={{ xs: "column", sm: action && !centered ? "row" : "column" }}
      spacing={2}
      sx={{
        mb: { xs: 3, md: 4 },
        alignItems: centered ? "center" : action ? { sm: "flex-end" } : "flex-start",
        justifyContent: action ? "space-between" : undefined,
        textAlign: centered ? "center" : "left",
        ...sx,
      }}
    >
      <Box sx={{ maxWidth: centered ? 640 : undefined, mx: centered ? "auto" : undefined }}>
        {eyebrow && (
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h3" component="h2" sx={{ mt: eyebrow ? 0.5 : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && !centered && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}
