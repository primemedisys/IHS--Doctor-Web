import { createTheme, responsiveFontSizes, type Theme } from "@mui/material/styles";
import { breakpoints } from "./breakpoints";
import { components } from "./components";
import { darkPalette, lightPalette } from "./palette";
import { shadows } from "./shadows";
import { shape } from "./shape";
import { spacing } from "./spacing";
import { designTokens } from "./styles";
import { transitions } from "./transitions";
import { typography } from "./typography";
import { zIndex } from "./zIndex";

/**
 * Builds the single application theme. Both color schemes are registered via
 * `colorSchemes` and MUI's CSS-variable engine, so switching light/dark is a
 * class swap on <html> (no re-render, no SSR flash — see InitColorSchemeScript
 * in the root layout). Everything the app styles with flows from here.
 */
export const createAppTheme = (): Theme => {
  const theme = createTheme({
    cssVariables: {
      colorSchemeSelector: "class",
      cssVarPrefix: "mui",
    },
    colorSchemes: {
      light: { palette: lightPalette },
      dark: { palette: darkPalette },
    },
    typography,
    breakpoints,
    shape,
    spacing,
    shadows,
    transitions,
    zIndex,
    components,
    tokens: designTokens,
  });

  return responsiveFontSizes(theme);
};

// Re-export style utilities & design tokens for `@/theme` single-import ergonomics.
export * from "./styles";
