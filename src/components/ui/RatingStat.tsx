"use client";

import Box from "@mui/material/Box";
import Rating from "@mui/material/Rating";
import Typography from "@mui/material/Typography";

export interface RatingStatProps {
  value: number;
  count?: number;
  size?: "small" | "medium";
  /** Hide the star glyphs, show just "4.8 (312)". */
  compact?: boolean;
}

/** Read-only star rating with numeric value and optional review count. */
export function RatingStat({ value, count, size = "small", compact = false }: RatingStatProps) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      {!compact && <Rating value={value} precision={0.1} size={size} readOnly />}
      <Typography variant={size === "small" ? "body2" : "subtitle2"} sx={{ fontWeight: 700 }}>
        {value.toFixed(1)}
      </Typography>
      {count != null && (
        <Typography variant="caption" color="text.secondary">
          ({count})
        </Typography>
      )}
    </Box>
  );
}
