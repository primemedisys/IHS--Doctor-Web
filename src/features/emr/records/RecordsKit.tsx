"use client";

/**
 * Shared frame of the patient record pages (Overview, Medical Records,
 * Diagnosis Timeline, Medicine Timeline, Investigations, Treatment Summary):
 * the patient profile strip, one continuous tab frame, and the small building
 * blocks (stat tiles, section cards, empty text) the pages share.
 *
 * The patient comes from the route (`patientId`) and is re-authorised by the
 * server on every request — nothing here trusts an id for access.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { getErrorMessage } from "@/utils/error";
import { useEmrWorkspace } from "../hooks";
import { RecordAccessProvider } from "../components/RecordAccess";
import { ageGender, dayLabel, istToday } from "../format";
import type { EmrIdentity, EmrWorkspace } from "@/types/emr";

export type RecordsPage = "clinical-dashboard" | "clinical-records" | "medical-reports" | "diagnosis-records" | "treatment-summary" | "medicine-dashboard" | "doctor-comparison" | "reconciliation" | "audit-history";

export const PAGES: Record<RecordsPage, { title: string; short: string; icon: string; tone: CardTone; description: string }> = {
  "clinical-dashboard": { title: "Overview", short: "Overview", icon: "FiGrid", tone: "purple", description: "The patient's whole medical journey across doctors — timeline, records and analytics." },
  "medicine-dashboard": { title: "Medicine Timeline", short: "Medicine Timeline", icon: "FiPackage", tone: "blue", description: "Medicine timeline, current medication and doctor-wise prescriptions." },
  "diagnosis-records": { title: "Diagnosis Timeline", short: "Diagnosis Timeline", icon: "FiSearch", tone: "orange", description: "Every diagnosis as each doctor recorded it, and how it developed." },
  "clinical-records": { title: "Medical Records", short: "Medical Records", icon: "FiClipboard", tone: "purple", description: "Every consultation, by every doctor, with what was recorded in it." },
  "medical-reports": { title: "Investigations", short: "Investigations", icon: "FiFileText", tone: "teal", description: "Laboratory, imaging and other medical documents, by test date." },
  "treatment-summary": { title: "Treatment Summary", short: "Treatment Summary", icon: "FiCheckCircle", tone: "green", description: "Current and previous prescriptions, each with its own prescriber." },
  "doctor-comparison": { title: "Doctor Comparison", short: "Doctor Comparison", icon: "FiUsers", tone: "purple", description: "Each doctor's recorded diagnoses, investigations and treatment side by side." },
  "reconciliation": { title: "Reconciliation", short: "Reconciliation", icon: "FiRefreshCw", tone: "teal", description: "Medication reconciliation records for this patient." },
  "audit-history": { title: "Audit History", short: "Audit History", icon: "FiShield", tone: "blue", description: "Read-only trail of your recorded actions on this patient." },
};

// ── Reference palette (blue primary, navy headings, light-blue borders) ──────
const BLUE = "#0757B8";
const BLUE_DK = "#064A98";
const NAVY = "#10254D";
const BLUE_LT = "#EAF3FF";
const BORDER = "#D5E2F2";

/** The most recent visit that has already happened (real dates only, never booked future ones). */
const lastVisitOf = (ws: EmrWorkspace): string | null => {
  const today = istToday();
  const dates = [ws.encounter?.date ?? null, ...ws.visits.map((v) => v.date)].filter((d): d is string => d != null && d.slice(0, 10) <= today);
  return dates.sort().at(-1) ?? null;
};

/** One labelled value of the patient strip — a section with a clean separator. */
function StripCell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <Box sx={{ minWidth: 92, borderLeft: { xs: "none", sm: 1 }, borderColor: BORDER, pl: { xs: 0, sm: 2 }, display: "flex", flexDirection: "column", gap: 0.15 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#4F6B91", lineHeight: 1.4 }}>{label}</Typography>
      <Typography noWrap title={value} sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, color: muted ? "text.secondary" : NAVY }}>{value}</Typography>
    </Box>
  );
}

/**
 * The patient profile strip: photo, name and identification on the left,
 * aligned ABHA / blood-group / last-visit sections, and the View Profile
 * action on the far right. Every value comes from the authorised workspace
 * payload; anything the record does not carry reads "Not available" — never
 * an invented value.
 */
