import type { ThemeOptions } from "@mui/material/styles";

/**
 * Base spacing unit (px). MUI multiplies this by the numeric arguments you
 * pass to `theme.spacing(n)` and to `sx` shorthands (p, m, gap, ...).
 * With base 8: `spacing(2)` = 16px, `sx={{ p: 3 }}` = 24px.
 */
export const SPACING_UNIT = 8;

export const spacing: ThemeOptions["spacing"] = SPACING_UNIT;
