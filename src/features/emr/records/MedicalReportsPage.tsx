"use client";

/**
 * Medical Reports — every document the server let this doctor open
 * (GET …/documents: their own, patient-approved categories, or one-by-one
 * shares), by TEST date, grouped by category, with an authenticated preview.
 *
 * A locked document is simply absent from the response, so nothing here hides
 * or unhides anything. The record has no ordering consultation for an uploaded
 * document, so none is shown — the tests each doctor ADVISED are listed beside
 * the reports instead, joined on the consultation they were advised in.
 */
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/common/Icon";
import { ErrorState } from "@/components/feedback";
import { documentGroupOf, documentKindLabel, fileTypeLabel } from "@/features/records/documentKinds";
import { getErrorMessage } from "@/utils/error";
import { useMedicalHistory, usePatientDocuments } from "../hooks";
import { dayLabel, instantLabel } from "../format";
import { DocumentViewer, accessChip, downloadDocument, sourceLabel } from "../components/PatientDocuments";
import { OthersHiddenLine } from "../components/RecordAccess";
import { RecordsFrame, Section, StatRow, Muted } from "./RecordsKit";
import { TimelinePanel } from "./TimelinePanel";
import { specialtyOf, visitOf } from "./derive";
import type { PatientDocument } from "@/types/emr";

export function MedicalReportsPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="medical-reports">
      {() => <Body patientId={patientId} />}
    </RecordsFrame>
  );
}

const testDay = (d: PatientDocument) => d.recordDate ?? null;

function Body({ patientId }: { patientId: string }) {
  const docsQ = usePatientDocuments(patientId);
  const histQ = useMedicalHistory(patientId);
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [viewing, setViewing] = useState<PatientDocument | null>(null);

  const docs = useMemo(() => docsQ.data ?? [], [docsQ.data]);
  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(documentKindLabel(d), (m.get(documentKindLabel(d)) ?? 0) + 1);
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs]);

  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    return docs
      .filter((d) => !kind || documentKindLabel(d) === kind)
      .filter((d) => !(from || to) || (testDay(d) && (!from || testDay(d)! >= from) && (!to || testDay(d)! <= to)))
      .filter((d) => !t || [d.tag, d.originalName, d.description, d.doctorName, d.location].some((x) => x?.toLowerCase().includes(t)))
      // Test date, newest first; documents with no test date go last (never sorted by upload date).
      .sort((a, b) => (testDay(b) ?? "").localeCompare(testDay(a) ?? "") || String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  }, [docs, kind, from, to, text]);

  if (docsQ.isError) return <ErrorState title="Couldn't load the reports" description={getErrorMessage(docsQ.error)} onRetry={() => docsQ.refetch()} />;
  if (!docsQ.data) return <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={84} />)}</Stack>;

  const latest = docs.map(testDay).filter(Boolean).sort().at(-1) ?? null;
  const h = histQ.data;
  const advised = h
    ? h.investigations.map((i) => {
        const v = visitOf(h, i.bookingId);
        return { id: i.id, title: i.title ?? "Investigation", type: i.category, date: i.visitDate ?? i.recordedOn, doctor: i.author?.name ?? v?.doctor?.name ?? "Unknown doctor", specialties: specialtyOf(v), bookingId: i.bookingId };
      })
    : [];

  return (
    <Stack spacing={2}>
      <StatRow
        tone="teal"
        stats={[
          { label: "Reports & documents", value: String(docs.length) },
          { label: "Latest test date", value: dayLabel(latest) },
          { label: "Categories", value: String(kinds.length) },
          { label: "Tests advised", value: String(advised.length) },
        ]}
      />
      <OthersHiddenLine category="investigations" />

      <Section title="Reports and documents" hint="By test date, newest first. Only documents you are permitted to open are listed.">
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap", mb: 1.25 }}>
          <TextField fullWidth={false} select size="small" label="Category" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">All categories ({docs.length})</MenuItem>
            {kinds.map(([k, n]) => <MenuItem key={k} value={k}>{k} ({n})</MenuItem>)}
          </TextField>
          <TextField fullWidth={false} size="small" type="date" label="Test date from" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField fullWidth={false} size="small" type="date" label="to" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField fullWidth={false} size="small" label="Search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, doctor, place" />
        </Stack>
        {rows.length === 0 ? (
          <Muted>{docs.length ? "No documents match these filters." : "No medical reports available that you can open."}</Muted>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            {rows.map((d) => <ReportRow key={d.id} d={d} onView={() => setViewing(d)} />)}
          </Box>
        )}
      </Section>

      <Section title="Tests advised" hint="Investigations each doctor requested, with the consultation they were requested in.">
        {advised.length === 0 ? (
          <Muted>No investigations have been advised.</Muted>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {advised.map((a) => (
              <Box component="li" key={a.id} sx={{ py: 0.75, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{a.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayLabel(a.date)} · advised by {a.doctor}{a.specialties.length ? ` (${a.specialties.join(", ")})` : ""}{a.bookingId ? ` · consultation #${a.bookingId}` : ""}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          An uploaded report is not tied to the consultation that ordered it in the patient record, so no link is shown or guessed.
        </Typography>
      </Section>

      <Section title="Investigation & report timeline">
        <TimelinePanel patientId={patientId} defaultGroup="investigations" groups={["investigations"]} />
      </Section>

      {viewing && <DocumentViewer d={viewing} onClose={() => setViewing(null)} />}
    </Stack>
  );
}

function ReportRow({ d, onView }: { d: PatientDocument; onView: () => void }) {
  const chip = accessChip(d);
  const type = fileTypeLabel(d);
  const title = d.tag?.trim() || d.originalName || documentKindLabel(d);
  const group = documentGroupOf(d);
  return (
    <Box component="li" sx={{ display: "flex", gap: 1.25, px: 1.5, py: 1.1, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 }, alignItems: "flex-start", transition: "background-color 150ms", "&:hover": { bgcolor: "action.hover" } }}>
      <Box sx={{ width: 34, height: 34, borderRadius: 2, flexShrink: 0, display: { xs: "none", sm: "grid" }, placeItems: "center", bgcolor: "#E3F4F1", color: "#138477" }}>
        <Icon name={group === "prescriptions" ? "FiFileText" : group === "investigations" ? "FiActivity" : "FiFolder"} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, overflowWrap: "anywhere" }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.5 }}>
          {documentKindLabel(d)}
          {` · ${d.recordDate ? `Test date ${dayLabel(d.recordDate)}` : "Test date not recorded"}`}
          {d.uploadedAt ? ` · uploaded ${instantLabel(d.uploadedAt).split(",")[0]}` : ""}
          {d.doctorName ? ` · ${/^dr/i.test(d.doctorName) ? d.doctorName : `Dr. ${d.doctorName}`}` : ""}
          {d.location ? ` · ${d.location}` : ""}
          {type ? ` · ${type}` : ""}
        </Typography>
        {d.description && <Typography variant="body2" sx={{ mt: 0.25, overflowWrap: "anywhere" }}>{d.description}</Typography>}
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          <Chip size="small" variant="outlined" color={chip.color} label={chip.label} />
          <Chip size="small" variant="outlined" label={sourceLabel(d)} />
        </Stack>
      </Box>
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
        <Tooltip title="Preview"><IconButton size="small" onClick={onView} aria-label={`Preview ${title}`}><Icon name="FiEye" /></IconButton></Tooltip>
        <Tooltip title="Download"><IconButton size="small" onClick={() => void downloadDocument(d, title)} aria-label={`Download ${title}`}><Icon name="FiDownload" /></IconButton></Tooltip>
      </Stack>
    </Box>
  );
}