function PatientStrip({ patientId, p, lastVisit, compact }: { patientId: string; p: EmrIdentity; lastVisit: string | null; compact?: boolean }) {
  const blood = p.bloodGroup && p.bloodGroup !== "unknown" ? p.bloodGroup : null;
  const allergy = p.allergies.length
    ? p.allergies.map((a) => a.name).filter(Boolean).join(", ")
    : p.noKnownAllergies
      ? "No known allergies"
      : "Allergies not recorded";
  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? { xs: 1, sm: 1 } : { xs: 1.25, sm: 1.5 },
        borderRadius: "0.9rem",
        borderColor: BORDER,
        background: `linear-gradient(120deg, ${BLUE_LT} 0%, #F5F9FF 55%, #FFFFFF 100%)`,
        boxShadow: "0 1px 3px rgba(16,37,77,0.05)",
        display: "flex",
        alignItems: "center",
        gap: compact ? { xs: 1, sm: 1.5 } : { xs: 1.25, sm: 2 },
        flexWrap: "wrap",
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}>
        <Avatar src={p.avatarUrl ?? undefined} alt={p.name} sx={{ width: compact ? 40 : 54, height: compact ? 40 : 54, fontSize: compact ? 16 : 20, fontWeight: 700, bgcolor: BLUE, color: "#fff", border: "2px solid #FFFFFF", boxShadow: "0 1px 4px rgba(16,37,77,0.18)" }}>
          {p.name.slice(0, 1)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h1" noWrap title={p.name} sx={{ fontWeight: 800, color: NAVY, lineHeight: 1.2, fontSize: compact ? 16 : undefined }}>{p.name}</Typography>
          <Typography variant="body2" noWrap sx={{ color: "#4F6B91" }}>
            {[`ID ${p.regNo}`, ageGender(p.age, p.gender)].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ display: "flex", gap: { xs: 1.25, sm: 2 }, flexWrap: "wrap", minWidth: 0, flex: { xs: "1 1 100%", md: "1 1 auto" } }}>
        <StripCell label="ABHA ID" value="Not available" muted />
        <StripCell label="Blood group" value={blood ?? "Not recorded"} muted={!blood} />
        <StripCell label="Last visit" value={lastVisit ? dayLabel(lastVisit) : "Not recorded"} muted={!lastVisit} />
      </Box>
      <Box sx={{ flex: 1, minWidth: { xs: 0, md: 8 } }} />
      <Chip
        size="small"
        variant="outlined"
        color={p.allergies.length ? "error" : "default"}
        icon={<Icon name={p.allergies.length ? "FiAlertTriangle" : "FiShield"} size={13} />}
        label={allergy}
        sx={{ maxWidth: "100%", height: 26 }}
      />
      <Button
        component={Link}
        href={ROUTES.dashboard.patientTimeline(patientId)}
        variant="contained"
        disableElevation
        startIcon={<Icon name="FiExternalLink" size={14} />}
        sx={{ textTransform: "none", fontWeight: 700, bgcolor: BLUE, "&:hover": { bgcolor: BLUE_DK }, flexShrink: 0, ...(compact ? { py: 0.4 } : {}) }}
      >
        View Profile
      </Button>
    </Paper>
  );
}

