"use client";

/**
 * Diagnosis Records — every diagnosis as the doctor who made it recorded it.
 *
 * Nothing is merged or overwritten: two doctors' diagnoses are two rows, each
 * with its own author, specialty, date and consultation. "Evolution" groups
 * entries that share an ICD code (else the same name) in date order — it shows
 * what was recorded, not a conclusion about which entry replaced which. The
 * comparison lists differences between two entries and never picks a winner.
 *
 * The record stores a diagnosis type (provisional / final / differential) but
 * no resolved / under-review lifecycle, so none is shown.
 */
import { Fragment, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory } from "../hooks";
import { dayLabel } from "../format";
import { OthersHiddenLine } from "../components/RecordAccess";
import { RecordsFrame, Muted, Facts } from "./RecordsKit";
import { TimelinePanel } from "./TimelinePanel";
import { DiagnosisDetail } from "./DiagnosisDetail";
import { conditionKey, diagnosisRows, diagnosisTypeLabel, evidenceOf, visitOf, type DiagnosisRow } from "./derive";
import type { MedicalHistory } from "@/types/emr";

const PAGE_BG = "linear-gradient(135deg, #FFF7F0 0%, #FAF6FF 45%, #F0FAFF 100%)";
const CARD_BORDER = "#E9E7F4";
const CARD_SHADOW = "0 10px 28px rgba(84, 76, 184, 0.07)";
const SOFT = "0 2px 8px rgba(16, 24, 40, 0.05)";
const subtle = { fontSize: 11.5, color: "text.secondary", lineHeight: 1.35, overflowWrap: "anywhere" } as const;

const TYPE_TONE: Record<string, CardTone> = {
  provisional: "orange",
  final: "green",
  differential: "purple",
  "from prescription": "blue",
};
const toneOfType = (t: string): CardTone => TYPE_TONE[t] ?? "gray";

export function DiagnosisRecordsPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="diagnosis-records">
      {(_ws, currentBookingId) => <Body patientId={patientId} currentBookingId={currentBookingId} />}
    </RecordsFrame>
  );
}

function Body({ patientId, currentBookingId }: { patientId: string; currentBookingId: string | null }) {
  const q = useMedicalHistory(patientId);
  if (q.isError) return <ErrorState title="Couldn't load the diagnoses" description={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={96} />)}</Stack>;
  return <Loaded h={q.data} patientId={patientId} currentBookingId={currentBookingId} />;
}

