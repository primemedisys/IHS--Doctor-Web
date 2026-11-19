"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { EmptyState, ErrorState, Loading } from "@/components/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import { useMyPatients, useSetPatientStatus } from "../hooks";
import { timelineDate } from "./TreatmentTimelineTable";
import type { MyPatientsQuery, PatientStatus } from "@/types/timeline";

const PAGE_SIZE = 20;

const initials = (name: string | null) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * The doctor's four categories (their own list, in their order). Colour is a
 * scanning aid on top of the label, never the only signal.
 */
const STATUS_META: Record<PatientStatus, { label: string; color: "info" | "success" | "warning" | "secondary" }> = {
  new_patient: { label: "New patient", color: "success" },
  opd_followup: { label: "OPD follow-up", color: "info" },
  surgery_pending: { label: "Surgery pending", color: "warning" },
  surgery_followup: { label: "Surgery follow-up", color: "secondary" },
};
const STATUS_ORDER: PatientStatus[] = ["new_patient", "opd_followup", "surgery_pending", "surgery_followup"];

const SORTS: { value: MyPatientsQuery["sort"]; label: string }[] = [
  { value: "recent", label: "Last visit: newest" },
  { value: "oldest", label: "Last visit: oldest" },
  { value: "name", label: "Name A–Z" },
  { value: "visits", label: "Most visits" },
];

/** The coloured dot + label a status renders as, in the select and the menu. */
function StatusLabel({ status }: { status: PatientStatus }) {
  const meta = STATUS_META[status];
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
      <Box sx={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, bgcolor: `${meta.color}.main` }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
        {meta.label}
      </Typography>
    </Stack>
  );
}

const genderLabel = (g: string | null) => (g ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase() : null);

/**
 * My Patients — everyone this doctor has treated (docs/treatment-timeline §5.4).
 * Derived server-side from the doctor's own bookings; never a directory of
 * platform patients. Search (name / mobile / registration no.), category,
 * sorting and pages all run on the server, so a long roster stays fast.
 *
 * Read-only for the patient: the row opens the review profile (no editing of
 * the patient's own details or of past records). The status here is the
 * doctor's own label for the patient — kept editable, as before.
 */