export function RecordsFrame({
  patientId,
  page,
  compact,
  children,
}: {
  patientId: string;
  page: RecordsPage;
  /** Tighter profile strip, tabs and gaps (opt-in; used by the Clinical Dashboard). */
  compact?: boolean;
  children: (ws: EmrWorkspace, currentBookingId: string | null) => ReactNode;
}) {
  const search = useSearchParams();
  const bookingId = search.get("bookingId");
  const ws = useEmrWorkspace(patientId, bookingId);
  const meta = PAGES[page];

  if (ws.isLoading) return <Loading label={`Opening ${meta.title.toLowerCase()}…`} />;
  if (ws.isError || !ws.data) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorState title="Can't open this patient's records" description={getErrorMessage(ws.error)} onRetry={() => ws.refetch()} />
        <Box sx={{ textAlign: "center" }}>
          <Button component={Link} href={ROUTES.dashboard.workbench}>Back to workbench</Button>
        </Box>
      </Box>
    );
  }
  const p = ws.data.patient;
  const currentBookingId = ws.data.encounter?.bookingId ?? null;

  return (
    <RecordAccessProvider patientId={patientId} access={ws.data.access}>
      <Stack spacing={compact ? 1 : 2} sx={{ minWidth: 0 }}>
        {/* Patient profile strip — the page starts here (no page-level header above it). */}
        <PatientStrip patientId={patientId} p={p} lastVisit={lastVisitOf(ws.data)} compact={compact} />

        {/* One continuous tab frame — active tab in strong blue, inactive in light with navy text. */}
        <Box
          component="nav"
          aria-label="Patient record pages"
          sx={{
            display: "flex",
            gap: "4px",
            p: compact ? "3px" : "4px",
            bgcolor: BLUE_LT,
            border: 1,
            borderColor: BORDER,
            borderRadius: compact ? "0.9rem" : "12px",
            overflowX: "auto",
            scrollbarWidth: "thin",
            "& > a": { flexShrink: 0 },
          }}
        >
          {(Object.keys(PAGES) as RecordsPage[]).map((k) => {
            const on = k === page;
            return (
              <Box
                key={k}
                component={Link}
                href={ROUTES.dashboard.emrRecords(patientId, k, bookingId)}
                aria-current={on ? "page" : undefined}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: compact ? 30 : 34,
                  px: 1.75,
                  borderRadius: "9px",
                  fontSize: 13,
                  fontWeight: on ? 700 : 600,
                  whiteSpace: "nowrap",
                  color: on ? "#FFFFFF" : NAVY,
                  bgcolor: on ? BLUE : "transparent",
                  transition: "background-color 150ms, color 150ms",
                  "&:hover": { bgcolor: on ? BLUE_DK : "#FFFFFF" },
                  "&:focus-visible": { outline: "2px solid", outlineOffset: "-2px" },
                }}
              >
                {PAGES[k].short}
              </Box>
            );
          })}
        </Box>

        {children(ws.data, currentBookingId)}
      </Stack>
    </RecordAccessProvider>
  );
}

/** A row of figures counted from the records (never typed in). */
export function StatRow({ tone, stats }: { tone: CardTone; stats: { label: string; value: string }[] }) {
  const t = CARD_TONES[tone];
  return (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${Math.min(stats.length, 5)}, minmax(0, 1fr))` } }}>
      {stats.map((s) => (
        <Box key={s.label} sx={{ bgcolor: t.bg, border: 1, borderColor: t.border, borderRadius: 2, px: 1.5, py: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: t.fg, fontWeight: 600, display: "block", lineHeight: 1.35 }}>{s.label}</Typography>
          <Typography sx={{ color: t.heading, fontWeight: 700, fontSize: 18, lineHeight: 1.3, overflowWrap: "anywhere" }}>{s.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export function Section({ title, hint, children, actions, dense }: { title: string; hint?: string; children: ReactNode; actions?: ReactNode; dense?: boolean }) {
  return (
    <Paper
      variant="outlined"
      component="section"
      sx={{ p: dense ? 1.25 : 1.5, minWidth: 0, borderRadius: "0.9rem", borderColor: BORDER, boxShadow: "0 1px 3px rgba(16,37,77,0.05)" }}
    >
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 1, flexWrap: "wrap", mb: dense ? 0.75 : 1.25 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: NAVY }}>{title}</Typography>
        {hint && <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{hint}</Typography>}
        {actions}
      </Stack>
      {children}
    </Paper>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => (
  <Typography variant="body2" color="text.secondary">{children}</Typography>
);

/** Small label/value pairs used inside record cards. */
export function Facts({ items }: { items: { k: string; v: ReactNode }[] }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gap: 1,
        columnGap: 2,
        gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2, minmax(0,1fr))", lg: "repeat(3, minmax(0,1fr))" },
        "& dt": { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" },
        "& dd": { m: 0, fontSize: 13.5, fontWeight: 600, overflowWrap: "anywhere" },
      }}
    >
      {items.map((f) => (
        <Box key={f.k} sx={{ minWidth: 0 }}>
          <dt>{f.k}</dt>
          <dd>{f.v || "—"}</dd>
        </Box>
      ))}
    </Box>
  );
}