function Loaded({ h, patientId, currentBookingId }: { h: MedicalHistory; patientId: string; currentBookingId: string | null }) {
  const rows = useMemo(() => diagnosisRows(h), [h]);
  const [type, setType] = useState("");
  const [doctor, setDoctor] = useState("");
  const shown = rows.filter((r) => (!type || r.type === type) && (!doctor || r.doctor.name === doctor));
  const doctors = [...new Set(rows.map((r) => r.doctor.name))].sort();
  const types = [...new Set(rows.map((r) => r.type))];
  const count = (t: string) => rows.filter((r) => r.type === t).length;
  const current = rows.filter((r) => currentBookingId && r.bookingId === currentBookingId);
  const chronic = h.longTermConditions;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"date" | "doctor">("date");
  const opened = openKey ? rows.find((r) => r.key === openKey) ?? null : null;
  if (opened) return <DiagnosisDetail r={opened} h={h} patientId={patientId} onBack={() => setOpenKey(null)} />;

  const doctorCount = new Set(rows.map((r) => r.doctor.id ?? r.doctor.name)).size;

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 }, borderRadius: { xs: 3, md: 4 }, border: 1, borderColor: "#EFE9F6", background: PAGE_BG, minWidth: 0 }}>
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "repeat(2, minmax(0,1fr))", sm: "repeat(3, minmax(0,1fr))", lg: "repeat(5, minmax(0,1fr))" } }}>
          <DxStat tone="blue" icon="FiSearch" label="Total diagnoses" value={String(rows.length)} note={`From ${doctorCount} doctor${doctorCount === 1 ? "" : "s"}`} />
          <DxStat tone="purple" icon="FiActivity" label="This consultation" value={String(current.length)} note={currentBookingId ? `Consultation #${currentBookingId}` : "No active consultation"} />
          <DxStat tone="teal" icon="FiClock" label="Previous" value={String(rows.length - current.length)} note="Earlier consultations" />
          <DxStat tone="orange" icon="FiFileText" label="Provisional / Final" value={`${count("provisional")} / ${count("final")}`} note="By recorded type" />
          <DxStat tone="green" icon="FiCalendar" label="Latest diagnosis" value={dayLabel(rows[0]?.date)} note={rows[0]?.name ?? "None recorded"} small />
        </Box>

        <OthersHiddenLine category="diagnoses" />

        <Panel title="Chronic and long-term conditions" icon="FiHeart" tone="purple" hint="Entered separately from diagnoses">
          {chronic.length === 0 ? (
            <EmptyBlock icon="FiHeart" title="No long-term conditions" text="None recorded for this patient." />
          ) : (
            <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: "wrap" }}>
              {chronic.map((c) => (
                <Chip
                  key={c.id}
                  size="small"
                  icon={<Icon name="FiActivity" size={12} />}
                  label={`${c.title ?? "Condition"}${c.author?.name ? ` · ${c.author.name}` : ""}`}
                  sx={{ bgcolor: CARD_TONES.purple.bg, color: CARD_TONES.purple.heading, border: 1, borderColor: CARD_TONES.purple.border, fontWeight: 700, "& .MuiChip-icon": { color: CARD_TONES.purple.fg } }}
                />
              ))}
            </Stack>
          )}
        </Panel>

        <Panel
          title="Diagnosis history"
          icon="FiClipboard"
          tone="orange"
          hint={`${shown.length} of ${rows.length} record${rows.length === 1 ? "" : "s"} · ${groupBy === "date" ? "newest first" : "grouped by doctor"}`}
          actions={
            <Button
              size="small"
              onClick={() => setGroupBy((g) => (g === "date" ? "doctor" : "date"))}
              startIcon={<Icon name={groupBy === "date" ? "FiUsers" : "FiCalendar"} />}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {groupBy === "date" ? "Group by doctor" : "Sort by date"}
            </Button>
          }
        >
          <Box sx={{ display: "grid", gap: 1, mb: 1.5, p: { xs: 1, sm: 1.25 }, gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2, minmax(0,1fr))", md: "repeat(3, minmax(0,1fr))" }, borderRadius: 2.5, bgcolor: "#FFF9F2", border: 1, borderColor: "#F6E7D4" }}>
            <TextField fullWidth select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <MenuItem value="">All types</MenuItem>
              {types.map((t) => <MenuItem key={t} value={t}>{diagnosisTypeLabel(t)}</MenuItem>)}
            </TextField>
            <TextField fullWidth select size="small" label="Doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
              <MenuItem value="">All doctors</MenuItem>
              {doctors.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <Button
              size="small"
              disabled={!type && !doctor}
              onClick={() => { setType(""); setDoctor(""); }}
              sx={{ alignSelf: "center", justifySelf: { xs: "start", md: "end" } }}
            >
              Clear filters
            </Button>
          </Box>
          {shown.length === 0 ? (
            <EmptyBlock icon="FiSearch" title="No matching diagnoses" text={rows.length ? "No diagnoses match these filters." : "No diagnosis history available."} />
          ) : (
            <DiagnosisTable rows={shown} h={h} groupBy={groupBy} onOpen={(r) => setOpenKey(r.key)} />
          )}
          {h.capped.consultations && <Typography sx={{ ...subtle, mt: 1 }}>Showing the most recent consultations; older diagnoses are not loaded.</Typography>}
        </Panel>

        <Panel title="Diagnosis evolution" icon="FiTrendingUp" tone="blue" hint="Entries for the same condition (same ICD code, else same name), oldest to newest">
          <Evolution rows={rows} />
        </Panel>

        <Panel title="Compare two diagnoses" icon="FiColumns" tone="teal" hint="Shows differences only — it does not decide which doctor is right">
          <Compare rows={rows} h={h} />
        </Panel>

        <Panel title="Diagnosis timeline" icon="FiActivity" tone="purple" hint="The patient's chronological timeline, filtered by the server">
          <TimelinePanel patientId={patientId} defaultGroup="diagnoses" groups={["diagnoses"]} />
        </Panel>
      </Stack>
    </Box>
  );
}

