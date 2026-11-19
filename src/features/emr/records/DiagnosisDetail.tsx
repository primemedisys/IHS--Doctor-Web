"use client";

/**
 * Diagnosis detail dashboard — one diagnosis, opened in place from the
 * Diagnosis Records list (no new route, no new endpoint: it reads the same
 * `useMedicalHistory` response the list already loaded).
 *
 * Every relationship is the one the backend stores:
 *   diagnosis entry → its consultation (booking id) → that consultation's
 *   signed prescription(s) and medicines, investigations advised, follow-up and
 *   treatment notes. A diagnosis written only on a prescription is linked to
 *   that prescription. Nothing is joined by date, name or guess, and a journey
 *   event exists only when a real record produced it. Laterality, certainty and
 *   onset are shown only if the entry's own `details` carries them; otherwise
 *   "Not recorded".
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { CARD_TONES, type CardTone } from "@/theme/palette";
import { dayLabel, istToday, titleCase } from "../format";
import { consultationOf, courseOf, conditionKey, diagnosisRows, diagnosisTypeLabel, evidenceOf, signedRx, visitOf, type CourseStatus, type DiagnosisRow } from "./derive";
import type { HistoryRx, MedicalHistory, VisitRxItem } from "@/types/emr";

const STATUS_LABEL: Record<CourseStatus, string> = { active: "Active", completed: "Stopped", unknown: "Reviewed" };
const STATUS_TONE: Record<CourseStatus, CardTone> = { active: "green", completed: "gray", unknown: "orange" };
const subtle = { fontSize: 11.5, color: "text.secondary", lineHeight: 1.35, overflowWrap: "anywhere" } as const;
const NR = "Not recorded";

const istTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null);
const istDay = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : null);
/** Medicine names often already carry the strength ("Paracetamol 500 mg"); append it only when they do not. */
const medLabel = (i: VisitRxItem) => (i.strength && !i.medicineName.toLowerCase().includes(i.strength.toLowerCase()) ? `${i.medicineName} ${i.strength}` : i.medicineName);
const doseFreq = (i: VisitRxItem) => [i.dosage, i.frequency].filter(Boolean).join(" · ") || null;
const detail = (r: DiagnosisRow, ...keys: string[]) => {
  const d = r.entry?.details;
  for (const k of keys) { const v = d?.[k]; if (v !== undefined && v !== null && String(v).trim()) return String(v); }
  return null;
};

type Person = { name: string; photoUrl: string | null; specialty: string | null };
interface JourneyEvent {
  key: string;
  at: string;
  day: string | null;
  time: string | null;
  title: string;
  tone: CardTone;
  icon: string;
  who: Person;
  clinic: string | null;
  text: string;
  related: string | null;
  status: string;
  href: string;
}

function DocAvatar({ p, size = 32 }: { p: Pick<Person, "name" | "photoUrl">; size?: number }) {
  return <Avatar src={p.photoUrl ?? undefined} alt={p.name} sx={{ width: size, height: size, bgcolor: CARD_TONES.blue.bg, color: CARD_TONES.blue.fg, fontWeight: 700, fontSize: size / 2.4 }}>{p.name.replace(/^dr\.?\s*/i, "").slice(0, 1)}</Avatar>;
}

function Pill({ tone, children }: { tone: CardTone; children: React.ReactNode }) {
  const t = CARD_TONES[tone];
  return <Chip size="small" label={children} sx={{ height: 21, bgcolor: t.bg, color: t.heading, border: 1, borderColor: t.border, fontWeight: 700 }} />;
}

