"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { Logo } from "@/components/common/Logo";
import { footerNav, siteConfig } from "@/config/site";

/** Site footer with brand blurb, grouped links and copyright. */
export function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: "background.paper", borderTop: 1, borderColor: "divider", mt: "auto" }}>
      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2} sx={{ maxWidth: 360 }}>
              <Logo />
              <Typography variant="body2" color="text.secondary">
                {siteConfig.description}
              </Typography>
            </Stack>
          </Grid>

          {footerNav.map((group) => (
            <Grid key={group.title} size={{ xs: 6, md: 3 }}>
              <Typography variant="overline" color="text.secondary">
                {group.title}
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {group.items.map((item) => (
                  <Link key={item.href} component={NextLink} href={item.href} color="text.primary" variant="body2">
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
