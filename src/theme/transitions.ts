import type { ThemeOptions } from "@mui/material/styles";

/**
 * Transition durations & easings consumed by MUI components and available via
 * `theme.transitions.create()`. Animation *presets* for bespoke UI live in
 * `theme.tokens.duration` (see theme/styles.ts).
 */
export const transitions: ThemeOptions["transitions"] = {
  easing: {
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
  },
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
};
