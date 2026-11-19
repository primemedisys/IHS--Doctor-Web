import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";

export interface MainLayoutProps {
  children: ReactNode;
  /** Let the hero sit under a transparent navbar (Home). */
  transparentNav?: boolean;
}

/**
 * The single public layout used across the whole site: sticky Navbar, a
 * min-height content region, and the Footer pinned to the bottom.
 */
export function MainLayout({ children, transparentNav = false }: MainLayoutProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh", bgcolor: "background.default" }}>
      <Navbar transparentOnTop={transparentNav} />
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
