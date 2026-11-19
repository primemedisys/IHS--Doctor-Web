"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/utils/error";
import { emrService } from "../services/emr.service";
import { useAddEntry, useEntries, useRetireEntry, useUpdateEntry } from "../hooks";
import { OthersHiddenLine } from "./RecordAccess";
import { unsavedError, useUnsavedWork } from "./UnsavedWork";
import type { AccessCategory } from "@/types/emr";
import { dayLabel, instantLabel, titleCase } from "../format";
import type { CategoryDef, ClinicalEntry, DiagnosisHit, EmrCatalog, EmrIdentity, EntryKind, IcdHit, NewEntry } from "@/types/emr";

/** What every section needs: who, which visit, and whether writing is allowed. */
export interface SectionProps {
  patientId: string;
  bookingId: string | null;
  canRecord: boolean;
  catalog: EmrCatalog;
}

// ── Shared: add + list ───────────────────────────────────────────────────────
function useAdd(patientId: string, bookingId: string | null) {
  const add = useAddEntry(patientId, bookingId ?? "");
  return {
    pending: add.isPending,
    save: (body: NewEntry, done?: () => void) =>
      add.mutate(body, {
        onSuccess: () => {
          toast.success("Saved");
          done?.();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }),
    saveAll: async (bodies: NewEntry[]) => Promise.all(bodies.map((b) => add.mutateAsync(b))),
    /** Same save, awaited — for "Save & Generate Prescription" (UnsavedWork). */
    saveAsync: (body: NewEntry) => add.mutateAsync(body),
  };
}

const sectionDom = (key: string) => `emr-section-${key}`;

function WriteGuard({ canRecord, bookingId }: { canRecord: boolean; bookingId: string | null }) {
  if (canRecord && bookingId) return null;
  return (
    <Alert severity="info" sx={{ py: 0 }}>
      Recording is available on a confirmed or completed visit with you. Open the patient from one of your appointments.
    </Alert>
  );
}

const labelOf = (defs: CategoryDef[] | string[], key: string | null) => {
  if (!key) return "";
  const hit = (defs as (CategoryDef | string)[]).find((d) => (typeof d === "string" ? d : d.key) === key);
  return typeof hit === "string" ? titleCase(hit) : (hit?.label ?? titleCase(key));
};

/** Which consent category protects OTHER doctors' entries of each kind (backend migration 057). */
const KIND_CATEGORY: Record<EntryKind, AccessCategory> = {
  complaint: "consultations",
  examination: "consultations",
  history: "medical_history",
  comorbidity: "medical_history",
  diagnosis: "diagnoses",
  investigation: "investigations",
  doctor_note: "doctor_notes",
};

/**
 * The entries of one kind for this patient, newest first. Rows from the
 * current visit are marked; corrections, publishing and "entered in error"
 * follow the server's rules (the row's `canEdit` is computed by the server).
 */
function EntryList({
  patientId,
  kind,
  bookingId,
  empty,
  body,
  head,
  publishable,
}: {
  patientId: string;
  kind: EntryKind;
  bookingId: string | null;
  empty: string;
  body: (e: ClinicalEntry) => React.ReactNode;
  head: (e: ClinicalEntry) => React.ReactNode;
  publishable?: boolean;
}) {
  const [showRetired, setShowRetired] = useState(false);
  const q = useEntries(patientId, { kind, includeRetired: showRetired });
  const update = useUpdateEntry(patientId);
  const [editing, setEditing] = useState<ClinicalEntry | null>(null);
  const [retiring, setRetiring] = useState<ClinicalEntry | null>(null);

  const publish = (e: ClinicalEntry) =>
    update.mutate(
      { id: e.id, patch: { patientVisible: true } },
      { onSuccess: () => toast.success("Published to the patient"), onError: (err) => toast.error(getErrorMessage(err)) },
    );

  if (q.isLoading) return <Typography variant="body2" color="text.secondary">Loading…</Typography>;
  if (q.isError) return <Alert severity="error">{getErrorMessage(q.error)}</Alert>;
  const rows = q.data ?? [];

  return (
    <Box>
      <OthersHiddenLine category={KIND_CATEGORY[kind]} />
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {rows.length} record{rows.length === 1 ? "" : "s"} · all visits · newest first
        </Typography>
        <FormControlLabel
          control={<Switch size="small" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />}
          label={<Typography variant="caption">Show entered-in-error</Typography>}
        />
      </Stack>
      {!rows.length && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {empty}
        </Typography>
      )}
      <Stack spacing={0.75}>
        {rows.map((e) => {
          const retired = e.status === "entered_in_error";
          const thisVisit = bookingId && e.bookingId === bookingId;
          return (
            <Paper
              key={e.id}
              variant="outlined"
              sx={{ p: 1, borderLeft: 3, borderLeftColor: thisVisit ? "primary.main" : "divider", opacity: retired ? 0.6 : 1 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <Box sx={{ flex: 1, minWidth: 0, textDecoration: retired ? "line-through" : "none" }}>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    {head(e)}
                    {thisVisit && <Chip size="small" color="primary" variant="outlined" label="This visit" sx={{ height: 20 }} />}
                    {publishable ? (
                      <Chip size="small" color={e.patientVisible ? "success" : "default"} label={e.patientVisible ? "Published" : "Draft · private"} sx={{ height: 20 }} />
                    ) : (
                      !e.patientVisible && <Chip size="small" label="Not shown to patient" sx={{ height: 20 }} />
                    )}
                  </Stack>
                  <Box sx={{ mt: 0.5 }}>{body(e)}</Box>
                </Box>
                {!retired && e.isMine && (
                  <Stack direction="row" spacing={0.25}>
                    {publishable && !e.patientVisible && (
                      <Tooltip title="Publish — the patient will see this note. A published note is final.">
                        <IconButton size="small" onClick={() => publish(e)} aria-label="Publish note">
                          <Icon name="FiSend" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {e.canEdit && (
                      <Tooltip title="Correct this entry">
                        <IconButton size="small" onClick={() => setEditing(e)} aria-label="Edit">
                          <Icon name="FiEdit2" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Mark as entered in error (kept in the record)">
                      <IconButton size="small" onClick={() => setRetiring(e)} aria-label="Mark as entered in error">
                        <Icon name="FiSlash" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {e.recordedOn ? `${dayLabel(e.recordedOn)} · ` : ""}
                {e.author?.name ?? "Unknown author"} · recorded {instantLabel(e.createdAt)}
                {e.visitDate ? ` · visit ${dayLabel(e.visitDate)}` : ""}
                {e.updatedAt !== e.createdAt && !retired ? " · corrected" : ""}
                {retired && e.retiredReason ? ` · entered in error: ${e.retiredReason}` : ""}
              </Typography>
            </Paper>
          );
        })}
      </Stack>
      {editing && <EditEntryDialog patientId={patientId} entry={editing} onClose={() => setEditing(null)} />}
      {retiring && <RetireDialog patientId={patientId} entry={retiring} onClose={() => setRetiring(null)} />}
    </Box>
  );
}

function EditEntryDialog({ patientId, entry, onClose }: { patientId: string; entry: ClinicalEntry; onClose: () => void }) {
  const update = useUpdateEntry(patientId);
  const [title, setTitle] = useState(entry.title ?? "");
  const [remarks, setRemarks] = useState(entry.remarks ?? "");
  const [details, setDetails] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(entry.details ?? {}).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)])),
  );
  const save = () =>
    update.mutate(
      {
        id: entry.id,
        patch: {
          ...(entry.title != null ? { title } : {}),
          remarks: remarks || null,
          ...(Object.keys(details).length ? { details: { ...(entry.details ?? {}), ...details } } : {}),
        },
      },
      { onSuccess: () => { toast.success("Corrected"); onClose(); }, onError: (e) => toast.error(getErrorMessage(e)) },
    );
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Correct entry</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          {entry.title != null && <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />}
          {Object.keys(details).map((k) => (
            <TextField key={k} size="small" label={titleCase(k)} value={details[k]} multiline onChange={(e) => setDetails((d) => ({ ...d, [k]: e.target.value }))} />
          ))}
          <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} multiline minRows={2} />
          <Typography variant="caption" color="text.secondary">The previous wording is kept in the audit log.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={update.isPending}>Save correction</Button>
      </DialogActions>
    </Dialog>
  );
}

function RetireDialog({ patientId, entry, onClose }: { patientId: string; entry: ClinicalEntry; onClose: () => void }) {
  const retire = useRetireEntry(patientId);
  const [reason, setReason] = useState("");
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark as entered in error</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          The entry stays in the record, struck through, with your reason. It is never deleted.
        </Typography>
        <TextField autoFocus fullWidth size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          disabled={reason.trim().length < 3 || retire.isPending}
          onClick={() =>
            retire.mutate({ id: entry.id, reason: reason.trim() }, { onSuccess: () => { toast.success("Marked as entered in error"); onClose(); }, onError: (e) => toast.error(getErrorMessage(e)) })
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const FormRow = ({ children }: { children: React.ReactNode }) => (
  <Paper variant="outlined" sx={{ p: 1.25, bgcolor: "action.hover" }}>
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(160px, 1fr))" }, alignItems: "start" }}>{children}</Box>
  </Paper>
);

const Text = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{children}</Typography>
);

function DetailLines({ fields, details }: { fields?: { key: string; label: string }[]; details: ClinicalEntry["details"] }) {
  const entries = Object.entries(details ?? {}).filter(([, v]) => v != null && String(v).trim() !== "");
  if (!entries.length) return null;
  const labelFor = (k: string) => fields?.find((f) => f.key === k)?.label ?? titleCase(k);
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 1.5, rowGap: 0.25 }}>
      {entries.map(([k, v]) => (
        <Box key={k} sx={{ display: "contents" }}>
          <Typography component="dt" variant="caption" color="text.secondary">{labelFor(k)}</Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, whiteSpace: "pre-wrap" }}>{String(v)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Chief complaint ──────────────────────────────────────────────────────────
export function ComplaintsPanel({ patientId, bookingId, canRecord }: SectionProps) {
  const { save, saveAsync, pending } = useAdd(patientId, bookingId);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [unit, setUnit] = useState("day");
  const [severity, setSeverity] = useState("");
  const [remarks, setRemarks] = useState("");
  const reset = () => { setTitle(""); setDuration(""); setSeverity(""); setRemarks(""); };
  const ok = canRecord && bookingId;
  const body = (): NewEntry => ({
    kind: "complaint",
    title: title.trim(),
    details: { duration: duration ? Number(duration) : null, durationUnit: duration ? unit : null, severity: severity || null },
    remarks: remarks.trim() || null,
  });
  useUnsavedWork(
    "complaint",
    ok && (title.trim() || duration || severity || remarks.trim())
      ? {
          label: "Chief Complaint",
          sectionId: sectionDom("complaint"),
          flush: async () => {
            if (!title.trim()) throw unsavedError("Chief Complaint", "enter the complaint, or clear the half-filled form");
            await saveAsync(body());
            reset();
          },
        }
      : null,
  );
  return (
    <Stack spacing={1}>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {ok && (
        <FormRow>
          <TextField size="small" label="Complaint" placeholder="e.g. Fever" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Stack direction="row" spacing={0.5}>
            <TextField size="small" label="Since" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} sx={{ width: 90 }} slotProps={{ htmlInput: { min: 1, max: 999 } }} />
            <TextField size="small" select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ flex: 1 }}>
              {["hour", "day", "week", "month", "year"].map((u) => <MenuItem key={u} value={u}>{titleCase(u)}s</MenuItem>)}
            </TextField>
          </Stack>
          <TextField size="small" select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <MenuItem value="">Not stated</MenuItem>
            {["mild", "moderate", "severe"].map((s) => <MenuItem key={s} value={s}>{titleCase(s)}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <Button
            variant="contained"
            startIcon={<Icon name="FiPlus" />}
            disabled={!title.trim() || pending}
            onClick={() => save(body(), reset)}
          >
            Add
          </Button>
        </FormRow>
      )}
      <EntryList
        patientId={patientId}
        kind="complaint"
        bookingId={bookingId}
        empty="No complaints recorded."
        head={(e) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.title}</Typography>}
        body={(e) => (
          <Text>
            {[
              e.details?.duration ? `Since ${e.details.duration} ${e.details.durationUnit}${Number(e.details.duration) > 1 ? "s" : ""}` : null,
              e.details?.severity ? titleCase(String(e.details.severity)) : null,
              e.remarks,
            ].filter(Boolean).join(" · ")}
          </Text>
        )}
      />
    </Stack>
  );
}

