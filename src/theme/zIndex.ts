import type { ThemeOptions } from "@mui/material/styles";

/**
 * Centralized stacking order. Keeping these in the theme prevents the classic
 * "z-index: 9999" arms race — every overlay references the same scale.
 */
export const zIndex: ThemeOptions["zIndex"] = {
  mobileStepper: 1000,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};