export function DiagnosisDetail({ r, h, patientId, onBack }: { r: DiagnosisRow; h: MedicalHistory; patientId: string; onBack: () => void }) {
  const today = istToday();
  const m = useMemo(() => build(r, h, today, patientId), [r, h, today, patientId]);
  const [newestFirst, setNewestFirst] = useState(false);
  const [cat, setCat] = useState<"all" | "rx" | "inv" | "treat">("all");
  const events = useMemo(() => [...m.events].sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)) || a.key.localeCompare(b.key)), [m.events, newestFirst]);
  const rows = m.records.filter((x) => cat === "all" || x.cat === cat);
  const statusTone: CardTone = r.entry?.status === "entered_in_error" ? "gray" : "green";
  const statusText = r.entry ? (r.entry.status === "entered_in_error" ? "Entered in error" : "Active") : "From prescription";
  const laterality = detail(r, "laterality", "side");

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 1.75 }, borderRadius: 3, border: 1, borderColor: "#E4E1F4", background: "linear-gradient(135deg, #F3EEFF 0%, #FDFBFF 74%)", boxShadow: "0 10px 28px rgba(84, 76, 184, 0.07)" }}>
        <Button size="small" onClick={onBack} startIcon={<Icon name="FiArrowLeft" />} sx={{ mb: 0.75 }}>Back to Diagnosis</Button>
        <Stack direction="row" useFlexGap sx={{ gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: CARD_TONES.purple.fg, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 6px 16px ${CARD_TONES.purple.border}` }}>
            <Icon name="FiSearch" size={20} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" useFlexGap sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{r.name}</Typography>
              <Pill tone={statusTone}>{statusText}</Pill>
              <Pill tone="purple">{diagnosisTypeLabel(r.type)}</Pill>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              {[r.entry ? `Diagnosis ID #${r.entry.id}` : `From prescription #${r.prescriptionId}`, dayLabel(r.date), m.clinic, r.bookingId ? `Consultation #${r.bookingId}` : null].filter(Boolean).join("  ·  ")}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Summary cards */}
      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "repeat(2, minmax(0,1fr))", md: "repeat(4, minmax(0,1fr))" } }}>
        <SummaryCard tone="blue" icon="FiUser" label="Diagnosis source">
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <DocAvatar p={m.author} size={34} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, overflowWrap: "anywhere" }}>{m.author.name}</Typography>
              <Typography sx={subtle}>{m.author.specialty ?? "Specialty not recorded"}</Typography>
            </Box>
          </Stack>
        </SummaryCard>
        <SummaryCard tone="green" icon="FiCompass" label="Laterality"><Big>{laterality ? titleCase(laterality) : NR}</Big></SummaryCard>
        <SummaryCard tone="purple" icon="FiActivity" label="Status"><Big>{statusText}</Big><Typography sx={subtle}>{diagnosisTypeLabel(r.type)}</Typography></SummaryCard>
        <SummaryCard tone="orange" icon="FiPackage" label="Linked medicines"><Big>{String(m.meds.length)}</Big><Typography sx={subtle}>{m.meds.length ? "From this consultation's prescription" : "None prescribed"}</Typography></SummaryCard>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1.7fr) minmax(0,1fr)" }, alignItems: "start" }}>
        {/* Journey */}
        <Paper variant="outlined" component="section" sx={{ p: 1.75, minWidth: 0, borderRadius: 3 }}>
          <Stack direction="row" sx={{ alignItems: "baseline", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>Linked Clinical Journey</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Only records of this consultation{r.bookingId ? ` (#${r.bookingId})` : ""}</Typography>
            <Button size="small" onClick={() => setNewestFirst((v) => !v)} startIcon={<Icon name={newestFirst ? "FiArrowDown" : "FiArrowUp"} />}>{newestFirst ? "Newest first" : "Oldest first"}</Button>
          </Stack>
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No linked records exist for this diagnosis yet.</Typography>
          ) : (
            <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {events.map((e, i) => <JourneyRow key={e.key} e={e} last={i === events.length - 1} />)}
            </Box>
          )}
          {m.invLocked && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Investigations of this consultation are private to another doctor and are not shown.</Typography>}
        </Paper>

        {/* Right panel */}
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Panel title="Diagnosis Details" tone="purple">
            <Facts2 items={[
              ["Diagnosis", r.name],
              ["ICD-10 code", r.code ? [r.codeSystem, r.code].filter(Boolean).join(" ") + (r.codeDescription ? ` — ${r.codeDescription}` : "") : NR],
              ["Diagnosis type", diagnosisTypeLabel(r.type)],
              ["Certainty", detail(r, "certainty") ? titleCase(detail(r, "certainty")) : NR],
              ["Clinical status", statusText],
              ["Onset date", detail(r, "onset", "onsetDate") ?? NR],
              ["Notes", r.entry?.remarks || NR],
            ]} />
          </Panel>

          <Panel title="Linked Medicines" tone="orange" action={m.meds.length > 4 ? <Button size="small" onClick={() => { setCat("rx"); document.getElementById("dx-related")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>View all</Button> : undefined}>
            {m.meds.length === 0 ? <Typography variant="body2" color="text.secondary">No medicine was prescribed in this consultation.</Typography> : (
              <Stack spacing={0.75}>
                {m.meds.slice(0, 4).map((x) => (
                  <Box key={x.key} component={Link} href={m.rxHref} sx={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 1, p: 1, border: 1, borderColor: "divider", borderRadius: 2, "&:hover": { bgcolor: "action.hover" } }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: CARD_TONES.blue.bg, color: CARD_TONES.blue.fg, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="FiPackage" size={15} /></Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{medLabel(x.item)}</Typography>
                      <Typography sx={subtle}>{doseFreq(x.item) ?? "Dose not recorded"}</Typography>
                    </Box>
                    <Pill tone={STATUS_TONE[x.status]}>{STATUS_LABEL[x.status]}</Pill>
                  </Box>
                ))}
              </Stack>
            )}
          </Panel>

          <Panel title="Clinical Insights" tone="teal">
            <Box component="ul" sx={{ m: 0, pl: 2.25, "& li": { mb: 0.4 } }}>
              {m.insights.map((l) => <Typography component="li" variant="body2" key={l}>{l}</Typography>)}
            </Box>
          </Panel>
        </Stack>
      </Box>

      {/* Related records */}
      <Paper id="dx-related" variant="outlined" component="section" sx={{ p: 1.75, minWidth: 0, borderRadius: 3, scrollMarginTop: 16 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mb: 0.5 }}>Related Records</Typography>
        <Tabs value={cat} onChange={(_, v) => setCat(v)} variant="scrollable" sx={{ minHeight: 36, mb: 1, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 600 } }}>
          <Tab value="all" label={`All (${m.records.length})`} />
          <Tab value="rx" label={`Prescriptions (${m.records.filter((x) => x.cat === "rx").length})`} />
          <Tab value="inv" label={`Investigations (${m.records.filter((x) => x.cat === "inv").length})`} />
          <Tab value="treat" label={`Treatment records (${m.records.filter((x) => x.cat === "treat").length})`} />
        </Tabs>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No records in this category are linked to the diagnosis.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2.5 }}>
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760, "& td": { py: 1, px: 1.25, borderTop: 1, borderColor: "divider", verticalAlign: "middle" }, "& tbody tr:hover": { bgcolor: "action.hover" } }}>
              <Box component="thead"><tr>{["Date", "Medicine / Record", "Dose & Frequency", "Prescribed By", "Status", "Action"].map((c) => (
                <Box component="th" key={c} sx={{ textAlign: "left", bgcolor: CARD_TONES.purple.bg, color: CARD_TONES.purple.heading, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", py: 0.9, px: 1.25, whiteSpace: "nowrap" }}>{c}</Box>
              ))}</tr></Box>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.key}>
                    <td style={{ whiteSpace: "nowrap" }}>{dayLabel(x.day)}</td>
                    <td><Typography sx={{ fontWeight: 700, fontSize: 13, overflowWrap: "anywhere" }}>{x.title}</Typography><Typography sx={subtle}>{x.kind}</Typography></td>
                    <td>{x.dose ?? "—"}</td>
                    <td>{x.by ?? "—"}</td>
                    <td><Pill tone={x.tone}>{x.status}</Pill></td>
                    <td><Button size="small" component={Link} href={x.href} endIcon={<Icon name="FiChevronRight" size={14} />}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

function SummaryCard({ tone, label, icon, children }: { tone: CardTone; label: string; icon: string; children: React.ReactNode }) {
  const t = CARD_TONES[tone];
  return (
    <Box sx={{ position: "relative", overflow: "hidden", background: `linear-gradient(150deg, ${t.bg} 0%, #FFFFFF 88%)`, border: 1, borderColor: t.border, borderRadius: 2.5, p: 1.25, minWidth: 0, minHeight: 84, boxShadow: "0 6px 18px rgba(84, 76, 184, 0.05)" }}>
      <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mb: 0.5 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: t.fg, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name={icon} size={11} />
        </Box>
        <Typography sx={{ color: t.heading, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 9.5, lineHeight: 1.3 }}>{label}</Typography>
      </Stack>
      {children}
    </Box>
  );
}
const Big = ({ children }: { children: React.ReactNode }) => <Typography sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.25, overflowWrap: "anywhere" }}>{children}</Typography>;