// ── Examinations ─────────────────────────────────────────────────────────────
export function ExaminationsPanel({ patientId, bookingId, canRecord, catalog }: SectionProps) {
  const forms = catalog.examinationForms;
  const [formKey, setFormKey] = useState(forms[0]?.key ?? "");
  const form = forms.find((f) => f.key === formKey);
  const [values, setValues] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const { save, saveAsync, pending } = useAdd(patientId, bookingId);
  const written = Object.values(values).some((v) => v.trim()) || remarks.trim();
  const ok = canRecord && bookingId;
  const examBody = (): NewEntry => ({ kind: "examination", category: formKey, details: Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())), remarks: remarks.trim() || null });
  const examReset = () => { setValues({}); setRemarks(""); };
  useUnsavedWork(
    "examination",
    ok && written
      ? { label: "Examinations", sectionId: sectionDom("examination"), flush: async () => { await saveAsync(examBody()); examReset(); } }
      : null,
  );

  return (
    <Stack spacing={1}>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {ok && (
        <Paper variant="outlined" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, minHeight: 200 }}>
          <List dense sx={{ borderRight: { md: 1 }, borderColor: "divider", py: 0 }} aria-label="Clinical forms">
            {forms.map((f) => (
              <ListItemButton key={f.key} selected={f.key === formKey} onClick={() => { setFormKey(f.key); setValues({}); }}>
                <ListItemText primary={f.label} slotProps={{ primary: { variant: "body2" } }} />
              </ListItemButton>
            ))}
          </List>
          <Stack spacing={1} sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{form?.label}</Typography>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {form?.fields?.map((fl) => (
                <TextField
                  key={fl.key}
                  size="small"
                  label={fl.label}
                  value={values[fl.key] ?? ""}
                  multiline={fl.multiline}
                  minRows={fl.multiline ? 2 : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, [fl.key]: e.target.value }))}
                  sx={fl.multiline ? { gridColumn: { sm: "1 / -1" } } : undefined}
                />
              ))}
            </Box>
            <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} multiline />
            <Box>
              <Button
                variant="contained"
                disabled={!written || pending}
                onClick={() => save(examBody(), examReset)}
              >
                Save {form?.label.toLowerCase()}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
      <EntryList
        patientId={patientId}
        kind="examination"
        bookingId={bookingId}
        empty="No examinations recorded."
        head={(e) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{labelOf(forms, e.category)}</Typography>}
        body={(e) => (
          <>
            <DetailLines fields={forms.find((f) => f.key === e.category)?.fields} details={e.details} />
            {e.remarks && <Text>{e.remarks}</Text>}
          </>
        )}
      />
    </Stack>
  );
}

