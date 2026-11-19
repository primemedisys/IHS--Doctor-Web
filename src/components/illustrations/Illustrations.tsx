import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

/**
 * Flat, on-brand SVG illustrations (cliparts) built from geometric shapes.
 * Colors reference MUI CSS variables (`--mui-palette-*`) so they adapt to the
 * active light/dark scheme automatically — no image assets, no theme props.
 */

const C = {
  primary: "var(--mui-palette-primary-main)",
  primarySoft: "color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)",
  secondary: "var(--mui-palette-secondary-main)",
  secondarySoft: "color-mix(in srgb, var(--mui-palette-secondary-main) 18%, transparent)",
  paper: "var(--mui-palette-background-paper)",
  surface: "color-mix(in srgb, var(--mui-palette-text-primary) 6%, var(--mui-palette-background-paper))",
  line: "var(--mui-palette-divider)",
  faint: "color-mix(in srgb, var(--mui-palette-text-primary) 10%, transparent)",
  warn: "var(--mui-palette-warning-main)",
};

function Frame({ children, sx, label }: { children: ReactNode; sx?: SxProps<Theme>; label: string }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 240 200"
      role="img"
      aria-label={label}
      sx={{ width: "100%", height: "auto", display: "block", ...sx }}
    >
      {children}
    </Box>
  );
}

/** Step 1 — searching / discovering a doctor. */
export function SearchDoctorArt({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Frame label="Search for a doctor" sx={sx}>
      <ellipse cx="120" cy="176" rx="88" ry="12" fill={C.faint} />
      <rect x="42" y="34" width="156" height="120" rx="16" fill={C.surface} stroke={C.line} />
      <rect x="60" y="52" width="120" height="18" rx="9" fill={C.paper} stroke={C.line} />
      <circle cx="72" cy="61" r="4" fill={C.primary} />
      <circle cx="74" cy="98" r="14" fill={C.secondarySoft} />
      <circle cx="74" cy="98" r="14" fill="none" stroke={C.secondary} />
      <rect x="96" y="90" width="80" height="7" rx="3.5" fill={C.line} />
      <rect x="96" y="102" width="54" height="6" rx="3" fill={C.faint} />
      <circle cx="74" cy="132" r="14" fill={C.primarySoft} />
      <circle cx="74" cy="132" r="14" fill="none" stroke={C.primary} />
      <rect x="96" y="124" width="80" height="7" rx="3.5" fill={C.line} />
      <rect x="96" y="136" width="54" height="6" rx="3" fill={C.faint} />
      <circle cx="168" cy="150" r="26" fill={C.paper} stroke={C.primary} strokeWidth="4" />
      <line x1="186" y1="168" x2="204" y2="186" stroke={C.primary} strokeWidth="7" strokeLinecap="round" />
    </Frame>
  );
}

/** Step 2 — booking an appointment slot. */
export function BookAppointmentArt({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Frame label="Book an appointment" sx={sx}>
      <ellipse cx="120" cy="176" rx="84" ry="12" fill={C.faint} />
      <rect x="52" y="40" width="136" height="120" rx="16" fill={C.surface} stroke={C.line} />
      <rect x="52" y="40" width="136" height="30" rx="16" fill={C.primary} />
      <rect x="52" y="56" width="136" height="14" fill={C.primary} />
      <rect x="78" y="30" width="8" height="20" rx="4" fill={C.primary} />
      <rect x="154" y="30" width="8" height="20" rx="4" fill={C.primary} />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => {
          const x = 70 + c * 28;
          const y = 84 + r * 24;
          const active = c === 2 && r === 1;
          return (
            <rect
              key={`${c}-${r}`}
              x={x}
              y={y}
              width="18"
              height="16"
              rx="5"
              fill={active ? C.secondary : C.paper}
              stroke={active ? C.secondary : C.line}
            />
          );
        }),
      )}
      <circle cx="176" cy="150" r="24" fill={C.paper} stroke={C.secondary} strokeWidth="4" />
      <path d="M165 150 l7 8 l14 -16" fill="none" stroke={C.secondary} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Step 3 — video / in-clinic consultation. */
export function ConsultArt({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Frame label="Consult your doctor" sx={sx}>
      <ellipse cx="120" cy="178" rx="86" ry="12" fill={C.faint} />
      <rect x="40" y="36" width="160" height="112" rx="14" fill={C.surface} stroke={C.line} />
      <rect x="54" y="50" width="132" height="84" rx="10" fill={C.paper} stroke={C.line} />
      <circle cx="112" cy="86" r="20" fill={C.primarySoft} />
      <circle cx="112" cy="80" r="8" fill={C.primary} />
      <path d="M96 104 a16 14 0 0 1 32 0 z" fill={C.primary} />
      <rect x="150" y="98" width="30" height="24" rx="6" fill={C.secondarySoft} stroke={C.secondary} />
      <circle cx="160" cy="107" r="3.5" fill={C.secondary} />
      <path d="M154 118 a6 5 0 0 1 12 0 z" fill={C.secondary} />
      <rect x="96" y="150" width="48" height="30" rx="8" fill={C.primary} />
      <circle cx="120" cy="165" r="7" fill={C.paper} />
      <rect x="150" y="158" width="10" height="4" rx="2" fill={C.warn} />
    </Frame>
  );
}

/** Empty / not-found state. */
export function EmptySearchArt({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Frame label="Nothing found" sx={sx}>
      <ellipse cx="120" cy="176" rx="70" ry="10" fill={C.faint} />
      <rect x="70" y="44" width="100" height="118" rx="14" fill={C.surface} stroke={C.line} />
      <rect x="86" y="64" width="68" height="8" rx="4" fill={C.line} />
      <rect x="86" y="82" width="48" height="6" rx="3" fill={C.faint} />
      <rect x="86" y="104" width="68" height="6" rx="3" fill={C.faint} />
      <rect x="86" y="118" width="40" height="6" rx="3" fill={C.faint} />
      <circle cx="150" cy="150" r="30" fill={C.paper} stroke={C.primary} strokeWidth="4" />
      <line x1="171" y1="171" x2="190" y2="190" stroke={C.primary} strokeWidth="7" strokeLinecap="round" />
      <line x1="140" y1="150" x2="160" y2="150" stroke={C.primary} strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}
