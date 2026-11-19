"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { FiEye, FiFileText, FiVideo } from "react-icons/fi";
import type { TimelineRow } from "@/types/timeline";

/** "2026-07-02" → "02 Jul 2026". */
export function timelineDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** "14:30" → "2:30 PM". */
function timeLabel(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

/** "Today" / "Yesterday" / "3 months ago" — the orienting hint beside a date. */
function relativeDay(iso: string): string | null {
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * One labelled fact. The LABEL is the quiet part and the VALUE is the loud
 * part. Values wrap rather than truncate — a clipped clinic name is worse than
 * a second line. Identical to the patient record page's `Fact`, deliberately.
 */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 14, color: "text.secondary", lineHeight: 1.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  );
}

/** Where the consultation happened, as one readable phrase. */
const placeOf = (row: TimelineRow): string =>
  row.mode === "video"
    ? "Video consultation"
    : [row.location?.name, row.location?.city].filter(Boolean).join(", ") || "Clinic visit";

/**
 * ONE consultation, as a bounded card inside its date block.
 *
 * The TIME is the identifier, not the date: the block header already states the
 * day, and time is the only thing that reliably separates two visits on one day.
 * Exported because the mobile list and the "recent consultations" strips render
 * the same card.
 */
export function TimelineRowCard({
  row,
  onView,
  onViewDetails,
}: {
  row: TimelineRow;
  onView?: (r: TimelineRow) => void;
  onViewDetails?: (r: TimelineRow) => void;
}) {
  const rx = row.prescription;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: (t) => `${t.tokens.radius.md}px`,
        bgcolor: "background.paper",
        border: (t) => `1px solid ${alpha(t.palette.info.main, 0.25)}`,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
          {timeLabel(row.startTime) ?? "Time not recorded"}
        </Typography>
        <Typography sx={{ fontSize: 15, color: "text.secondary" }}>· {row.doctor.name ?? "—"}</Typography>
        {row.mode === "video" && (
          <Chip size="small" variant="outlined" icon={<FiVideo />} label="Video" sx={{ fontWeight: 600 }} />
        )}
      </Stack>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Fact label="Where" value={placeOf(row)} />
        </Grid>
        {row.doctor.specialization && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <Fact label="Speciality" value={row.doctor.specialization} />
          </Grid>
        )}
        {row.bookedBy?.name && (
          <Grid size={{ xs: 6, sm: 4 }}>
            <Fact label="Arranged by" value={row.bookedBy.name} />
          </Grid>
        )}
        {row.issue && (
          <Grid size={{ xs: 12, sm: 8 }}>
            <Fact label="Issue" value={row.issue} />
          </Grid>
        )}
        {rx && (
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Prescription</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.25, flexWrap: "wrap", gap: 0.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{rx.rxNumber ?? "On file"}</Typography>
              {/* `canView` false means the server sent no id — there is nothing
                  to fetch, so the button must not exist rather than exist and fail. */}
              {rx.canView && rx.id && onView && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FiFileText />}
                  onClick={() => onView(row)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                  aria-label={`View prescription ${rx.rxNumber ?? ""} from ${timelineDate(row.date)}`}
                >
                  View PDF
                </Button>
              )}
            </Stack>
          </Grid>
        )}
      </Grid>

      {onViewDetails && (
        <Button
          size="small"
          variant="text"
          startIcon={<FiEye />}
          onClick={() => onViewDetails(row)}
          sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
          aria-label={`Open patient details for the consultation on ${timelineDate(row.date)}`}
        >
          View details
        </Button>
      )}
    </Box>
  );
}

export interface TreatmentTimelineTableProps {
  rows: TimelineRow[];
  /** Omit to render the prescription cell read-only. */
  onViewPrescription?: (row: TimelineRow) => void;
  /**
   * Doctor view: opens that consultation's full patient page (vitals, notes,
   * reports). Omit to hide the action.
   */
  onViewDetails?: (row: TimelineRow) => void;
}

/**
 * The treatment timeline as ONE BLOCK PER DATE — the same layout as the patient
 * record page, so a doctor moving between the two reads one design rather than
 * two.
 *
 * Was a five-column table. The table made a medical history look like a
 * spreadsheet: two visits on one day appeared as two unrelated rows, the date
 * repeated on every line, and below `sm` it collapsed to a different layout
 * altogether. Grouping by date says what actually happened — this day, these
 * visits — and reads identically at every width, so nothing scrolls sideways.
 */
export function TreatmentTimelineTable({ rows, onViewPrescription, onViewDetails }: TreatmentTimelineTableProps) {
  // Group by calendar day, PRESERVING the order the caller sent (the sort
  // filter is newest/oldest-first and must survive grouping). Map keeps
  // insertion order, so the groups come out correctly sorted for free.
  const groups: { date: string; items: TimelineRow[] }[] = [];
  const byDate = new Map<string, TimelineRow[]>();
  for (const row of rows) {
    const key = row.date.slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) bucket.push(row);
    else {
      const created: TimelineRow[] = [row];
      byDate.set(key, created);
      groups.push({ date: key, items: created });
    }
  }

  return (
    <Stack spacing={2}>
      {groups.map((g) => {
        const relative = relativeDay(g.date);
        return (
          <Paper
            key={g.date}
            variant="outlined"
            sx={{
              p: { xs: 1.75, sm: 2.25 },
              borderRadius: (t) => `${t.tokens.radius.lg}px`,
              borderColor: (t) => alpha(t.palette.info.main, 0.28),
              borderLeft: (t) => `5px solid ${alpha(t.palette.info.main, 0.55)}`,
              bgcolor: (t) => alpha(t.palette.info.main, t.palette.mode === "dark" ? 0.09 : 0.045),
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ alignItems: "baseline", flexWrap: "wrap", gap: 1, mb: 1.5 }}
            >
              <Typography sx={{ fontSize: 21, fontWeight: 700, lineHeight: 1.15 }}>
                {timelineDate(g.date)}
              </Typography>
              {relative && (
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{relative}</Typography>
              )}
              {g.items.length > 1 && (
                <Chip size="small" label={`${g.items.length} consultations`} sx={{ fontWeight: 700 }} />
              )}
            </Stack>

            <Stack spacing={1.25}>
              {g.items.map((row) => (
                <TimelineRowCard
                  key={row.bookingId}
                  row={row}
                  onView={onViewPrescription}
                  onViewDetails={onViewDetails}
                />
              ))}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
