"use client";

import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/config/site";

export interface LogoProps {
  /** Smaller mark for tight spaces (mobile bars, collapsed sidebars). */
  compact?: boolean;
  /** Kept for API compatibility — the white badge already reads on any surface. */
  onDark?: boolean;
  sx?: SxProps<Theme>;
  /** Override the rendered logo height in px (the mark is square). */
  size?: number;
}

/**
 * Brand lockup — the official IHS logo (`public/logo.png`), links to home. The
 * asset has a light background, so it sits inside a small white rounded badge
 * that reads cleanly on both light navbars and dark/hero surfaces.
 */
export function Logo({ compact = false, onDark = false, sx, size }: LogoProps) {
  void onDark; // the white badge guarantees contrast on any background
  const dim = size ?? (compact ? 32 : 42);
  return (
    <Box
      component={Link}
      href={ROUTES.home}
      aria-label={siteConfig.name}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "common.white",
        borderRadius: (t) => `${t.tokens.radius.sm}px`,
        p: 0.5,
        lineHeight: 0,
        ...sx,
      }}
    >
      <Image
        src="/logo.png"
        alt={siteConfig.name}
        width={dim}
        height={dim}
        priority
        // Height follows the width: the global `img { max-width: 100% }` can
        // narrow the mark (e.g. a collapsing sidebar), and a fixed height
        // would then distort it (and trip Next's aspect-ratio warning).
        style={{ width: dim, height: "auto", objectFit: "contain", display: "block" }}
      />
    </Box>
  );
}