function DxStat({ tone, icon, label, value, note, small }: { tone: CardTone; icon: string; label: string; value: string; note: string; small?: boolean }) {
  const t = CARD_TONES[tone];
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        p: { xs: 1.2, sm: 1.4 },
        borderRadius: 3,
        border: 1,
        borderColor: t.border,
        background: `linear-gradient(150deg, ${t.bg} 0%, #FFFFFF 86%)`,
        boxShadow: CARD_SHADOW,
        minWidth: 0,
      }}
    >
      <Box aria-hidden sx={{ position: "absolute", right: -24, top: -24, width: 80, height: 80, borderRadius: "50%", bgcolor: t.bg, opacity: 0.85 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", position: "relative", minWidth: 0 }}>
        <Box sx={{ width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, borderRadius: "50%", bgcolor: t.fg, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 6px 14px ${t.border}` }}>
          <Icon name={icon} size={17} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: t.heading, fontWeight: 800, fontSize: small ? { xs: 11.5, sm: 12.5 } : { xs: 19, sm: 23 }, lineHeight: 1.2, overflowWrap: "anywhere" }}>{value}</Typography>
          <Typography sx={{ color: t.heading, fontWeight: 700, fontSize: 11.5, lineHeight: 1.3 }}>{label}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 10, lineHeight: 1.35, mt: 0.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function Panel({ title, hint, icon, tone, children, actions }: { title: string; hint?: string; icon: string; tone: CardTone; children: React.ReactNode; actions?: React.ReactNode }) {
  const t = CARD_TONES[tone];
  return (
    <Paper elevation={0} component="section" sx={{ borderRadius: 3, border: 1, borderColor: CARD_BORDER, bgcolor: "#FFFFFF", boxShadow: CARD_SHADOW, minWidth: 0, overflow: "hidden" }}>
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", gap: 1, px: { xs: 1.25, sm: 1.75 }, py: 1.25, borderBottom: 1, borderColor: "#F0EDF8", background: `linear-gradient(90deg, ${t.bg} 0%, rgba(255,255,255,0) 92%)` }}>
        <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: t.fg, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 4px 10px ${t.border}` }}>
          <Icon name={icon} size={15} />
        </Box>
        <Typography component="h2" sx={{ fontWeight: 800, fontSize: 15, color: t.heading, letterSpacing: "-0.01em" }}>{title}</Typography>
        {hint && <Typography sx={{ ...subtle, flex: 1, minWidth: 100 }}>{hint}</Typography>}
        {!hint && <Box sx={{ flex: 1 }} />}
        {actions}
      </Stack>
      <Box sx={{ p: { xs: 1.25, sm: 1.75 }, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

function DoctorAvatar({ name, photoUrl, size = 28 }: { name: string; photoUrl: string | null; size?: number }) {
  return (
    <Avatar
      src={photoUrl ?? undefined}
      alt={name}
      sx={{ width: size, height: size, bgcolor: CARD_TONES.blue.bg, color: CARD_TONES.blue.fg, fontWeight: 800, fontSize: size / 2.5, border: "2px solid #fff", boxShadow: SOFT }}
    >
      {name.replace(/^dr\.?\s*/i, "").slice(0, 1)}
    </Avatar>
  );
}

function TypeChip({ type }: { type: string }) {
  const t = CARD_TONES[toneOfType(type)];
  return <Chip size="small" label={diagnosisTypeLabel(type)} sx={{ height: 21, bgcolor: t.bg, color: t.heading, border: 1, borderColor: t.border, fontWeight: 700, fontSize: 10.5 }} />;
}

function DiagnosisTable({ rows, h, groupBy, onOpen }: { rows: DiagnosisRow[]; h: MedicalHistory; groupBy: "date" | "doctor"; onOpen: (r: DiagnosisRow) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const t = CARD_TONES.orange;
  const th = {
    textAlign: "left",
    color: t.heading,
    bgcolor: t.bg,
    fontWeight: 800,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    py: 1.1,
    px: 1.35,
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${t.border}`,
  } as const;

  const groups = useMemo(() => {
    if (groupBy === "date") return [{ key: "__all", label: null as string | null, rows }];
    const m = new Map<string, DiagnosisRow[]>();
    rows.forEach((r) => {
      const k = r.doctor.id ?? r.doctor.name;
      (m.get(k) ?? m.set(k, []).get(k)!).push(r);
    });
    return [...m.entries()].map(([k, list]) => ({ key: k, label: list[0].doctor.name, rows: list }));
  }, [rows, groupBy]);

  const photoFor = (r: DiagnosisRow) => {
    const v = visitOf(h, r.bookingId);
    return v?.doctor && r.doctor.id && v.doctor.id === r.doctor.id ? v.doctor.photoUrl ?? null : null;
  };

  return (
    <Box sx={{ overflowX: "auto", border: 1, borderColor: CARD_BORDER, borderRadius: 2.5, boxShadow: SOFT }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          minWidth: 940,
          "& td": { py: 1.05, px: 1.35, borderTop: 1, borderColor: "#EEF0F7", verticalAlign: "middle" },
          "& tbody tr[data-row]": { cursor: "pointer", transition: "background 120ms ease" },
          "& tbody tr[data-row]:hover": { bgcolor: "#FFF8F0" },
          "& tbody tr[data-row][data-open='true']": { bgcolor: "#FFF6EC" },
        }}
      >
        <colgroup>
          <col style={{ width: "112px" }} />
          <col style={{ width: "23%" }} />
          <col style={{ width: "122px" }} />
          <col style={{ width: "176px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "44px" }} />
        </colgroup>
        <Box component="thead">
          <tr>{["Date", "Diagnosis", "Type", "Doctor", "Consultation", "Supporting findings", ""].map((c, i) => <Box component="th" key={i} sx={th}>{c}</Box>)}</tr>
        </Box>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.key}>
              {g.label && (
                <tr>
                  <Box component="td" colSpan={7} sx={{ bgcolor: t.bg, py: 0.75 }}>
                    <Stack direction="row" useFlexGap sx={{ gap: 0.9, alignItems: "center", flexWrap: "wrap" }}>
                      <DoctorAvatar name={g.label} photoUrl={photoFor(g.rows[0])} size={24} />
                      <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: t.heading }}>{g.label}</Typography>
                      <Chip size="small" label={`${g.rows.length} record${g.rows.length === 1 ? "" : "s"}`} sx={{ height: 19, bgcolor: "#fff", color: t.heading, border: 1, borderColor: t.border, fontWeight: 700, fontSize: 10, "& .MuiChip-label": { px: 0.9 } }} />
                    </Stack>
                  </Box>
                </tr>
              )}
              {g.rows.map((r) => {
                const v = visitOf(h, r.bookingId);
                const clinic = v?.clinic?.name ?? null;
                const ev = evidenceOf(h, r.bookingId);
                const tone = CARD_TONES[toneOfType(r.type)];
                const isOpen = expanded === r.key;
                const findings = ev.findings.length ? `${ev.findings.slice(0, 2).join(", ")}${ev.findings.length > 2 ? ` +${ev.findings.length - 2}` : ""}` : "None recorded";
                return (
                  <Fragment key={r.key}>
                    <tr data-row data-open={isOpen} onClick={() => setExpanded(isOpen ? null : r.key)}>
                      <td>
                        <Typography sx={{ fontWeight: 800, fontSize: 11.5, color: tone.fg, lineHeight: 1.3 }}>{dayLabel(r.date)}</Typography>
                      </td>
                      <td>
                        <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#1D2433", lineHeight: 1.3, overflowWrap: "anywhere" }}>{r.name}</Typography>
                        {r.code && <Chip size="small" label={[r.codeSystem, r.code].filter(Boolean).join(" ")} sx={{ mt: 0.4, height: 19, fontFamily: "monospace", fontWeight: 700, fontSize: 10, bgcolor: tone.bg, color: tone.heading, border: 1, borderColor: tone.border }} />}
                      </td>
                      <td><TypeChip type={r.type} /></td>
                      <td>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
                          <DoctorAvatar name={r.doctor.name} photoUrl={photoFor(r)} size={24} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{r.doctor.name}</Typography>
                            {r.specialties.length > 0 && <Typography sx={{ ...subtle, fontSize: 10 }}>{r.specialties.join(", ")}</Typography>}
                          </Box>
                        </Stack>
                      </td>
                      <td>
                        <Typography sx={{ fontWeight: 700, fontSize: 11.5, color: "#475467", lineHeight: 1.3 }}>{r.bookingId ? `#${r.bookingId}` : "No link"}</Typography>
                        {clinic && <Typography sx={{ ...subtle, fontSize: 10 }}>{clinic}</Typography>}
                      </td>
                      <td>
                        <Typography sx={{ fontSize: 11.5, lineHeight: 1.35, color: ev.findings.length ? "#475467" : "text.secondary", overflowWrap: "anywhere" }}>{findings}</Typography>
                        {ev.investigations.length > 0 && <Typography sx={{ ...subtle, fontSize: 10 }}>{ev.investigations.length} investigation{ev.investigations.length === 1 ? "" : "s"} advised</Typography>}
                      </td>
                      <td>
                        <IconButton size="small" aria-label={isOpen ? "Collapse details" : "Expand details"} sx={{ color: tone.fg }}>
                          <Box sx={{ display: "grid", placeItems: "center", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}>
                            <Icon name="FiChevronDown" size={16} />
                          </Box>
                        </IconButton>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <Box component="td" colSpan={7} sx={{ p: 0, bgcolor: "#FFFCF8" }}>
                          <Box sx={{ p: { xs: 1.25, sm: 1.5 } }}>
                            <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: "#FFFFFF", border: 1, borderColor: "#F6E7D4", mb: 1 }}>
                              <Facts
                                items={[
                                  { k: "ICD description", v: r.codeDescription },
                                  { k: "Remarks", v: r.entry?.remarks },
                                  { k: "Recorded from", v: r.source === "prescription" ? "Written on a prescription (no structured entry)" : "Structured diagnosis entry" },
                                  { k: "Supporting findings (same consultation)", v: ev.findings.join(", ") || "None recorded" },
                                  { k: "Investigations advised (same consultation)", v: ev.investigations.join(", ") || "None recorded" },
                                ]}
                              />
                            </Box>
                            <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); onOpen(r); }} startIcon={<Icon name="FiActivity" />} sx={{ borderRadius: 2 }}>
                              Open diagnosis dashboard
                            </Button>
                          </Box>
                        </Box>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function Evolution({ rows }: { rows: DiagnosisRow[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, DiagnosisRow[]>();
    for (const r of rows) m.set(conditionKey(r), [...(m.get(conditionKey(r)) ?? []), r]);
    return [...m.values()].filter((g) => g.length > 1).map((g) => [...g].sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? ""))));
  }, [rows]);
  if (groups.length === 0) return <EmptyBlock icon="FiTrendingUp" title="No progression to show" text="No condition has been recorded more than once." />;
  return (
    <Stack spacing={1.5}>
      {groups.map((g) => {
        const t = CARD_TONES.blue;
        return (
          <Box key={conditionKey(g[0])} sx={{ p: 1.35, borderRadius: 2.5, border: 1, borderColor: CARD_BORDER, bgcolor: "#FBFDFF", minWidth: 0 }}>
            <Stack direction="row" useFlexGap sx={{ gap: 0.75, alignItems: "center", flexWrap: "wrap", mb: 1 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: t.bg, color: t.fg, display: "grid", placeItems: "center" }}>
                <Icon name="FiTrendingUp" size={12} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{g[0].name}{g[0].code ? ` (${g[0].code})` : ""}</Typography>
              <Chip size="small" label={`${g.length} entries`} sx={{ height: 20, bgcolor: t.bg, color: t.heading, fontWeight: 700, fontSize: 10 }} />
            </Stack>
            <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {g.map((r, i) => {
                const tone = CARD_TONES[toneOfType(r.type)];
                return (
                  <Box key={r.key} component="li" sx={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr)", columnGap: 1 }}>
                    <Box sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
                      {i < g.length - 1 && <Box aria-hidden sx={{ position: "absolute", top: 20, bottom: -4, width: 2, bgcolor: tone.border, borderRadius: 1 }} />}
                      <Box sx={{ mt: 0.4, width: 18, height: 18, borderRadius: "50%", bgcolor: tone.fg, boxShadow: `0 0 0 3px ${tone.bg}`, zIndex: 1 }} />
                    </Box>
                    <Box sx={{ pb: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
                        <b>{dayLabel(r.date)}</b> — {diagnosisTypeLabel(r.type)} · {r.doctor.name}
                        {r.specialties.length ? ` (${r.specialties.join(", ")})` : ""}
                        {r.bookingId ? ` · consultation #${r.bookingId}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function Compare({ rows, h }: { rows: DiagnosisRow[]; h: MedicalHistory }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const A = rows.find((r) => r.key === a);
  const B = rows.find((r) => r.key === b);
  if (rows.length < 2) return <EmptyBlock icon="FiColumns" title="Nothing to compare" text="At least two diagnoses are needed to compare." />;
  const label = (r: DiagnosisRow) => `${dayLabel(r.date)} · ${r.name} · ${r.doctor.name}`;
  const diffs: string[] = [];
  if (A && B) {
    if (A.name.trim().toLowerCase() !== B.name.trim().toLowerCase()) diffs.push("Different diagnosis names");
    if ((A.code ?? "") !== (B.code ?? "")) diffs.push(`Different ICD codes (${A.code ?? "none"} vs ${B.code ?? "none"})`);
    if (A.type !== B.type) diffs.push(`Different types (${diagnosisTypeLabel(A.type)} vs ${diagnosisTypeLabel(B.type)})`);
    if (A.doctor.name !== B.doctor.name) diffs.push("Recorded by different doctors");
    if (A.specialties.join() !== B.specialties.join()) diffs.push("Different specialties");
    if (A.bookingId !== B.bookingId) diffs.push("Recorded in different consultations");
    if (!diffs.length) diffs.push("No differences in the recorded fields");
  }
  const tone = CARD_TONES.teal;
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap" }}>
        {([["First", a, setA], ["Second", b, setB]] as const).map(([name, val, set]) => (
          <TextField fullWidth={false} key={name} select size="small" label={name} value={val} onChange={(e) => set(e.target.value)} sx={{ minWidth: 260, flex: 1 }}>
            {rows.map((r) => <MenuItem key={r.key} value={r.key} disabled={r.key === (name === "First" ? b : a)}>{label(r)}</MenuItem>)}
          </TextField>
        ))}
      </Stack>
      {A && B && (
        <>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2, minmax(0,1fr))" } }}>
            {[A, B].map((r) => {
              const ev = evidenceOf(h, r.bookingId);
              const rt = CARD_TONES[toneOfType(r.type)];
              return (
                <Box key={r.key} sx={{ border: 1, borderColor: rt.border, borderRadius: 2.5, overflow: "hidden", minWidth: 0 }}>
                  <Box sx={{ px: 1.25, py: 0.8, bgcolor: rt.bg, borderBottom: 1, borderColor: rt.border }}>
                    <Stack direction="row" useFlexGap sx={{ gap: 0.6, alignItems: "center", flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 12, color: rt.heading }}>{r.name}</Typography>
                      <TypeChip type={r.type} />
                    </Stack>
                  </Box>
                  <Box sx={{ p: 1.25 }}>
                    <Facts
                      items={[
                        { k: "Doctor", v: r.doctor.name },
                        { k: "Specialty", v: r.specialties.join(", ") },
                        { k: "Date", v: r.date ? dayLabel(r.date) : null },
                        { k: "Diagnosis", v: r.name },
                        { k: "ICD code", v: r.code },
                        { k: "Type", v: diagnosisTypeLabel(r.type) },
                        { k: "Findings", v: ev.findings.join(", ") || "None recorded" },
                        { k: "Investigations advised", v: ev.investigations.join(", ") || "None recorded" },
                        { k: "Consultation", v: r.bookingId ? `#${r.bookingId}${visitOf(h, r.bookingId) ? ` · ${dayLabel(visitOf(h, r.bookingId)!.date)}` : ""}` : null },
                      ]}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ bgcolor: tone.bg, border: 1, borderColor: tone.border, borderRadius: 2.5, p: 1.35 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
              <Icon name="FiAlertCircle" size={14} color={tone.fg} />
              <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: tone.heading }}>Differences</Typography>
            </Stack>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{diffs.map((d) => <li key={d}><Typography variant="body2">{d}</Typography></li>)}</Box>
            <Typography sx={{ ...subtle, mt: 0.4 }}>Both entries stay as recorded. This view does not judge which is correct.</Typography>
          </Box>
        </>
      )}
    </Stack>
  );
}

function EmptyBlock({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", py: 2.5, px: 1 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "#F3F1FB", color: "#6D5BD0", display: "grid", placeItems: "center" }}>
        <Icon name={icon} size={18} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{title}</Typography>
      <Muted>{text}</Muted>
    </Stack>
  );
}