function Panel({ title, tone, children, action }: { title: string; tone: CardTone; children: React.ReactNode; action?: React.ReactNode }) {
  const t = CARD_TONES[tone];
  return (
    <Paper variant="outlined" component="section" sx={{ borderRadius: 3, overflow: "hidden", minWidth: 0 }}>
      <Stack direction="row" sx={{ alignItems: "center", px: 1.5, py: 0.75, bgcolor: t.bg, borderBottom: 1, borderColor: t.border }}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, color: t.heading, flex: 1 }}>{title}</Typography>
        {action}
      </Stack>
      <Box sx={{ p: 1.5 }}>{children}</Box>
    </Paper>
  );
}

function Facts2({ items }: { items: [string, string][] }) {
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gap: 0.9, "& dt": { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }, "& dd": { m: 0, fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" } }}>
      {items.map(([k, v]) => <Box key={k}><dt>{k}</dt><dd style={v === NR ? { color: "#6B7280", fontWeight: 500 } : undefined}>{v}</dd></Box>)}
    </Box>
  );
}

function JourneyRow({ e, last }: { e: JourneyEvent; last: boolean }) {
  const t = CARD_TONES[e.tone];
  return (
    <Box component="li" sx={{ display: "grid", gridTemplateColumns: { xs: "34px minmax(0,1fr)", sm: "78px 34px minmax(0,1fr)" }, columnGap: 1, position: "relative" }}>
      <Box sx={{ display: { xs: "none", sm: "block" }, pt: 1.25, textAlign: "right" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dayLabel(e.day)}</Typography>
        <Typography sx={subtle}>{e.time ?? ""}</Typography>
      </Box>
      <Box sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
        {!last && <Box sx={{ position: "absolute", top: 36, bottom: -8, width: 2, bgcolor: t.border, borderRadius: 1 }} />}
        <Box sx={{ mt: 0.9, width: 30, height: 30, borderRadius: "50%", bgcolor: t.fg, color: "#fff", display: "grid", placeItems: "center", boxShadow: `0 0 0 4px ${t.bg}`, zIndex: 1 }}><Icon name={e.icon} size={14} /></Box>
      </Box>
      <Box component={Link} href={e.href} aria-label={`Open ${e.title}`} sx={{ textDecoration: "none", color: "inherit", mb: 1, p: 1.25, border: 1, borderColor: "divider", borderLeft: `4px solid ${t.fg}`, borderRadius: 2.5, bgcolor: "background.paper", boxShadow: "0 1px 2px rgba(16,24,40,0.05)", display: "block", minWidth: 0, "&:hover": { boxShadow: "0 3px 10px rgba(16,24,40,0.10)" }, "&:focus-visible": { outline: "2px solid", outlineColor: t.fg } }}>
        <Stack direction="row" useFlexGap sx={{ gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{e.title}</Typography>
          <Pill tone={e.tone}>{e.status}</Pill>
          <Typography sx={{ ...subtle, display: { sm: "none" } }}>{dayLabel(e.day)}{e.time ? ` · ${e.time}` : ""}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.9} sx={{ alignItems: "center", mt: 0.6 }}>
          <DocAvatar p={e.who} size={24} />
          <Typography sx={{ ...subtle, color: "text.primary", fontWeight: 600 }}>{e.who.name}</Typography>
          <Typography sx={subtle}>{[e.who.specialty, e.clinic].filter(Boolean).join(" · ")}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.6, overflowWrap: "anywhere" }}>{e.text}</Typography>
        {e.related && <Typography sx={{ ...subtle, mt: 0.4, color: t.heading, fontWeight: 600 }}>{e.related}</Typography>}
      </Box>
    </Box>
  );
}

