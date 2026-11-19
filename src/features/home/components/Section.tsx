import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

/** Consistent vertical rhythm + centered container for home page sections. */
export function Section({
  children,
  tinted = false,
  sx,
}: {
  children: ReactNode;
  tinted?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      component="section"
      sx={{ py: { xs: 6, md: 9 }, bgcolor: tinted ? "background.paper" : "background.default", ...sx }}
    >
      <Container maxWidth="xl">{children}</Container>
    </Box>
  );
}