// ── Patient history ──────────────────────────────────────────────────────────
/** Shown when relevant to the patient — and when demographics are unknown, shown anyway. */
function applies(c: CategoryDef, p: Pick<EmrIdentity, "age" | "gender">) {
  if (!c.appliesTo) return true;
  if (c.appliesTo.gender && p.gender && p.gender !== c.appliesTo.gender) return false;
  if (c.appliesTo.maxAge != null && p.age != null && p.age > c.appliesTo.maxAge) return false;
  return true;
}

export function HistoryPanel({ patientId, bookingId, canRecord, catalog, patient }: SectionProps & { patient: EmrIdentity }) {
  const [showAll, setShowAll] = useState(false);
  const cats = useMemo(() => catalog.historyCategories.filter((c) => showAll || applies(c, patient)), [catalog, patient, showAll]);
  const [cat, setCat] = useState(cats[0]?.key ?? "hpi");
  const def = catalog.historyCategories.find((c) => c.key === cat);
  const [values, setValues] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [on, setOn] = useState("");
  const { save, saveAsync, pending } = useAdd(patientId, bookingId);
  const written = Object.values(values).some((v) => v.trim()) || remarks.trim();
  const hidden = catalog.historyCategories.length - cats.length;
  const historyBody = (): NewEntry => ({ kind: "history", category: cat, details: Object.keys(values).length ? values : null, remarks: remarks.trim() || null, recordedOn: on || null });
  const historyReset = () => { setValues({}); setRemarks(""); };
  useUnsavedWork(
    "history",
    canRecord && bookingId && written
      ? { label: "Patient History", sectionId: sectionDom("history"), flush: async () => { await saveAsync(historyBody()); historyReset(); } }
      : null,
  );

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
        {cats.map((c) => (
          <Chip key={c.key} label={c.label.replace(/ \(.*\)/, "")} color={c.key === cat ? "primary" : "default"} onClick={() => { setCat(c.key); setValues({}); }} size="small" />
        ))}
        {(hidden > 0 || showAll) && (
          <Button size="small" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Hide categories not relevant to this patient" : `Show ${hidden} more`}
          </Button>
        )}
      </Stack>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {canRecord && bookingId && (
        <Paper variant="outlined" sx={{ p: 1.25, bgcolor: "action.hover" }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{def?.label}</Typography>
            {def?.fields?.map((f) => (
              <TextField key={f.key} size="small" label={f.label} value={values[f.key] ?? ""} multiline={f.multiline} minRows={2} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            ))}
            <TextField size="small" label={def?.fields?.length ? "Remarks" : "Details"} value={remarks} onChange={(e) => setRemarks(e.target.value)} multiline minRows={def?.fields?.length ? 1 : 3} />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField size="small" type="date" label="Record date" value={on} onChange={(e) => setOn(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Button
                variant="contained"
                disabled={!written || pending}
                onClick={() => save(historyBody(), historyReset)}
              >
                Add history
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
      <EntryList
        patientId={patientId}
        kind="history"
        bookingId={bookingId}
        empty="No history recorded."
        head={(e) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{labelOf(catalog.historyCategories, e.category)}</Typography>}
        body={(e) => (
          <>
            <DetailLines fields={catalog.historyCategories.find((c) => c.key === e.category)?.fields} details={e.details} />
            {e.remarks && <Text>{e.remarks}</Text>}
          </>
        )}
      />
    </Stack>
  );
}

// ── Comorbidities ────────────────────────────────────────────────────────────
export function ComorbiditiesPanel({ patientId, bookingId, canRecord, catalog, patient }: SectionProps & { patient: EmrIdentity }) {
  const cats = catalog.comorbidityCategories;
  const [cat, setCat] = useState(cats[0]?.key ?? "other");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [on, setOn] = useState("");
  const { save, saveAsync, pending } = useAdd(patientId, bookingId);
  const comorbidityBody = (): NewEntry => ({ kind: "comorbidity", category: cat, title: title.trim(), remarks: notes.trim() || null, recordedOn: on || null });
  const comorbidityReset = () => { setTitle(""); setNotes(""); setOn(""); };
  useUnsavedWork(
    "comorbidity",
    canRecord && bookingId && (title.trim() || notes.trim())
      ? {
          label: "Comorbidities",
          sectionId: sectionDom("comorbidity"),
          flush: async () => {
            if (!title.trim()) throw unsavedError("Comorbidities", "enter the condition, or clear the half-filled form");
            await saveAsync(comorbidityBody());
            comorbidityReset();
          },
        }
      : null,
  );
  return (
    <Stack spacing={1}>
      <Box>
        <Typography variant="caption" color="text.secondary">Conditions the patient reported in their profile: </Typography>
        {patient.conditions.length ? (
          patient.conditions.map((c) => <Chip key={c.name} size="small" variant="outlined" label={`${c.name}${c.diagnosedYear ? ` (${c.diagnosedYear})` : ""}`} sx={{ mr: 0.5 }} />)
        ) : (
          <Typography variant="caption">{patient.noKnownConditions ? "none known" : "not recorded"}</Typography>
        )}
      </Box>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {canRecord && bookingId && (
        <FormRow>
          <TextField size="small" select label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Condition" placeholder="e.g. Type 2 diabetes mellitus" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <TextField size="small" type="date" label="Since / relevant date" value={on} onChange={(e) => setOn(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Button variant="contained" startIcon={<Icon name="FiPlus" />} disabled={!title.trim() || pending}
            onClick={() => save(comorbidityBody(), comorbidityReset)}>
            Add
          </Button>
        </FormRow>
      )}
      <EntryList
        patientId={patientId}
        kind="comorbidity"
        bookingId={bookingId}
        empty="No comorbidities recorded by a doctor."
        head={(e) => (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.title}</Typography>
            <Chip size="small" variant="outlined" label={labelOf(cats, e.category)} sx={{ height: 20 }} />
          </>
        )}
        body={(e) => (e.remarks ? <Text>{e.remarks}</Text> : null)}
      />
    </Stack>
  );
}

// ── Diagnosis ────────────────────────────────────────────────────────────────
/** A diagnosis suggestion: a row of the admin ICD catalogue, or one of the doctor's own earlier diagnoses. */
type DxOption = { kind: "icd"; hit: IcdHit } | { kind: "mine"; hit: DiagnosisHit };

const dxKey = (o: DxOption) => (o.kind === "icd" ? `icd-${o.hit.id}` : `mine-${o.hit.title}|${o.hit.code ?? ""}|${o.hit.icdCodeId ?? ""}`);
const systemLabel = (h: Pick<IcdHit, "codingSystem" | "systemVersion">) => [h.codingSystem, h.systemVersion].filter(Boolean).join(" ");

/** The catalogue row an earlier diagnosis was coded with (it may since have been deactivated — the server checks). */
function icdFromEarlier(h: DiagnosisHit): IcdHit | null {
  if (!h.icdCodeId || !h.code) return null;
  return { id: String(h.icdCodeId), code: h.code, title: h.title, codingSystem: h.codeSystem ?? "", systemVersion: h.codeVersion ?? "", description: null, category: null, isActive: true };
}

function DxOptionRow({ o }: { o: DxOption }) {
  if (o.kind === "icd") {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {o.hit.title}{" "}
          <Box component="span" sx={{ fontFamily: "monospace", color: "primary.main" }}>{o.hit.code}</Box>
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" noWrap>
          {[systemLabel(o.hit), o.hit.category, o.hit.description && o.hit.description !== o.hit.title ? o.hit.description : null].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2">{o.hit.title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {o.hit.code ? `${[o.hit.codeSystem, o.hit.code].filter(Boolean).join(" ")} · ` : "No code · "}used {o.hit.uses}×
      </Typography>
    </Box>
  );
}

export function DiagnosisPanel({ patientId, bookingId, canRecord, catalog }: SectionProps) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  // The catalogue row the doctor PICKED. Never set without a click: when several
  // rows match, all are listed and nothing is assigned automatically.
  const [picked, setPicked] = useState<IcdHit | null>(null);
  const [type, setType] = useState(catalog.diagnosisTypes[0] ?? "provisional");
  const [stage, setStage] = useState("");
  const [remarks, setRemarks] = useState("");
  const [visible, setVisible] = useState(true);
  const dq = useDebounce(title.trim(), 300);
  const cq = useDebounce(code.trim(), 300);
  const nameIcd = useQuery({ queryKey: ["doctor", "emr", "icd-search", dq], queryFn: () => emrService.searchIcd(dq), enabled: dq.length >= 2 && !picked });
  const mine = useQuery({ queryKey: ["doctor", "emr", "dx-suggest", dq], queryFn: () => emrService.searchDiagnoses(dq), enabled: dq.length >= 2 && !picked });
  const codeIcd = useQuery({ queryKey: ["doctor", "emr", "icd-search", cq], queryFn: () => emrService.searchIcd(cq), enabled: cq.length >= 2 && !picked });
  const { save, saveAsync, pending } = useAdd(patientId, bookingId);

  const nameOptions: DxOption[] = [
    ...(nameIcd.data ?? []).map((hit) => ({ kind: "icd" as const, hit })),
    ...(mine.data ?? []).map((hit) => ({ kind: "mine" as const, hit })),
  ];
  const codeOptions: DxOption[] = (codeIcd.data ?? []).map((hit) => ({ kind: "icd" as const, hit }));

  const choose = (o: DxOption | string | null) => {
    if (!o || typeof o === "string") return;
    if (o.kind === "icd") {
      setTitle(o.hit.title);
      setCode(o.hit.code);
      setPicked(o.hit);
    } else {
      setTitle(o.hit.title);
      setCode(o.hit.code ?? "");
      setPicked(icdFromEarlier(o.hit));
    }
  };
  const reset = () => { setTitle(""); setCode(""); setPicked(null); setStage(""); setRemarks(""); };
  const noCatalogueMatch = dq.length >= 2 && !picked && nameIcd.isSuccess && !nameIcd.data.length;
  // The ICD code is exactly what the doctor picked or typed — never looked up here.
  const dxBody = (): NewEntry => ({
    kind: "diagnosis",
    title: title.trim(),
    code: code.trim() || null,
    icdCodeId: picked?.id ?? null,
    category: type,
    details: { stage: stage.trim() || null },
    remarks: remarks.trim() || null,
    patientVisible: visible,
  });
  useUnsavedWork(
    "diagnosis",
    canRecord && bookingId && (title.trim() || code.trim() || stage.trim() || remarks.trim())
      ? {
          label: "Diagnosis",
          sectionId: sectionDom("diagnosis"),
          flush: async () => {
            if (!title.trim()) throw unsavedError("Diagnosis", "enter the diagnosis name, or clear the half-filled form");
            await saveAsync(dxBody());
            reset();
          },
        }
      : null,
  );

  return (
    <Stack spacing={1}>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {canRecord && bookingId && (
        <FormRow>
          <Autocomplete<DxOption, false, false, true>
            freeSolo
            size="small"
            options={nameOptions}
            groupBy={(o) => (o.kind === "icd" ? "ICD catalogue" : "Your earlier diagnoses")}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.hit.title)}
            getOptionKey={(o) => (typeof o === "string" ? o : dxKey(o))}
            filterOptions={(x) => x}
            inputValue={title}
            loading={nameIcd.isFetching || mine.isFetching}
            noOptionsText={dq.length < 2 ? "Type at least 2 letters" : "No match in the ICD catalogue or your earlier diagnoses"}
            onInputChange={(_e, v, reason) => {
              if (reason !== "input" && reason !== "clear") return;
              setTitle(v);
              // Retyping the name un-picks the catalogue row (and its code) — pick again,
              // so a code can never stay attached to a different diagnosis. Add detail in Remarks.
              if (picked && v !== picked.title) { setPicked(null); setCode(""); }
            }}
            onChange={(_e, v) => choose(v)}
            renderOption={(props, o) => {
              const { key, ...rest } = props as typeof props & { key: string };
              return <li key={key} {...rest}><DxOptionRow o={o} /></li>;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Diagnosis"
                required
                helperText={noCatalogueMatch ? "Not in the ICD catalogue — it will be saved without a catalogue code" : "Search by name or ICD code; pick the matching row"}
              />
            )}
          />
          <Autocomplete<DxOption, false, false, true>
            freeSolo
            size="small"
            options={codeOptions}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.hit.code ?? "")}
            getOptionKey={(o) => (typeof o === "string" ? o : dxKey(o))}
            filterOptions={(x) => x}
            inputValue={code}
            loading={codeIcd.isFetching}
            noOptionsText={cq.length < 2 ? "Type at least 2 characters" : "No such code in the ICD catalogue"}
            onInputChange={(_e, v, reason) => {
              if (reason !== "input" && reason !== "clear") return;
              setCode(v);
              // A hand-typed code is not the picked catalogue row any more.
              if (picked && v.trim().toUpperCase() !== picked.code.toUpperCase()) setPicked(null);
            }}
            onChange={(_e, v) => choose(v)}
            renderOption={(props, o) => {
              const { key, ...rest } = props as typeof props & { key: string };
              return <li key={key} {...rest}><DxOptionRow o={o} /></li>;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="ICD code"
                placeholder="e.g. M54.5"
                helperText={picked ? `${systemLabel(picked)} · from the catalogue` : code.trim() ? "Typed by hand — not linked to the catalogue" : undefined}
              />
            )}
          />
          <TextField size="small" select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            {catalog.diagnosisTypes.map((t) => <MenuItem key={t} value={t}>{titleCase(t)}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} />
          <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <Stack>
            <FormControlLabel control={<Checkbox checked={visible} onChange={(e) => setVisible(e.target.checked)} />} label={<Typography variant="body2">Show to patient</Typography>} />
            <Button variant="contained" startIcon={<Icon name="FiPlus" />} disabled={!title.trim() || pending}
              onClick={() => save(dxBody(), reset)}>
              Add diagnosis
            </Button>
          </Stack>
        </FormRow>
      )}
      <EntryList
        patientId={patientId}
        kind="diagnosis"
        bookingId={bookingId}
        empty="No diagnoses recorded."
        head={(e) => (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.title}</Typography>
            {e.code && (
              <Tooltip title={e.icdCodeId ? `${e.codeDescription ?? ""} (${[e.codeSystem, e.codeVersion].filter(Boolean).join(" ")})` : "Typed by hand — not from the ICD catalogue"}>
                <Chip size="small" label={[e.codeSystem, e.code].filter(Boolean).join(" ")} sx={{ height: 20, fontFamily: "monospace" }} />
              </Tooltip>
            )}
            <Chip size="small" variant="outlined" label={titleCase(e.category)} sx={{ height: 20 }} />
          </>
        )}
        body={(e) => <Text>{[e.details?.stage ? `Stage: ${e.details.stage}` : null, e.remarks].filter(Boolean).join(" · ")}</Text>}
      />
    </Stack>
  );
}

