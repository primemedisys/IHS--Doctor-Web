"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useOwnProfile } from "@/features/doctor/hooks";
import { getInitials } from "@/utils/format";
import { useWorkbench } from "../hooks";
import { ageGender, dayLabel, istToday, shiftDay, VISIT_STATUS } from "../format";
import type { ConsultationView, RosterEntry, Workbench, WorkbenchVisit } from "@/types/emr";

type Tone = "primary" | "secondary" | "success" | "warning" | "info";
type ChipTone = "default" | "warning" | "info" | "success" | "error";

/**
 * The Patient Workbench listing, top to bottom:
 *   A. header — doctor, date (with Today), search;
 *   B. two counts: All my patients · the selected date's appointments;
 *   C. ALL MY PATIENTS as a full-width, paginated list.
 * Appointment lists live on the Appointments board (the second count opens
 * it). Every row is built server-side from REAL bookings; the Status column
 * is read from the selected date's, upcoming and completed visits the same
 * query returns, never guessed.
 *
 * `embedded` hides the header strip and shortens the page.
 */
export function WorkbenchView({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useOwnProfile();
  const uid = useId();
  const anchor = (k: string) => `wb-${uid.replace(/:/g, "")}-${k}`;

  const [date, setDate] = useState(istToday);
  // The patient list does not depend on the pending/completed split; the
  // workbench query still takes it, so it is fixed here.
  const view: ConsultationView = "pending";
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 350);

  const wb = useWorkbench(date, view, q);
  const data = wb.data;
  const isToday = date === istToday();
  const dateText = isToday ? "today" : dayLabel(date, { year: undefined });

  const openPatient = (r: RosterEntry) => router.push(ROUTES.dashboard.emrPatient(r.patient.id, r.lastBookingId));

  // Rows per page; lists reset to page 1 whenever the query changes.
  const listKey = `${date}|${view}|${q}`;
  const patientPage = embedded ? 6 : 12;

  const p = profile.data;
  const specializations = (p?.specializations ?? []).map((s) => s.name).filter(Boolean);
  const scrollTo = (k: string) => document.getElementById(anchor(k))?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <Stack component="section" aria-label="Patient workbench" spacing={1.25} sx={{ minWidth: 0 }}>
      {/* ── A. Header: doctor · date · search · pending/completed ─────────
          Full page only: the overview embeds the lists for today without it
          (date, search and the pending/completed switch live on this page). */}
      {!embedded && (
        <Paper variant="outlined" sx={{ px: { xs: 1.25, md: 1.5 }, py: 1.25, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0, flex: "1 1 260px" }}>
            <Avatar src={p?.photoUrl ?? user?.avatarUrl ?? undefined} sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
              {getInitials(p?.name ?? user?.name ?? "")}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.25, color: "text.primary" }}>
                {p?.name ?? user?.name}
              </Typography>
              {p?.qualification && (
                <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ lineHeight: 1.35 }}>
                  {p.qualification}
                </Typography>
              )}
              {specializations.length > 0 && (
                <Typography variant="caption" noWrap component="p" sx={{ lineHeight: 1.35, color: "secondary.main", fontWeight: 600 }}>
                  {specializations.join(" · ")}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack
            direction="row"
            useFlexGap
            sx={{ alignItems: "center", gap: 1, flexWrap: "wrap", flex: "1 1 520px", justifyContent: { md: "flex-end" }, minWidth: 0 }}
          >
            <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
              <IconButton size="small" aria-label="Previous day" onClick={() => setDate((d) => shiftDay(d, -1))}>
                <Icon name="FiChevronLeft" />
              </IconButton>
              <TextField
                type="date"
                size="small"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                sx={{ width: 150 }}
                slotProps={{ htmlInput: { "aria-label": "Selected date" } }}
              />
              <IconButton size="small" aria-label="Next day" onClick={() => setDate((d) => shiftDay(d, 1))}>
                <Icon name="FiChevronRight" />
              </IconButton>
              <Button size="small" variant={isToday ? "contained" : "outlined"} onClick={() => setDate(istToday())}>
                Today
              </Button>
            </Stack>

            <TextField
              size="small"
              placeholder="Search name, mobile, reg. no, visit ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: "1 1 220px", minWidth: 180, maxWidth: { md: 340 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon name="FiSearch" />
                    </InputAdornment>
                  ),
                },
                htmlInput: { "aria-label": "Search patients" },
              }}
            />

            <Stack direction="row" spacing={0.25}>
              <Tooltip title="Appointments board">
                <IconButton size="small" component={Link} href={ROUTES.dashboard.appointments} aria-label="Appointments board">
                  <Icon name="FiCalendar" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton size="small" component={Link} href={ROUTES.dashboard.settings} aria-label="Settings">
                  <Icon name="FiSettings" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      )}

      {wb.isFetching && <LinearProgress sx={{ height: 2 }} />}
      {wb.isError && <ErrorState title="Couldn't load your workbench" onRetry={() => wb.refetch()} />}

      {!wb.isError && (
        <>
          {/* ── B. Summary: all my patients + the selected day's appointments ── */}
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
            <StatTile
              featured
              label="All my patients"
              count={data?.all.rows.length ?? 0}
              capped={data?.all.capped}
              icon="FiUsers"
              tone="primary"
              loading={wb.isLoading}
              onClick={() => scrollTo("all")}
            />
            {/* Opens the Appointments board, where appointments are managed. */}
            <StatTile
              label={isToday ? "Today's appointments" : `Appointments · ${dateText}`}
              count={data?.today.length ?? 0}
              icon="FiCalendar"
              tone="secondary"
              loading={wb.isLoading}
              onClick={() => router.push(ROUTES.dashboard.appointments)}
            />
          </Box>

          <Section
            id={anchor("all")}
            icon="FiUsers"
            tone="primary"
            title="All my patients"
            count={data?.all.rows.length ?? 0}
            capped={data?.all.capped}
            hint="Every patient with a confirmed or completed booking with you"
          >
            {wb.isLoading ? (
              <Loading />
            ) : (
              <PatientTable key={listKey} data={data} date={date} isToday={isToday} pageSize={patientPage} onOpen={openPatient} />
            )}
          </Section>

        </>
      )}
    </Stack>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

