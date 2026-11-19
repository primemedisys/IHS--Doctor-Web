"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AccentTile, type AccentKey } from "@/components/common/AccentTile";
import { Icon } from "@/components/common/Icon";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/error";
import { useCompleteAppointment } from "@/features/appointments/hooks/useAppointments";
import { emrKeys, useEmrCatalog, useEmrWorkspace } from "../hooks";
import { dayLabel, timeLabel, VISIT_STATUS } from "../format";
import { PatientHeader } from "./PatientHeader";
import { VitalsPanel } from "./VitalsPanel";
import {
  ComorbiditiesPanel,
  ComplaintsPanel,
  DiagnosisPanel,
  ExaminationsPanel,
  HistoryPanel,
  InvestigationsPanel,
  NotesPanel,
} from "./EntryPanels";
import { MedicationPanel } from "./MedicationPanel";
import { FollowUpDetails } from "./FollowUpDetails";
import { PreviousConsultations } from "./PreviousVisits";
import { ClinicalShortcuts } from "./ClinicalShortcuts";
import { RecordAccessProvider } from "./RecordAccess";
import { GeneratePrescription } from "./GeneratePrescription";
import { UnsavedWorkProvider } from "./UnsavedWork";

type SectionKey =
  | "vitals" | "complaint" | "examination" | "history" | "comorbidity" | "diagnosis"
  | "investigation" | "medication" | "notes" | "followup";

const SECTIONS: { key: SectionKey; label: string; icon: string; accent: AccentKey }[] = [
  { key: "vitals", label: "Vitals", icon: "FiActivity", accent: "teal" },
  { key: "complaint", label: "Chief Complaint", icon: "FiMessageSquare", accent: "navy" },
  { key: "examination", label: "Examinations", icon: "FiClipboard", accent: "teal" },
  { key: "history", label: "Patient History", icon: "FiBookOpen", accent: "purple" },
  { key: "comorbidity", label: "Comorbidities", icon: "FiHeart", accent: "purple" },
  { key: "diagnosis", label: "Diagnosis", icon: "FiCrosshair", accent: "orange" },
  { key: "investigation", label: "Investigation / Package", icon: "FiDroplet", accent: "teal" },
  { key: "medication", label: "Medication Order", icon: "FiPackage", accent: "purple" },
  { key: "notes", label: "Doctor's Notes", icon: "FiEdit3", accent: "grey" },
  { key: "followup", label: "Follow-up", icon: "FiCalendar", accent: "orange" },
];
// The patient's history (previous consultations, conditions, diagnoses) is read
// in the Previous Consultations block ABOVE these sections — not duplicated here.

const sectionId = (key: SectionKey) => `emr-section-${key}`;
const PREVIOUS_ID = "previous-consultations";
const SECTION_IDS = SECTIONS.map((s) => sectionId(s.key));

/**
 * How far below the viewport top a section counts as "reached": the fixed app
 * bar (56/64px) + the sticky section nav (~42px) + a little air. Also each
 * section's scroll-margin, so a jump never hides its heading under the nav.
 */
const SPY_OFFSET = 120;

/** Sticky `top` that follows the app bar's responsive Toolbar height. */
function belowAppBar(t: Theme) {
  const toolbar = t.mixins.toolbar as Record<string, unknown>;
  const out: Record<string, unknown> = { top: toolbar.minHeight ?? 56 };
  for (const [k, v] of Object.entries(toolbar)) {
    if (v && typeof v === "object" && "minHeight" in v) out[k] = { top: (v as { minHeight: unknown }).minHeight };
  }
  return out;
}

/**
 * Scroll-spy for the section nav: the active section is the last one whose top
 * has passed SPY_OFFSET (or the final one once the page bottoms out). A click
 * sets it directly and holds it while the smooth scroll runs, so the nav
 * doesn't flicker through every section in between.
 */
function useSectionSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const locked = useRef(false);
  const unlockTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      const doc = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
        setActive(ids[ids.length - 1]);
        return;
      }
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - SPY_OFFSET <= 1) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (locked.current) {
        // Still travelling to a clicked section: release once scrolling stops.
        window.clearTimeout(unlockTimer.current);
        unlockTimer.current = window.setTimeout(() => {
          locked.current = false;
        }, 150);
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(unlockTimer.current);
    };
  }, [ids]);

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    locked.current = true;
    window.clearTimeout(unlockTimer.current);
    // Fallback release if the section is already in place and no scroll fires.
    unlockTimer.current = window.setTimeout(() => {
      locked.current = false;
    }, 800);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  return { active, jumpTo };
}

/** One clinical section of the continuous record: heading + its full panel. */
function ClinicalSection({ section, children }: { section: (typeof SECTIONS)[number]; children: ReactNode }) {
  const headingId = `${sectionId(section.key)}-title`;
  return (
    <Paper
      component="section"
      variant="outlined"
      id={sectionId(section.key)}
      aria-labelledby={headingId}
      sx={(t) => ({ minWidth: 0, scrollMarginTop: `${SPY_OFFSET}px`, borderRadius: `${t.tokens.radius.xl}px`, overflow: "hidden" })}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={(t) => ({
          alignItems: "center",
          px: { xs: 2, md: 2.5 },
          py: 1.25,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: t.tokens.surface.subtle,
        })}
      >
        <AccentTile icon={section.icon} accent={section.accent} size={28} iconSize={15} />
        <Typography id={headingId} variant="subtitle1" component="h2" sx={{ fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
          {section.label}
        </Typography>
      </Stack>
      <Box sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

/**
 * One patient's medical workspace ("Smart consultation"). Everything is read
 * from — and written to — the real record; the server decides access (a
 * doctor–patient relationship) and every write is tied to the current visit.
 */
export function PatientWorkspace({ patientId, bookingId }: { patientId: string; bookingId: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const ws = useEmrWorkspace(patientId, bookingId);
  const catalog = useEmrCatalog();
  const complete = useCompleteAppointment();
  const { active, jumpTo } = useSectionSpy(SECTION_IDS);
  const [confirmDone, setConfirmDone] = useState(false);
  // Lifted so the consultation bar's "Add vitals" opens the form directly.
  const [addVitals, setAddVitals] = useState(false);

  if (ws.isLoading || catalog.isLoading) return <Loading label="Opening patient workspace…" />;
  if (ws.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorState title="Can't open this patient" description={getErrorMessage(ws.error)} onRetry={() => ws.refetch()} />
        <Box sx={{ textAlign: "center" }}>
          <Button component={Link} href={ROUTES.dashboard.workbench}>Back to workbench</Button>
        </Box>
      </Box>
    );
  }
  if (!ws.data || !catalog.data) return null;

  const data = ws.data;
  const enc = data.encounter;
  const encId = enc?.bookingId ?? null;
  const canRecord = Boolean(enc?.canRecord);
  const props = { patientId, bookingId: encId, canRecord, catalog: catalog.data };
  // The visits the doctor can switch the workspace to: their OWN visits only.
  const myVisits = data.visits.filter((v) => user && v.doctor?.id === String(user.id));

  const switchVisit = (id: string) => router.replace(ROUTES.dashboard.emrPatient(patientId, id));

  const finish = () =>
    complete.mutate(
      { id: encId! },
      {
        onSuccess: () => {
          toast.success("Consultation marked complete");
          setConfirmDone(false);
          qc.invalidateQueries({ queryKey: emrKeys.all });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );

  // Every section is rendered, in order; the nav scrolls between them.
  const panel = (key: SectionKey) => {
    switch (key) {
      case "vitals": return <VitalsPanel patientId={patientId} bookingId={encId} canRecord={canRecord} addOpen={addVitals} onAddOpenChange={setAddVitals} />;
      case "complaint": return <ComplaintsPanel {...props} />;
      case "examination": return <ExaminationsPanel {...props} />;
      case "history": return <HistoryPanel {...props} patient={data.patient} />;
      case "comorbidity": return <ComorbiditiesPanel {...props} patient={data.patient} />;
      case "diagnosis": return <DiagnosisPanel {...props} />;
      case "investigation": return <InvestigationsPanel {...props} />;
      case "medication": return <MedicationPanel {...props} visits={data.visits} />;
      case "notes": return <NotesPanel {...props} />;
      case "followup": return <FollowUpDetails patientId={patientId} bookingId={encId} canRecord={canRecord} visitDate={enc?.date ?? null} />;
    }
  };

  return (
    <RecordAccessProvider patientId={patientId} access={data.access}>
    <UnsavedWorkProvider>
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Button size="small" component={Link} href={ROUTES.dashboard.workbench} startIcon={<Icon name="FiArrowLeft" />}>
          Workbench
        </Button>
        <Typography variant="caption" color="text.secondary">/ {data.patient.name}</Typography>
      </Stack>

      <PatientHeader ws={data} />

      {/* ── Clinical shortcuts: records, reports, diagnoses, treatment ───── */}
      <ClinicalShortcuts patientId={patientId} currentBookingId={encId} patient={data.patient} />

      {/* ── Smart consultation bar ───────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={(t) => ({
          px: { xs: 1.5, md: 2 },
          py: { xs: 1.5, md: 1.75 },
          minHeight: 68,
          display: "flex",
          alignItems: "center",
          columnGap: 1.25,
          rowGap: 1,
          flexWrap: "wrap",
          borderRadius: `${t.tokens.radius.xl}px`,
          bgcolor: "background.paper",
        })}
      >
        {/* Left: the visit. Right: the actions, kept together — when the bar
            runs out of width they move to their own row as one group. */}
        <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1.25, rowGap: 1, minWidth: 0, flex: "1 1 520px" }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mr: 0.5 }}>
            <AccentTile icon="FiZap" accent="navy" size={28} iconSize={15} />
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", color: "text.primary" }}>Smart consultation</Typography>
          </Stack>
          {enc ? (
            <>
              {myVisits.length > 1 ? (
                <TextField size="small" select value={enc.bookingId} onChange={(e) => switchVisit(e.target.value)} sx={{ minWidth: 220, maxWidth: 340, flex: "0 1 auto" }} aria-label="Visit">
                  {myVisits.map((v) => (
                    <MenuItem key={v.bookingId} value={v.bookingId}>
                      {dayLabel(v.date)} {timeLabel(v.startTime)} · #{v.bookingId} · {VISIT_STATUS[v.status].label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Chip label={`${dayLabel(enc.date)} ${timeLabel(enc.startTime)} · #${enc.bookingId}`} />
              )}
              <Chip size="small" color={VISIT_STATUS[enc.status].color} label={VISIT_STATUS[enc.status].label} />
              <Chip size="small" variant="outlined" icon={<Icon name={enc.appointmentType === "video" ? "FiVideo" : "FiMapPin"} />} label={enc.appointmentType === "video" ? "Video" : "In-clinic"} />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No visit with you to record against.</Typography>
          )}
        </Stack>
        {enc && (
          <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: 1, ml: "auto", justifyContent: "flex-end" }}>
            {canRecord && (
              <Button size="small" variant="outlined" startIcon={<Icon name="FiPlus" />} onClick={() => { jumpTo(sectionId("vitals")); setAddVitals(true); }}>
                Add vitals
              </Button>
            )}
            <Button size="small" variant="outlined" component={Link} href={ROUTES.dashboard.writePrescription(enc.bookingId)} startIcon={<Icon name="FiFileText" />}>
              Prescription
            </Button>
            {enc.appointmentType === "video" && enc.status === "confirmed" && (
              <Button size="small" variant="outlined" component={Link} href={ROUTES.dashboard.call(enc.bookingId)} startIcon={<Icon name="FiVideo" />}>
                Join call
              </Button>
            )}
            {enc.status === "confirmed" && (
              <Button size="small" variant="contained" color="success" startIcon={<Icon name="FiCheck" />} onClick={() => setConfirmDone(true)}>
                Complete consultation
              </Button>
            )}
          </Stack>
        )}
      </Paper>

      {enc && !canRecord && (
        <Alert severity="info">This visit is awaiting payment — the record unlocks once it is confirmed.</Alert>
      )}

      {/* ── Previous consultations: read before starting today's. Includes the
          access strip for other doctors' prescriptions / reports. ───────── */}
      <Box id={PREVIOUS_ID} tabIndex={-1} sx={{ scrollMarginTop: 80, minWidth: 0, outline: "none" }}>
        <PreviousConsultations patientId={patientId} currentBookingId={encId} patient={data.patient} />
      </Box>

      {/* ── Today's consultation ─────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", pt: 0.5 }}>
        <AccentTile icon="FiEdit" accent="navy" size={28} iconSize={15} />
        <Typography variant="overline" component="h2" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.primary" }}>
          Current consultation
        </Typography>
        <Box sx={{ flex: 1, borderBottom: 1, borderColor: "divider" }} />
      </Stack>

      {/* ── Clinical section nav: anchor links to the sections below. Sticks
          under the app bar while the record scrolls, scrolls sideways inside
          itself on narrow screens (never the page), and follows the section
          in view. ──────────────────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        component="nav"
        aria-label="Clinical sections"
        sx={(t) => ({
          ...belowAppBar(t),
          position: "sticky",
          zIndex: t.zIndex.appBar - 1,
          minWidth: 0,
          bgcolor: "background.paper",
          borderRadius: `${t.tokens.radius.lg}px`,
          boxShadow: t.shadows[1],
        })}
      >
        <Tabs
          value={active}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 42,
            "& .MuiTabs-scrollButtons.Mui-disabled": { opacity: 0.3 },
            "& .MuiTab-root": {
              textTransform: "none",
              minHeight: 42,
              minWidth: 0,
              px: 1.25,
              py: 0.5,
              fontSize: 13.5,
              fontWeight: 600,
              gap: 0.5,
              color: "text.secondary",
              transition: (t) => t.transitions.create(["color", "background-color"], { duration: 150 }),
              "&:hover": { color: "text.primary", bgcolor: "action.hover" },
              "&.Mui-selected": { color: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
              "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
            },
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          {SECTIONS.map((s) => (
            <Tab
              key={s.key}
              value={sectionId(s.key)}
              label={s.label}
              icon={<Box component="span" sx={{ display: "inline-flex", color: (t) => t.tokens.accent[s.accent].fg }}><Icon name={s.icon} size={15} /></Box>}
              iconPosition="start"
              component="a"
              href={`#${sectionId(s.key)}`}
              // Real anchors (middle-click / copy link still work). The jump runs on
              // click, not Tabs' onChange, which skips the already-active tab.
              onClick={(e: MouseEvent) => {
                e.preventDefault();
                jumpTo(sectionId(s.key));
              }}
              aria-current={active === sectionId(s.key) ? "location" : undefined}
            />
          ))}
        </Tabs>
      </Paper>

      {/* ── The whole clinical record, one section after another ───────── */}
      {SECTIONS.map((s) => (
        <ClinicalSection key={s.key} section={s}>{panel(s.key)}</ClinicalSection>
      ))}

      {/* ── Last step: save everything above and build the prescription ── */}
      <GeneratePrescription patientId={patientId} bookingId={encId} canRecord={canRecord} onJump={jumpTo} />

      <ConfirmDialog
        open={confirmDone}
        title="Complete this consultation?"
        description="The visit moves to Completed. Sign the prescription first if one is needed — the patient sees it once signed."
        confirmLabel="Mark complete"
        onConfirm={finish}
        onClose={() => setConfirmDone(false)}
        loading={complete.isPending}
      />
    </Stack>
    </UnsavedWorkProvider>
    </RecordAccessProvider>
  );
}