// ── Investigation / package orders ───────────────────────────────────────────
interface DraftOrder {
  title: string;
  diagnosticTestId: string | null;
  type: string;
  priority: string;
  quantity: number;
  instruction: string;
}

export function InvestigationsPanel({ patientId, bookingId, canRecord, catalog }: SectionProps) {
  const [term, setTerm] = useState("");
  const [pick, setPick] = useState<{ name: string; diagnosticTestId: string | null } | null>(null);
  const [type, setType] = useState(catalog.investigationTypes[0] ?? "laboratory");
  const [priority, setPriority] = useState(catalog.priorities[0] ?? "routine");
  const [qty, setQty] = useState("1");
  const [instruction, setInstruction] = useState("");
  const [basket, setBasket] = useState<DraftOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const dq = useDebounce(term.trim(), 300);
  const hits = useQuery({ queryKey: ["doctor", "emr", "inv-search", dq], queryFn: () => emrService.searchInvestigations(dq), enabled: dq.length >= 2 });
  const { saveAll } = useAdd(patientId, bookingId);
  const name = pick?.name ?? term.trim();

  const addToBasket = () => {
    if (!name) return;
    setBasket((b) => [...b, { title: name, diagnosticTestId: pick?.diagnosticTestId ?? null, type, priority, quantity: Math.max(1, Number(qty) || 1), instruction: instruction.trim() }]);
    setTerm(""); setPick(null); setQty("1"); setInstruction("");
  };
  const order = (orders: DraftOrder[]) =>
    saveAll(
      orders.map((o) => ({
        kind: "investigation" as const,
        title: o.title,
        category: o.type,
        details: { priority: o.priority, quantity: o.quantity, diagnosticTestId: o.diagnosticTestId },
        remarks: o.instruction || null,
      })),
    );
  const submit = async () => {
    setSubmitting(true);
    try {
      await order(basket);
      toast.success(`${basket.length} investigation${basket.length === 1 ? "" : "s"} ordered`);
      setBasket([]);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
  // Unsubmitted basket lines — and a test typed but not yet added to the basket —
  // are ordered exactly as shown when the prescription is generated.
  useUnsavedWork(
    "investigation",
    canRecord && bookingId && (basket.length > 0 || name)
      ? {
          label: "Investigation / Package",
          sectionId: sectionDom("investigation"),
          flush: async () => {
            const typed: DraftOrder[] = name
              ? [{ title: name, diagnosticTestId: pick?.diagnosticTestId ?? null, type, priority, quantity: Math.max(1, Number(qty) || 1), instruction: instruction.trim() }]
              : [];
            await order([...basket, ...typed]);
            setBasket([]);
            setTerm(""); setPick(null); setQty("1"); setInstruction("");
          },
        }
      : null,
  );

  return (
    <Stack spacing={1}>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {canRecord && bookingId && (
        <>
          <FormRow>
            <Autocomplete
              freeSolo
              size="small"
              options={hits.data ?? []}
              filterOptions={(x) => x}
              getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
              inputValue={term}
              onInputChange={(_e, v) => { setTerm(v); if (pick && v !== pick.name) setPick(null); }}
              onChange={(_e, v) => setPick(v && typeof v !== "string" ? { name: v.name, diagnosticTestId: v.diagnosticTestId } : null)}
              renderOption={(props, o) => (
                <li {...props} key={o.diagnosticTestId}>
                  <Box>
                    <Typography variant="body2">{o.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Offered by {o.labCount} lab{o.labCount === 1 ? "" : "s"}{o.minPrice != null ? ` · from ₹${o.minPrice}` : ""}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Investigation / package" helperText="Searches tests IHS labs offer; you may type any test" />}
            />
            <TextField size="small" select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              {catalog.investigationTypes.map((t) => <MenuItem key={t} value={t}>{titleCase(t)}</MenuItem>)}
            </TextField>
            <TextField size="small" select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {catalog.priorities.map((t) => <MenuItem key={t} value={t}>{t === "stat" ? "STAT" : titleCase(t)}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 99 } }} />
            <TextField size="small" label="Special instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. fasting sample" />
            <Button variant="outlined" startIcon={<Icon name="FiPlus" />} disabled={!name} onClick={addToBasket}>Add</Button>
          </FormRow>
          {basket.length > 0 && (
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Investigation</TableCell><TableCell>Type</TableCell><TableCell>Priority</TableCell><TableCell>Qty</TableCell><TableCell>Instruction</TableCell><TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {basket.map((o, i) => (
                    <TableRow key={`${o.title}-${i}`}>
                      <TableCell>{o.title}</TableCell>
                      <TableCell>{titleCase(o.type)}</TableCell>
                      <TableCell>{o.priority === "stat" ? "STAT" : titleCase(o.priority)}</TableCell>
                      <TableCell>{o.quantity}</TableCell>
                      <TableCell>{o.instruction || "—"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" aria-label="Remove" onClick={() => setBasket((b) => b.filter((_, j) => j !== i))}><Icon name="FiX" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Stack direction="row" sx={{ justifyContent: "flex-end", p: 1 }}>
                <Button variant="contained" onClick={submit} disabled={submitting}>
                  {submitting ? "Ordering…" : `Submit order (${basket.length})`}
                </Button>
              </Stack>
            </Paper>
          )}
        </>
      )}
      <EntryList
        patientId={patientId}
        kind="investigation"
        bookingId={bookingId}
        empty="No investigations ordered."
        head={(e) => (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.title}</Typography>
            <Chip size="small" variant="outlined" label={titleCase(e.category)} sx={{ height: 20 }} />
            {e.details?.priority && (
              <Chip size="small" color={e.details.priority === "routine" ? "default" : "warning"} label={e.details.priority === "stat" ? "STAT" : titleCase(String(e.details.priority))} sx={{ height: 20 }} />
            )}
          </>
        )}
        body={(e) => <Text>{[`Qty ${e.details?.quantity ?? 1}`, e.remarks].filter(Boolean).join(" · ")}</Text>}
      />
    </Stack>
  );
}

// ── Doctor's notes ───────────────────────────────────────────────────────────
export function NotesPanel({ patientId, bookingId, canRecord, catalog }: SectionProps) {
  const [type, setType] = useState(catalog.noteTypes[0] ?? "progress");
  const [text, setText] = useState("");
  const [published, setPublished] = useState(false);
  const { save, saveAsync, pending } = useAdd(patientId, bookingId);
  // Saved with the doctor's own Published choice: a private note stays private.
  const noteBody = (): NewEntry => ({ kind: "doctor_note", category: type, remarks: text.trim(), patientVisible: published });
  const noteReset = () => { setText(""); setPublished(false); };
  useUnsavedWork(
    "notes",
    canRecord && bookingId && text.trim()
      ? { label: "Doctor's Notes", sectionId: sectionDom("notes"), flush: async () => { await saveAsync(noteBody()); noteReset(); } }
      : null,
  );
  return (
    <Stack spacing={1}>
      <WriteGuard canRecord={canRecord} bookingId={bookingId} />
      {canRecord && bookingId && (
        <Paper variant="outlined" sx={{ p: 1.25, bgcolor: "action.hover" }}>
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" select label="Note type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 180 }}>
                {catalog.noteTypes.map((t) => <MenuItem key={t} value={t}>{titleCase(t)}</MenuItem>)}
              </TextField>
              <FormControlLabel
                control={<Checkbox checked={published} onChange={(e) => setPublished(e.target.checked)} />}
                label={<Typography variant="body2">Published — visible to the patient (final once published)</Typography>}
              />
            </Stack>
            <TextField size="small" label="Notes remarks" value={text} onChange={(e) => setText(e.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 10000 } }} />
            <Box>
              <Button variant="contained" startIcon={<Icon name="FiPlus" />} disabled={!text.trim() || pending}
                onClick={() => save(noteBody(), noteReset)}>
                Add note
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Unpublished notes are private drafts — only you can see them. Other doctors and the patient see a note only after you publish it.
            </Typography>
          </Stack>
        </Paper>
      )}
      <EntryList
        patientId={patientId}
        kind="doctor_note"
        bookingId={bookingId}
        publishable
        empty="No notes yet."
        head={(e) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{titleCase(e.category)} note</Typography>}
        body={(e) => <Text>{e.remarks}</Text>}
      />
    </Stack>
  );
}
