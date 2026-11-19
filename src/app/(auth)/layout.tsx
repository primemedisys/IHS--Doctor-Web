"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { FiCalendar, FiShield, FiStar, FiTrendingUp } from "react-icons/fi";
import { Logo } from "@/components/common/Logo";
/**
 * Value props shown on the brand panel. Doctor-facing (this is the practitioner
 * portal) — framed around trust, bookings and reach rather than patient search.
 */
const highlights = [
  {
    icon: <FiShield />,
    title: "Verified & trusted",
    body: "Your medical-council registration is checked, so patients book with confidence.",
  },
  {
    icon: <FiCalendar />,
    title: "Bookings, one place",
    body: "Manage video and in-clinic appointments from a single dashboard.",
  },
  {
    icon: <FiTrendingUp />,
    title: "Grow your reach",
    body: "Get discovered by patients searching by symptom, specialty and city.",
  },
];

const stats = [
  { value: "1,200+", label: "Verified doctors" },
  { value: "80k+", label: "Consultations" },
  { value: "4.9", label: "Avg. rating" },
];

/** Split-screen auth shell: a branded navy panel beside the form area. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex" }}>
      {/* Brand panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 4,
          width: { md: "46%", lg: "42%" },
          p: { md: 5, lg: 7 },
          color: "primary.contrastText",
          bgcolor: "primary.main",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Logo onDark />
        </Box>

        <Stack spacing={4} sx={{ position: "relative", maxWidth: 440 }}>
          <Box>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                mb: 2.5,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              <FiStar size={13} /> For medical professionals
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
              Your practice, online — trusted across India.
            </Typography>
          </Box>

          <Stack spacing={2.25}>
            {highlights.map((h) => (
              <Stack key={h.title} direction="row" spacing={2}>
                <Box
                  sx={{
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  {h.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{h.title}</Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                    {h.body}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Box sx={{ position: "relative" }}>
          <Stack
            direction="row"
            divider={<Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.18)" }} />}
            spacing={3}
            sx={{ mb: 3 }}
          >
            {stats.map((s) => (
              <Box key={s.label}>
                <Typography sx={{ fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
            © {new Date().getFullYear()} India Health System
          </Typography>
        </Box>
      </Box>

      {/* Form area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", bgcolor: "background.default", overflowY: "auto" }}>        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 4 }}>
          <Box sx={{ width: "100%", maxWidth: 440 }}>
            <Box sx={{ display: { md: "none" }, mb: 3 }}>
              <Logo />
            </Box>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
