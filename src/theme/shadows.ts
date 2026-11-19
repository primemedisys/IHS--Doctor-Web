import type { Shadows } from "@mui/material/styles";

/**
 * "Soft Clinical Morphism" elevation — conceptually only TWO levels:
 *   • small  — resting cards / inputs (very soft)
 *   • large  — floating surfaces: menus, dialogs, popovers (very soft)
 * The 25-slot MUI array is required, so lower slots resolve to the small token
 * and higher slots to the large token, easing gently between them. Shadows are
 * navy-tinted and low-opacity so surfaces appear to float rather than lift hard.
 */
const soft = "rgba(16, 33, 71, 0.06)";
const softer = "rgba(16, 33, 71, 0.05)";
const ambient = "rgba(16, 33, 71, 0.04)";

const SMALL =
  `0px 1px 2px 0px ${softer}, ` +
  `0px 2px 6px -1px ${soft}`;

const LARGE =
  `0px 2px 4px -1px ${ambient}, ` +
  `0px 12px 32px -8px ${soft}, ` +
  `0px 24px 48px -16px ${softer}`;

// Slots 1–4 → small; 5–24 → large. A gentle two-step system, never harsh.
export const shadows: Shadows = [
  "none",
  SMALL,
  SMALL,
  SMALL,
  SMALL,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
  LARGE,
] as Shadows;
