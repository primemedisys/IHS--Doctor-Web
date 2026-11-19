"use client";

/**
 * Audit History — a READ-ONLY view of the append-only `access_audit_logs`
 * rows the server wrote for THIS doctor's own actions on this patient
 * (GET /doctor/emr/patients/:id/audit). Nothing is generated here. Other
 * users' actions and IP addresses are never sent by the server, so there is no
 * user / role filter: the user is always the signed-in doctor.
 */
import { useState, type ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ErrorState } from "@/components/feedback";
import { getErrorMessage } from "@/utils/error";
import { useAuditHistory } from "../hooks";
import { RecordsFrame, Section, Muted } from "./RecordsKit";
import type { AuditEvent } from "@/types/emr";

const NAVY = "#10254D";
const BORDER = "#D5E2F2";
const LIMIT = 20;

const ACTION_LABEL: Record<string, string> = {
  emr_patient_view: "Opened patient workspace",
  emr_vitals_added: "Recorded vitals",
  emr_entry_created: "Created clinical entry",
  emr_entry_updated: "Updated clinical entry",
  emr_note_published: "Published note",
  emr_entry_retired: "Retired clinical entry",
  clinical_history_viewed: "Viewed clinical history",
  record_downloaded: "Downloaded record",
  patient_basic_view: "Viewed patient card",
  access_requested: "Requested record access",
  access_cancelled: "Cancelled access request",
};
const actionLabel = (a: string) => ACTION_LABEL[a] ?? a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const moduleOf = (e: AuditEvent) => (e.entityType ? e.entityType.split(":")[0].replace(/_/g, " ") : "—");
const resourceLabel = (e: AuditEvent) => {
  if (!e.entityType) return "—";
  const [base, sub] = e.entityType.split(":");
  const name = [base.replace(/_/g, " "), sub].filter(Boolean).join(" · ");
  return e.entityId ? `${name} #${e.entityId}` : name;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const short = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

function describe(e: AuditEvent): string {
  const d = e.details;
  if (!d) return "—";
  const parts: string[] = [];
  if (d.reason) parts.push(`Reason: ${d.reason}`);
  if (d.grantedCategories) parts.push(d.grantedCategories.length ? `Granted: ${d.grantedCategories.join(", ")}` : "No categories granted");
  if (typeof d.documents === "number") parts.push(`${d.documents} document${d.documents === 1 ? "" : "s"} listed`);
  return parts.join(" · ") || "—";
}

export function AuditHistoryPage({ patientId }: { patientId: string }) {
  return (
    <RecordsFrame patientId={patientId} page="audit-history" compact>
      {() => <Body patientId={patientId} />}
    </RecordsFrame>
  );
}

const field = { minWidth: 150, flex: "1 1 150px", "& .MuiInputBase-root": { height: 34, fontSize: 12.5, bgcolor: "#fff", borderRadius: "9px" } } as const;
const EMPTY = { from: "", to: "", action: "", entityType: "" };

function Body({ patientId }: { patientId: string }) {
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const q = useAuditHistory(patientId, {
    page,
    limit: LIMIT,
    ...(f.from && { from: f.from }),
    ...(f.to && { to: f.to }),
    ...(f.action && { action: f.action }),
    ...(f.entityType && { entityType: f.entityType }),
  });
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setPage(1);
  };
  const dirty = Object.values(f).some(Boolean);
  const d = q.data;

  const th = { textAlign: "left", py: 0.9, px: 1.25, fontSize: 11.5, fontWeight: 700, color: NAVY, bgcolor: "#EAF3FF", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}` } as const;

  return (
    <Section title="Audit History" hint="Read-only. Shows your own recorded actions on this patient; other users' activity is not shown.">
      <Stack direction="row" useFlexGap sx={{ gap: 0.75, mb: 1.25, flexWrap: "wrap", alignItems: "center" }}>
        <TextField type="date" size="small" value={f.from} onChange={set("from")} sx={field} slotProps={{ htmlInput: { "aria-label": "From date" } }} />
        <TextField type="date" size="small" value={f.to} onChange={set("to")} sx={field} slotProps={{ htmlInput: { "aria-label": "To date" } }} />
        <TextField select size="small" value={f.action} onChange={set("action")} sx={field} slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Action type" } }}>
          <MenuItem value="">All actions</MenuItem>
          {(d?.actions ?? []).map((a) => <MenuItem key={a} value={a}>{actionLabel(a)}</MenuItem>)}
        </TextField>
        <TextField select size="small" value={f.entityType} onChange={set("entityType")} sx={field} slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Module" } }}>
          <MenuItem value="">All modules</MenuItem>
          {(d?.entityTypes ?? []).map((a) => <MenuItem key={a} value={a}>{a.replace(/_/g, " ")}</MenuItem>)}
        </TextField>
        <Button size="small" disabled={!dirty} onClick={() => { setF(EMPTY); setPage(1); }} sx={{ textTransform: "none", height: 34 }}>Clear</Button>
      </Stack>

      {q.isError ? (
        <ErrorState title="Couldn't load the audit history" description={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !d ? (
        <Stack spacing={1}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}</Stack>
      ) : d.items.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography sx={{ fontWeight: 700, color: NAVY }}>{dirty ? "No audit events match these filters" : "No audit events recorded"}</Typography>
          <Muted>{dirty ? "Try widening the date range or clearing a filter." : "Nothing has been logged for your actions on this patient yet."}</Muted>
        </Box>
      ) : (
        <>
          <Box sx={{ overflowX: "auto", border: 1, borderColor: BORDER, borderRadius: "0.9rem" }}>
            <Box component="table" sx={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12.5, color: NAVY, "& td": { py: 0.8, px: 1.25, borderTop: 1, borderColor: "#E8EFFA", verticalAlign: "top" } }}>
              <thead>
                <tr>{["Date & time", "User", "Role", "Action", "Resource", "Description", "Previous value", "New value", "Module"].map((c) => <Box component="th" key={c} sx={th}>{c}</Box>)}</tr>
              </thead>
              <tbody>
                {d.items.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{when(e.at)}</td>
                    <td>You</td>
                    <td style={{ textTransform: "capitalize" }}>{e.role ?? "—"}</td>
                    <td><Chip size="small" label={actionLabel(e.action)} sx={{ height: 21, bgcolor: "#EAF3FF", color: NAVY, border: 1, borderColor: BORDER, fontWeight: 700, fontSize: 11 }} /></td>
                    <td>{resourceLabel(e)}</td>
                    <td style={{ maxWidth: 260, overflowWrap: "anywhere" }}>{describe(e)}</td>
                    <td style={{ maxWidth: 240, overflowWrap: "anywhere" }}>
                      {e.details?.before ? Object.entries(e.details.before).map(([k, v]) => <div key={k}><b>{k}:</b> {short(v)}</div>) : "—"}
                    </td>
                    <td><Typography component="span" sx={{ fontSize: 12, color: "text.disabled" }} title="The audit log stores previous values only">Not recorded</Typography></td>
                    <td style={{ textTransform: "capitalize" }}>{moduleOf(e)}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
          <Stack direction="row" sx={{ mt: 1.25, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Muted>{`${(d.page - 1) * d.limit + 1}–${(d.page - 1) * d.limit + d.items.length} of ${d.total}`}</Muted>
            {d.totalPages > 1 && <Pagination size="small" color="primary" page={d.page} count={d.totalPages} onChange={(_, p) => setPage(p)} />}
          </Stack>
        </>
      )}
    </Section>
  );
}