export function MyPatientsTable() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<PatientStatus | "all">("all");
  const [sort, setSort] = useState<MyPatientsQuery["sort"]>("recent");
  const [page, setPage] = useState(1);

  // Search after a short pause, not on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(input.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [input]);

  const query: MyPatientsQuery = { q: q || undefined, page, limit: PAGE_SIZE, sort, status: category === "all" ? undefined : category };
  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } = useMyPatients(query);
  const setStatus = useSetPatientStatus();

  const filtered = Boolean(q) || category !== "all";
  const open = (id: string) => router.push(ROUTES.dashboard.patientTimeline(id));
  const head = { fontWeight: 700, whiteSpace: "nowrap" as const, color: "text.secondary", fontSize: 12.5 };

  if (isLoading) return <Loading label="Loading your patients…" />;
  if (isError || !data) return <ErrorState title="Couldn't load your patients" description={getErrorMessage(error)} onRetry={() => refetch()} />;

  if (data.total === 0 && !filtered) {
    return (
      <EmptyState icon="FiUsers" title="No patients yet" description="They'll appear here after your first confirmed consultation." />
    );
  }

  return (
    <Stack spacing={1.5}>
      {/* Toolbar: search · category · sort */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} sx={{ alignItems: { md: "center" } }}>
        <TextField
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name, mobile or registration no.…"
          sx={{ flex: { md: "1 1 320px" }, maxWidth: { md: 420 }, bgcolor: "background.paper" }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <FiSearch />
                </InputAdornment>
              ),
              endAdornment: input ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setInput("")} aria-label="Clear search">
                    <FiX />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <Select<PatientStatus | "all">
          size="small"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as PatientStatus | "all");
            setPage(1);
          }}
          sx={{ minWidth: 210, bgcolor: "background.paper" }}
          aria-label="Filter patients by category"
          renderValue={(v) =>
            v === "all" ? <Typography variant="body2" sx={{ fontWeight: 600 }}>Category: All patients</Typography> : <StatusLabel status={v} />
          }
        >
          <MenuItem value="all">All patients</MenuItem>
          {STATUS_ORDER.map((sKey) => (
            <MenuItem key={sKey} value={sKey}>
              <StatusLabel status={sKey} />
            </MenuItem>
          ))}
        </Select>
        <Select<MyPatientsQuery["sort"]>
          size="small"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as MyPatientsQuery["sort"]);
            setPage(1);
          }}
          sx={{ minWidth: 190, bgcolor: "background.paper" }}
          aria-label="Sort patients"
        >
          {SORTS.map((s) => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </Select>
        <Typography variant="body2" color="text.secondary" sx={{ ml: { md: "auto" }, whiteSpace: "nowrap" }}>
          {data.total} patient{data.total === 1 ? "" : "s"}
        </Typography>
      </Stack>

      {data.patients.length === 0 ? (
        // A no-match state must not read like an empty roster.
        <EmptyState
          icon="FiSearch"
          title="No matching patients"
          description={`${q ? `Nothing matches "${q}"` : "No patients"}${category !== "all" ? ` in ${STATUS_META[category].label.toLowerCase()}` : ""}.`}
        />
      ) : (
        <Card variant="outlined" sx={{ overflow: "hidden" }}>
          {isFetching && isPlaceholderData && <LinearProgress sx={{ height: 2 }} />}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 960, "& td, & th": { py: 1 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={head}>Patient</TableCell>
                  <TableCell sx={head}>Reg. no.</TableCell>
                  <TableCell sx={head}>Age / Gender</TableCell>
                  <TableCell sx={head}>Mobile</TableCell>
                  <TableCell sx={head}>Last consultation</TableCell>
                  <TableCell sx={head} align="center">Total visits</TableCell>
                  <TableCell sx={head}>Status</TableCell>
                  <TableCell sx={head} align="right">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.patients.map((p) => {
                  const ageGender = [p.patient.age != null ? `${p.patient.age} y` : null, genderLabel(p.patient.gender)].filter(Boolean).join(" · ");
                  return (
                    <TableRow key={p.patient.id} hover sx={{ cursor: "pointer" }} onClick={() => open(p.patient.id)}>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                          <Avatar src={p.patient.photoUrl ?? undefined} sx={{ width: 34, height: 34, fontSize: 13 }}>
                            {initials(p.patient.name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap sx={{ maxWidth: 220 }}>{p.patient.name ?? "Unnamed"}</Typography>
                            {p.address && (
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 220 }} title={p.address}>
                                {p.address}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{p.patient.regNo ?? "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{ageGender || "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{p.patient.phone ?? "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.lastSeenOn ? timelineDate(p.lastSeenOn) : "—"}</Typography>
                        {p.lastBookingId && <Typography variant="caption" color="text.secondary">Consultation #{p.lastBookingId}</Typography>}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>{p.consultationCount}</TableCell>
                      {/* stopPropagation: this cell is a control, the row opens the profile. */}
                      <TableCell onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: "nowrap" }}>
                        <Select<PatientStatus>
                          size="small"
                          value={p.status}
                          disabled={setStatus.isPending}
                          onChange={(e) =>
                            setStatus.mutate(
                              { patientId: p.patient.id, status: e.target.value as PatientStatus },
                              {
                                onSuccess: () => toast.success("Status updated"),
                                onError: (err) => toast.error(getErrorMessage(err)),
                              },
                            )
                          }
                          renderValue={(v) => <StatusLabel status={v} />}
                          sx={{
                            minWidth: 180,
                            bgcolor: (t) => alpha(t.palette[STATUS_META[p.status].color].main, 0.08),
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: (t) => alpha(t.palette[STATUS_META[p.status].color].main, 0.4) },
                          }}
                          aria-label={`Status for ${p.patient.name ?? "patient"}`}
                        >
                          {STATUS_ORDER.map((sKey) => (
                            <MenuItem key={sKey} value={sKey}>
                              <StatusLabel status={sKey} />
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Button size="small" variant="outlined" onClick={() => open(p.patient.id)}>View details</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {(data.totalPages ?? 1) > 1 && <Pagination count={data.totalPages ?? 1} page={page} onChange={setPage} />}
    </Stack>
  );
}