const toneMain = (t: Theme, tone: Tone) => t.palette[tone].main;

function StatTile({
  label,
  count,
  capped,
  icon,
  tone,
  featured,
  loading,
  onClick,
  sx,
}: {
  label: string;
  count: number;
  capped?: boolean;
  icon: string;
  tone: Tone;
  featured?: boolean;
  loading?: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${loading ? "loading" : count}`}
      sx={[
        (t) => ({
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          minWidth: 0,
          textAlign: "left",
          font: "inherit",
          cursor: "pointer",
          px: 1.5,
          py: featured ? 1.5 : 1.25,
          borderRadius: `${t.tokens.radius.lg}px`,
          border: 1,
          borderColor: t.tokens.surface.border,
          bgcolor: "background.paper",
          color: "text.primary",
          transition: t.transitions.create(["border-color", "box-shadow"], { duration: 150 }),
          "&:hover": { borderColor: t.palette.grey[300], boxShadow: t.shadows[1] },
          "&:focus-visible": { outline: `2px solid ${t.palette.primary.main}`, outlineOffset: 2 },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        sx={(t) => ({
          width: featured ? 44 : 36,
          height: featured ? 44 : 36,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: `${t.tokens.radius.sm}px`,
          bgcolor: t.palette.grey[100],
          color: toneMain(t, tone),
        })}
      >
        <Icon name={icon} size={featured ? 22 : 18} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" noWrap component="p" sx={{ fontWeight: 500, color: "text.secondary" }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: featured ? "1.6rem" : "1.3rem", lineHeight: 1.15 }}>
          {loading ? "—" : count}
          {capped ? "+" : ""}
        </Typography>
      </Box>
    </Box>
  );
}

function Section({
  id,
  icon,
  tone,
  title,
  count,
  capped,
  hint,
  children,
}: {
  id: string;
  icon: string;
  tone: Tone;
  title: string;
  count: number;
  capped?: boolean;
  hint: string;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" id={id} component="section" aria-label={title} sx={{ minWidth: 0, overflow: "hidden", scrollMarginTop: 80 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={(t) => ({
          alignItems: "center",
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: t.tokens.surface.subtle,
        })}
      >
        <Box sx={{ color: `${tone}.main`, display: "flex" }}>
          <Icon name={icon} size={18} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" component="h2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ lineHeight: 1.3 }}>
            {hint}
          </Typography>
        </Box>
        <Chip size="small" color={count ? tone : "default"} label={`${count}${capped ? "+" : ""}`} sx={{ fontWeight: 700, minWidth: 32 }} />
      </Stack>
      <Box sx={{ p: 1 }}>{children}</Box>
      {capped && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, pb: 1 }}>
          Showing the most recent entries only — use search to find others.
        </Typography>
      )}
    </Paper>
  );
}

function Loading() {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", p: 1.5 }}>
      Loading…
    </Typography>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
      {text}
    </Typography>
  );
}

/** Page through `rows`; pages reset when the parent re-keys the list. */
function usePaged<T>(rows: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return { page: current, pages, setPage, slice: rows.slice(start, start + pageSize), start, end: Math.min(start + pageSize, rows.length) };
}

function Pager({ page, pages, setPage, start, end, total }: { page: number; pages: number; setPage: (n: number) => void; start: number; end: number; total: number }) {
  if (pages <= 1) return null;
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", px: 0.5, pt: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Showing {start + 1}–{end} of {total}
      </Typography>
      <Pagination size="small" shape="rounded" color="primary" count={pages} page={page} onChange={(_e, n) => setPage(n)} />
    </Stack>
  );
}

const rowBase = (t: Theme) => ({
  width: "100%",
  textAlign: "left" as const,
  font: "inherit",
  color: "inherit",
  bgcolor: "background.paper",
  border: 0,
  borderBottom: `1px solid ${t.palette.divider}`,
  cursor: "pointer",
  px: 1,
  py: 0.875,
  transition: t.transitions.create("background-color", { duration: 120 }),
  "&:last-of-type": { borderBottom: 0 },
  "&:hover:not(:disabled)": { bgcolor: t.tokens.surface.subtle },
  "&:focus-visible": { outline: `2px solid ${t.palette.secondary.main}`, outlineOffset: -2 },
  "&:disabled": { cursor: "not-allowed", opacity: 0.65 },
});

function PatientAvatar({ name, src, size = 34 }: { name: string; src: string | null; size?: number }) {
  return (
    <Avatar src={src ?? undefined} sx={{ width: size, height: size, fontSize: size * 0.38, fontWeight: 700, bgcolor: "secondary.main" }}>
      {getInitials(name)}
    </Avatar>
  );
}

/* ── All my patients: one patient per row ─────────────────────────────── */

/** md+ column template; on phones a row becomes a two-line card. */
const PATIENT_COLS = "minmax(190px, 2.2fr) minmax(96px, 1fr) minmax(70px, 0.7fr) minmax(104px, 1fr) minmax(104px, 1fr) 54px minmax(150px, 1.4fr) 64px";

function PatientTable({
  data,
  date,
  isToday,
  pageSize,
  onOpen,
}: {
  data: Workbench | undefined;
  date: string;
  isToday: boolean;
  pageSize: number;
  onOpen: (r: RosterEntry) => void;
}) {
  const rows = data?.all.rows ?? [];
  const paged = usePaged(rows, pageSize);

  // Status per patient, read from the real lists (first match wins): a visit
  // on the selected date → its status; else the next upcoming booking; else
  // whether a consultation has been completed.
  const lookup = useMemo(() => {
    const day = new Map<string, WorkbenchVisit>();
    for (const v of data?.today ?? []) if (!day.has(v.patient.id)) day.set(v.patient.id, v);
    const next = new Map<string, WorkbenchVisit>();
    for (const v of data?.upcoming.rows ?? []) if (!next.has(v.patient.id)) next.set(v.patient.id, v);
    const consulted = new Map<string, RosterEntry>();
    for (const r of data?.previous.rows ?? []) consulted.set(r.patient.id, r);
    return { day, next, consulted, consultedComplete: !data?.previous.capped };
  }, [data]);

  const statusOf = (id: string): { label: string; color: ChipTone } | null => {
    const d = lookup.day.get(id);
    if (d) return { label: `${isToday ? "Today" : dayLabel(date, { year: undefined })} · ${VISIT_STATUS[d.status].label}`, color: VISIT_STATUS[d.status].color };
    const u = lookup.next.get(id);
    if (u) return { label: `Upcoming · ${dayLabel(u.date, { year: undefined })}`, color: "info" };
    if (lookup.consulted.has(id)) return { label: "Consulted", color: "success" };
    return lookup.consultedComplete ? { label: "Not yet consulted", color: "warning" } : null;
  };

  if (!rows.length) return <Empty text="No patients yet." />;

  return (
    <Box>
      <Box sx={{ overflowX: { md: "auto" } }}>
        <Box sx={{ minWidth: { md: 940 } }}>
          {/* Column header (md+) */}
          <Box
            aria-hidden
            sx={(t) => ({
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: PATIENT_COLS,
              gap: 1.5,
              px: 1,
              py: 0.75,
              borderRadius: `${t.tokens.radius.sm}px`,
              bgcolor: t.palette.grey[100],
              color: "primary.main",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            })}
          >
            <span>Patient</span>
            <span>Reg. no</span>
            <span>Age / Sex</span>
            <span>Mobile</span>
            <span>Last consultation</span>
            <span>Visits</span>
            <span>Status</span>
            <span />
          </Box>

          {paged.slice.map((r) => {
            const st = statusOf(r.patient.id);
            const last = lookup.consulted.get(r.patient.id)?.lastVisitOn;
            const lastText = last ? dayLabel(last) : lookup.consultedComplete ? "Not yet" : "—";
            return (
              <Box
                key={r.patient.id}
                component="button"
                type="button"
                onClick={() => onOpen(r)}
                aria-label={`Open ${r.patient.name}, ${r.patient.regNo}`}
                sx={(t) => ({
                  ...rowBase(t),
                  display: "grid",
                  alignItems: "center",
                  columnGap: 1.5,
                  rowGap: 0.5,
                  gridTemplateColumns: { xs: "minmax(0, 1fr) auto", md: PATIENT_COLS },
                  gridTemplateAreas: { xs: '"who go" "meta meta"', md: "none" },
                })}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0, gridArea: { xs: "who", md: "auto" } }}>
                  <PatientAvatar name={r.patient.name} src={r.patient.avatarUrl} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: "text.primary" }}>
                      {r.patient.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ display: { md: "none" } }}>
                      {r.patient.regNo} · {ageGender(r.patient.age, r.patient.gender)}
                    </Typography>
                  </Box>
                </Stack>

                {/* md+ cells */}
                <Cell>{r.patient.regNo}</Cell>
                <Cell>{ageGender(r.patient.age, r.patient.gender)}</Cell>
                <Cell>{r.patient.phone ?? "—"}</Cell>
                <Cell>{lastText}</Cell>
                <Cell strong>{r.visitCount}</Cell>
                <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0 }}>{st ? <StatusChip {...st} /> : <Cell>—</Cell>}</Box>
                <Box sx={{ display: { xs: "none", md: "flex" }, justifyContent: "flex-end" }}>
                  <OpenHint />
                </Box>

                {/* phones: a second line with the same facts */}
                <Box sx={{ display: { xs: "flex", md: "none" }, gridArea: "go", color: "secondary.main" }}>
                  <Icon name="FiChevronRight" />
                </Box>
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ display: { xs: "flex", md: "none" }, gridArea: "meta", flexWrap: "wrap", alignItems: "center", gap: 0.75, pl: 5.25 }}
                >
                  {st && <StatusChip {...st} />}
                  <Typography variant="caption" color="text.secondary">
                    {r.patient.phone ? `${r.patient.phone} · ` : ""}Last {lastText} · {r.visitCount} visit{r.visitCount === 1 ? "" : "s"}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Pager {...paged} total={rows.length} />
    </Box>
  );
}

function Cell({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <Typography variant="body2" noWrap sx={{ display: { xs: "none", md: "block" }, minWidth: 0, fontWeight: strong ? 700 : 400, color: strong ? "text.primary" : "text.secondary", fontSize: 13 }}>
      {children}
    </Typography>
  );
}

function StatusChip({ label, color }: { label: string; color: ChipTone }) {
  return <Chip size="small" color={color} variant={color === "default" ? "outlined" : "filled"} label={label} sx={{ height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.875, fontSize: 11.5, fontWeight: 600 } }} />;
}

function OpenHint() {
  return (
    <Box
      component="span"
      aria-hidden
      sx={(t) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        px: 1,
        py: 0.25,
        borderRadius: `${t.tokens.radius.sm}px`,
        border: `1px solid ${alpha(t.palette.secondary.main, 0.35)}`,
        color: "secondary.main",
        fontSize: 12,
        fontWeight: 700,
      })}
    >
      Open <Icon name="FiChevronRight" size={14} />
    </Box>
  );
}