// ── Derivation ───────────────────────────────────────────────────────────────
interface RecordRow { key: string; cat: "rx" | "inv" | "treat"; day: string | null; title: string; kind: string; dose: string | null; by: string | null; status: string; tone: CardTone; href: string }

function build(r: DiagnosisRow, h: MedicalHistory, today: string, patientId: string) {
  const c = consultationOf(h, r.bookingId);
  const v = visitOf(h, r.bookingId);
  const clinic = v?.clinic?.name ?? null;
  const visitDoc = v?.doctor ?? null;
  // A face/specialty is borrowed from the visit only when the visit's doctor IS that person.
  const person = (id: string | null | undefined, name: string | null | undefined): Person => {
    const same = visitDoc && id && visitDoc.id === id;
    return { name: name ?? (same ? visitDoc?.name : null) ?? "Unknown doctor", photoUrl: same ? visitDoc?.photoUrl ?? null : null, specialty: same ? visitDoc?.specializations.join(", ") || null : null };
  };
  const author = person(r.doctor.id, r.doctor.name);
  if (!author.specialty && r.specialties.length) author.specialty = r.specialties.join(", ");

  const href = (page: "clinical-records" | "treatment-summary") => ROUTES.dashboard.emrRecords(patientId, page, r.bookingId);
  const rxHref = href("treatment-summary");

  const rxs: HistoryRx[] = signedRx(h).filter((rx) => (r.bookingId ? rx.bookingId === r.bookingId : rx.id === r.prescriptionId));
  const meds = rxs.flatMap((rx) => rx.items.map((item, i) => ({ key: `${rx.id}:${i}`, rx, item, status: courseOf(rx, item, today).status })));
  const inv = c?.investigations ?? [];
  const invLocked = Boolean(r.bookingId && c && c.investigations === null);
  const notes = (c?.consultationNotes ?? []).filter((n) => n.treatment && n.treatment.trim());
  const ev = evidenceOf(h, r.bookingId);

  const events: JourneyEvent[] = [];
  const dxAt = r.entry?.createdAt ?? (r.date ? `${r.date}T00:00:00` : "");
  events.push({
    key: "dx", at: dxAt, day: istDay(r.entry?.createdAt) ?? r.date, time: istTime(r.entry?.createdAt), title: r.type === "final" ? "Diagnosis Confirmed" : "Diagnosis Recorded", tone: "blue", icon: "FiCheckCircle",
    who: author, clinic, text: `${r.name}${r.code ? ` (${r.code})` : ""} recorded as ${diagnosisTypeLabel(r.type).toLowerCase()}.`, related: ev.findings.length ? `Findings: ${ev.findings.slice(0, 3).join(", ")}` : null, status: titleCase(r.type), href: href("clinical-records"),
  });
  // Updated only when the stored entry really was edited after it was created.
  if (r.entry && Date.parse(r.entry.updatedAt) - Date.parse(r.entry.createdAt) > 60_000) {
    events.push({ key: "dx-upd", at: r.entry.updatedAt, day: istDay(r.entry.updatedAt), time: istTime(r.entry.updatedAt), title: "Diagnosis Updated", tone: "orange", icon: "FiEdit3", who: author, clinic, text: "The diagnosis entry was edited after it was first recorded.", related: null, status: "Updated", href: href("clinical-records") });
  }
  for (const rx of rxs) {
    const who = person(rx.doctor?.id, rx.doctor?.name);
    const rxItems = rx.items.map((i) => ({ i, s: courseOf(rx, i, today) }));
    const at = rx.finalizedAt ?? (rx.visitDate ? `${rx.visitDate}T00:00:00` : rx.createdAt ?? "");
    const amended = rx.version > 1;
    events.push({
      key: `rx${rx.id}`, at, day: istDay(rx.finalizedAt) ?? rx.visitDate, time: istTime(rx.finalizedAt), title: amended ? "Medicine Modified" : "Treatment Started", tone: amended ? "orange" : "green", icon: amended ? "FiEdit3" : "FiPackage", who, clinic,
      text: rx.noMedication ? "Prescription signed with no medicines." : `${rx.items.length} medicine${rx.items.length === 1 ? "" : "s"} prescribed${amended ? ` (prescription amended, version ${rx.version})` : ""}.`,
      related: rx.items.slice(0, 3).map((i) => i.medicineName).join(", ") + (rx.items.length > 3 ? ` +${rx.items.length - 3} more` : "") + ` · ${rx.rxNumber ?? `Rx #${rx.id}`}`, status: amended ? `Amended v${rx.version}` : "Signed", href: rxHref,
    });
    // Only when every line has a written duration and all have ended.
    if (rxItems.length && rxItems.every((x) => x.s.status === "completed")) {
      const end = rxItems.map((x) => x.s.end!).sort().at(-1)!;
      events.push({ key: `end${rx.id}`, at: `${end}T23:59:00`, day: end, time: null, title: "Course Completed", tone: "gray", icon: "FiFlag", who, clinic, text: "The prescribed duration of every medicine on this prescription has ended.", related: rx.rxNumber ?? `Rx #${rx.id}`, status: "Completed", href: rxHref });
    }
  }
  for (const e of inv) {
    events.push({ key: `inv${e.id}`, at: e.createdAt, day: istDay(e.createdAt) ?? e.visitDate, time: istTime(e.createdAt), title: "Investigation Advised", tone: "teal", icon: "FiSearch", who: person(e.author?.id, e.author?.name), clinic, text: `${e.title ?? "Investigation"} advised.`, related: e.remarks, status: "Advised", href: href("clinical-records") });
  }
  const fu = c?.followUp;
  if (fu?.followUpOn) {
    events.push({ key: "fu", at: `${fu.followUpOn}T00:00:00`, day: fu.followUpOn, time: null, title: "Follow-up", tone: "purple", icon: "FiCalendar", who: person(visitDoc?.id, visitDoc?.name), clinic, text: fu.note ?? "Follow-up visit planned.", related: fu.serviceName, status: fu.followUpOn >= today ? "Scheduled" : "Date passed", href: href("clinical-records") });
  }

  const records: RecordRow[] = [
    ...meds.map((x): RecordRow => ({ key: `rx${x.key}`, cat: "rx", day: x.rx.visitDate ?? x.rx.finalizedAt?.slice(0, 10) ?? null, title: medLabel(x.item), kind: x.rx.rxNumber ?? `Prescription #${x.rx.id}`, dose: doseFreq(x.item), by: x.rx.doctor?.name ?? author.name, status: STATUS_LABEL[x.status], tone: STATUS_TONE[x.status], href: rxHref })),
    ...inv.map((e): RecordRow => ({ key: `inv${e.id}`, cat: "inv", day: e.visitDate ?? e.createdAt.slice(0, 10), title: e.title ?? "Investigation", kind: "Investigation advised", dose: null, by: e.author?.name ?? null, status: "Advised", tone: "teal", href: href("clinical-records") })),
    ...notes.map((n): RecordRow => ({ key: `n${n.id}`, cat: "treat", day: n.date, title: n.treatment!.length > 90 ? n.treatment!.slice(0, 90) + "…" : n.treatment!, kind: "Treatment record", dose: null, by: n.doctorName, status: "Recorded", tone: "blue", href: href("clinical-records") })),
  ].sort((a, b) => String(b.day ?? "").localeCompare(String(a.day ?? "")));

  const sameCondition = diagnosisRows(h).filter((x) => conditionKey(x) === conditionKey(r));
  const doctorsSame = new Set(sameCondition.map((x) => x.doctor.name));
  const insights = [
    `${records.length} record${records.length === 1 ? "" : "s"} linked to this diagnosis through its consultation.`,
    `${meds.length} medicine line${meds.length === 1 ? "" : "s"} prescribed, ${meds.filter((x) => x.status === "active").length} still within the written duration.`,
    invLocked ? "Investigations are private to another doctor." : `${inv.length} investigation${inv.length === 1 ? "" : "s"} advised in this consultation.`,
    `${notes.length} treatment record${notes.length === 1 ? "" : "s"} in this consultation.`,
    sameCondition.length > 1 ? `This condition is recorded ${sameCondition.length} times by ${doctorsSame.size} doctor${doctorsSame.size === 1 ? "" : "s"}.` : "This condition is recorded once.",
  ];
  return { author, clinic, meds, events, records, rxHref, insights, invLocked };
}

