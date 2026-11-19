"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

/** Closing call-to-action band above the footer. */
export function ContactCTA() {
  return (
    <Box component="section" sx={{ py: { xs: 6, md: 9 } }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            borderRadius: (t) => `${t.tokens.radius.xl}px`,
            p: { xs: 4, md: 8 },
            textAlign: "center",
            bgcolor: "grey.50",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Stack spacing={2.5} sx={{ alignItems: "center" }}>
            <Typography variant="h3" component="h2" sx={{ maxWidth: 620 }}>
              Ready to find your doctor?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560, fontWeight: 400 }}>
              Start your search now, or reach out to our team with any questions.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button component={Link} href={ROUTES.findDoctor} size="large" variant="contained">
                Find a Doctor
              </Button>
              <Button component={Link} href={ROUTES.contact} size="large" variant="outlined">
                Contact us
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
