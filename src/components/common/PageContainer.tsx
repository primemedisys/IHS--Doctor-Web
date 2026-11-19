import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { PageTitle } from "@/components/typography/PageTitle";

export interface PageContainerProps {
  title?: string;
  subtitle?: string;
  /** Right-aligned actions rendered next to the title (e.g. a "New" button). */
  actions?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | false;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Standard page wrapper: constrains width, applies responsive vertical rhythm
 * and renders an optional page header. Every dashboard page composes this so
 * spacing/margins are identical app-wide.
 */
export function PageContainer({
  title,
  subtitle,
  actions,
  maxWidth = "xl",
  children,
  sx,
}: PageContainerProps) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: { xs: 2, md: 3 }, ...sx }}>
      {title && (
        <Box sx={{ mb: 3 }}>
          <PageTitle title={title} subtitle={subtitle} actions={actions} />
        </Box>
      )}
      {children}
    </Container>
  );
}
