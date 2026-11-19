"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="h1" sx={{ fontWeight: 700, color: "text.primary" }}>
          404
        </Typography>
        <Typography variant="h5">Page not found</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </Typography>
        <Button component={Link} href={ROUTES.home} variant="contained" size="large">
          Back to home
        </Button>
      </Stack>
    </Box>
  );
}
