import type { BreakpointsOptions } from "@mui/material/styles";

/**
 * Mobile-first breakpoints. Values match MUI defaults intentionally so
 * community components and DataGrid behave predictably; centralized here so
 * the whole app has one place to tune responsive thresholds.
 */
export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};
