"use client";

import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import { createAppTheme } from "./index";
import { globalStyles } from "./styles";

interface AppThemeProviderProps {
  children: ReactNode;
}


export function AppThemeProvider({ children }: AppThemeProviderProps) {
  // Theme is static; memoize so it's created once per client.
  const theme = useMemo(() => createAppTheme(), []);

  return (
    <MuiThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <GlobalStyles styles={globalStyles} />
      {children}
    </MuiThemeProvider>
  );
}
