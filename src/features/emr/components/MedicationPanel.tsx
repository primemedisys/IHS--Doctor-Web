"use client";

import { useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
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
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/common/Icon";
import { ROUTES } from "@/constants/routes";
import { queryKeys } from "@/constants/queryKeys";
import { getErrorMessage } from "@/utils/error";
import { useBookingPrescription, useCreatePrescription, useUpdatePrescription } from "@/features/prescriptions/hooks";
import { MedicinePicker } from "@/features/prescriptions/components/MedicinePicker";
import {
  baseName,
  FREQUENCY_OPTIONS,
  formLabel,
  fromHit,
  isBlankLine,
  lineLabel,
  lineProblems,
  routeForForm,
  sameMedicine,
  TIMING_LABEL,
} from "@/features/prescriptions/medicine-line";
import { emrService } from "../services/emr.service";
import { unsavedError, useUnsavedWork } from "./UnsavedWork";
import { emrKeys } from "../hooks";
import { dayLabel, titleCase } from "../format";
import type { EmrCatalog, EmrVisit, VisitRxItem } from "@/types/emr";
import type { DurationUnit, MedicineRoute, MedicineTiming, Prescription, PrescriptionItem } from "@/types/prescription";

const blankItem = (): PrescriptionItem => ({
  medicineId: null,
  medicineMasterId: null,
  medicineName: "",
  strength: null,
  dosageForm: null,
  dosage: null,
  route: "oral",
  frequency: null,
  // The doctor chooses before / after food — never pre-selected.
  timing: null,
  durationDays: null,
  durationUnit: "day",
  notes: null,
  quantity: null,
  priority: null,
  nameType: null,
});

/**
 * Medication order for THIS visit — the existing prescription draft of the
 * booking (same model, same pharmacy/medicine-store flow, same finalize +
 * PDF). Picking a medicine fills in only what its record holds (name,
 * strength, dosage form); frequency, food direction, duration, dose and
 * quantity are always the doctor's. Copying a previous prescription needs the
 * doctor's explicit confirmation and still has to be saved and signed.
 */
export function MedicationPanel({
  bookingId,
  canRecord,
  catalog,
  patientId,
  visits,
}: {
  bookingId: string | null;
  canRecord: boolean;
  catalog: EmrCatalog;
  patientId: string;
  visits: EmrVisit[];
}) {
  const rxq = useBookingPrescription(bookingId ?? "");
  const create = useCreatePrescription();
  const none = rxq.error instanceof AxiosError && rxq.error.response?.status === 404;

  if (!bookingId || !canRecord) {
    return <Alert severity="info">Medication orders are written on a confirmed or completed visit with you.</Alert>;
  }
  if (rxq.isLoading) return <Typography variant="body2" color="text.secondary">Loading prescription…</Typography>;
  if (rxq.isError && !none) return <Alert severity="error">{getErrorMessage(rxq.error)}</Alert>;

  if (none || !rxq.data) {
    return (
      <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" sx={{ mb: 1 }}>No prescription for this visit yet.</Typography>
        <Button
          variant="contained"
          startIcon={<Icon name="FiPlus" />}
          disabled={create.isPending}
          onClick={() => create.mutate({ bookingId }, { onSuccess: () => rxq.refetch(), onError: (e) => toast.error(getErrorMessage(e)) })}
        >
          Start medication order
        </Button>
      </Paper>
    );
  }

  const rx = rxq.data;
  if (rx.status === "finalized") return <FinalizedRx rx={rx} bookingId={bookingId} />;
  return <DraftEditor key={rx.id} rx={rx} bookingId={bookingId} catalog={catalog} patientId={patientId} visits={visits} />;
}

function FinalizedRx({ rx, bookingId }: { rx: Prescription; bookingId: string }) {
  return (
    <Stack spacing={1}>
      <Alert severity="success" action={<Button size="small" component={Link} href={ROUTES.dashboard.writePrescription(bookingId)}>Open / amend</Button>}>
        Prescription {rx.rxNumber ?? ""} signed {rx.finalizedAt ? dayLabel(rx.finalizedAt.slice(0, 10)) : ""}. A signed prescription is final — amending creates a new version.
      </Alert>
      {rx.noMedication && !rx.items.length ? (
        <Typography variant="body2">Medication not needed for this visit.</Typography>
      ) : (
        <ItemsReadOnly items={rx.items as VisitRxItem[]} />
      )}
    </Stack>
  );
}

export function ItemsReadOnly({ items }: { items: VisitRxItem[] }) {
  if (!items.length) return <Typography variant="body2" color="text.secondary">No medicines.</Typography>;
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13, "& td, & th": { borderBottom: 1, borderColor: "divider", px: 1, py: 0.5, textAlign: "left", verticalAlign: "top" } }}>
        <thead>
          <tr><th>Medicine</th><th>Strength</th><th>Dose</th><th>Frequency</th><th>Direction</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr>
        </thead>
        <tbody>
          {items.map((i, idx) => {
            const it = i as VisitRxItem & { dosageForm?: string | null };
            return (
              <tr key={`${i.medicineName}-${idx}`}>
                <td>
                  <b>{i.medicineName}</b>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {[it.dosageForm ? formLabel(it.dosageForm) : titleCase(i.route), i.nameType ? titleCase(i.nameType) : null, i.priority && i.priority !== "routine" ? i.priority.toUpperCase() : null].filter(Boolean).join(" · ")}
                  </Typography>
                </td>
                <td>{i.strength ?? "—"}</td>
                <td>{i.dosage ?? "—"}</td>
                <td>{i.frequency ?? "—"}</td>
                <td>{i.timing ? TIMING_LABEL[i.timing] ?? i.timing : "—"}</td>
                <td>{i.durationDays ? `${i.durationDays} ${i.durationUnit}${i.durationDays > 1 ? "s" : ""}` : "—"}</td>
                <td>{i.quantity ?? "—"}</td>
                <td>{i.notes ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
}

function DraftEditor({ rx, bookingId, catalog, patientId, visits }: { rx: Prescription; bookingId: string; catalog: EmrCatalog; patientId: string; visits: EmrVisit[] }) {
  const update = useUpdatePrescription(rx.id);
  const qc = useQueryClient();
  // An empty order opens with one line ready to fill in.
  const [items, setItems] = useState<PrescriptionItem[]>(rx.items.length ? rx.items : [blankItem()]);
  const [noMed, setNoMed] = useState(Boolean(rx.noMedication));
  const [copyOpen, setCopyOpen] = useState(false);
  // Problems are shown once the doctor tries to save, not while a fresh line is still empty.
  const [tried, setTried] = useState(false);
  // "Unsaved changes" = the form differs from what the server last confirmed (blank lines don't count).
  const snapshot = (list: PrescriptionItem[], flag: boolean) => JSON.stringify({ list: list.filter((i) => !isBlankLine(i)), flag });
  const [baseline, setBaseline] = useState(() => snapshot(rx.items, Boolean(rx.noMedication)));
  const dirty = snapshot(items, noMed) !== baseline;

  const set = (i: number, patch: Partial<PrescriptionItem>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const rowProblems = items.map((it) => lineProblems(it));
  const problems = noMed
    ? []
    : rowProblems.flatMap((p, i) => Object.values(p).map((m) => `Medicine ${i + 1}: ${m}`));

  /** One save path for the button and for "Save & Generate Prescription". Throws a readable message. */
  const persist = async () => {
    setTried(true);
    // A never-started "add another" line is skipped, never sent (the API requires a name on every line).
    const toSave = noMed ? [] : items.filter((i) => !isBlankLine(i));
    if (!noMed && !toSave.length) throw new Error("Add at least one medicine, or tick “Medication not needed”.");
    if (toSave.some((i) => Object.keys(lineProblems(i)).length)) throw new Error("Complete or remove the highlighted medicine lines first.");
    await update.mutateAsync({ items: toSave, noMedication: noMed });
    setBaseline(snapshot(items, noMed));
    setTried(false);
    qc.invalidateQueries({ queryKey: emrKeys.patient(patientId) });
    qc.invalidateQueries({ queryKey: queryKeys.prescriptions.byBooking(bookingId) });
  };
  const save = () =>
    persist().then(
      () => toast.success("Medication order saved (draft)"),
      (e) => toast.error(getErrorMessage(e)),
    );
  useUnsavedWork(
    "medication",
    dirty
      ? {
          label: "Medication Order",
          sectionId: "emr-section-medication",
          flush: () => persist().catch((e) => Promise.reject(unsavedError("Medication Order", getErrorMessage(e)))),
        }
      : null,
  );

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <FormControlLabel
          control={<Checkbox size="small" checked={noMed} onChange={(e) => setNoMed(e.target.checked)} />}
          label={<Typography variant="body2">Medication not needed</Typography>}
        />
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<Icon name="FiCopy" />} disabled={noMed} onClick={() => setCopyOpen(true)}>
          Copy previous medication
        </Button>
        <Tooltip title="Your “My Medicines” list — it appears first in search, and new medicines you add land there.">
          <Button size="small" component={Link} href={ROUTES.dashboard.medicines} startIcon={<Icon name="FiStar" />}>
            My medicines
          </Button>
        </Tooltip>
      </Stack>

      {!noMed && (
        <Stack spacing={0.75}>
          {items.map((it, i) => (
            <ItemRow
              key={i}
              item={it}
              index={i}
              catalog={catalog}
              problems={tried ? rowProblems[i] : {}}
              duplicateOf={items.findIndex((other, j) => j < i && !isBlankLine(it) && sameMedicine(other, it))}
              onChange={(p) => set(i, p)}
              onRemove={() => setItems((l) => l.filter((_, j) => j !== i))}
            />
          ))}
          <Box>
            <Button size="small" variant="outlined" startIcon={<Icon name="FiPlus" />} onClick={() => setItems((l) => [...l, blankItem()])}>
              {items.length ? "Add another medicine" : "Add medicine"}
            </Button>
          </Box>
        </Stack>
      )}

      {tried && problems.length > 0 && (
        <Alert severity="warning" sx={{ py: 0 }}>
          {problems.length === 1 ? problems[0] : `${problems.length} things to complete before saving — see the highlighted fields.`}
        </Alert>
      )}

      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="contained" onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save medication order"}
        </Button>
        <Button component={Link} href={ROUTES.dashboard.writePrescription(bookingId)} startIcon={<Icon name="FiFileText" />}>
          Review &amp; sign prescription
        </Button>
        <Typography variant="caption" color="text.secondary">
          {dirty ? "Unsaved changes — " : ""}Draft. The patient sees it only after you sign it in the prescription composer.
        </Typography>
      </Stack>

      {copyOpen && (
        <CopyPreviousDialog
          patientId={patientId}
          visits={visits.filter((v) => v.bookingId !== bookingId && v.status === "completed")}
          onClose={() => setCopyOpen(false)}
          onCopy={(copied) => {
            setItems((l) => [...l.filter((x) => !isBlankLine(x)), ...copied]);
            setCopyOpen(false);
            toast.info("Copied — review each line, then save");
          }}
        />
      )}
    </Stack>
  );
}

const chipSx = { height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } } as const;

function ItemRow({
  item,
  index,
  catalog,
  problems,
  duplicateOf,
  onChange,
  onRemove,
}: {
  item: PrescriptionItem;
  index: number;
  catalog: EmrCatalog;
  problems: ReturnType<typeof lineProblems>;
  duplicateOf: number;
  onChange: (p: Partial<PrescriptionItem>) => void;
  onRemove: () => void;
}) {
  // Strength from the picked record is shown as-is; it is typed only when the record has none.
  const fromRecord = Boolean((item.medicineMasterId || item.medicineId) && item.strength);
  const freq = FREQUENCY_OPTIONS.find((f) => f.value === item.frequency);

  return (
    <Paper variant="outlined" sx={{ p: 1, borderColor: Object.keys(problems).length ? "warning.main" : "divider" }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
          Medicine {index + 1}
        </Typography>
        {item.medicineMasterId && <Chip size="small" variant="outlined" label="IHS catalogue" sx={chipSx} />}
        {item.medicineId && <Chip size="small" variant="outlined" label="My medicines" sx={chipSx} />}
        {duplicateOf >= 0 && <Chip size="small" color="warning" label={`Same medicine as line ${duplicateOf + 1}`} sx={chipSx} />}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Remove this medicine">
          <IconButton aria-label={`Remove medicine ${index + 1}`} onClick={onRemove} size="small">
            <Icon name="FiTrash2" size={15} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 0.75,
          alignItems: "start",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(6, minmax(0, 1fr))", xl: "minmax(0, 2.6fr) repeat(6, minmax(0, 1fr))" },
        }}
      >
        <Box sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1", xl: "auto" }, minWidth: 0 }}>
          <MedicinePicker
            value={item.medicineName}
            label={`Medicine ${index + 1}`}
            error={problems.medicine}
            autoFocus={!item.medicineName && index > 0}
            onPick={(hit) => {
              onChange(fromHit(hit, item));
            }}
          />
        </Box>
        <TextField
          size="small"
          label="Strength"
          value={item.strength ?? ""}
          placeholder={item.medicineName ? "e.g. 500 mg" : ""}
          onChange={(e) => {
            const strength = e.target.value || null;
            onChange({ strength, medicineName: item.medicineName ? lineLabel(baseName(item), strength) : item.medicineName });
          }}
          slotProps={{ input: { readOnly: fromRecord }, htmlInput: { maxLength: 100 } }}
          helperText={fromRecord ? "From medicine record" : undefined}
          disabled={!item.medicineName}
        />
        <TextField
          size="small"
          select
          label="Dosage form"
          value={item.dosageForm ?? ""}
          onChange={(e) => {
            const dosageForm = e.target.value || null;
            onChange({ dosageForm, route: routeForForm(dosageForm) ?? item.route });
          }}
          disabled={!item.medicineName}
        >
          <MenuItem value="">—</MenuItem>
          {catalog.dosageForms.map((f) => <MenuItem key={f} value={f}>{formLabel(f)}</MenuItem>)}
        </TextField>
        <Autocomplete
          freeSolo
          size="small"
          options={FREQUENCY_OPTIONS.map((f) => f.value)}
          getOptionLabel={(v) => FREQUENCY_OPTIONS.find((f) => f.value === v)?.label ?? v}
          inputValue={item.frequency ?? ""}
          // "reset" fires after an option is picked with its display LABEL
          // ("BD — Twice daily"); the picked value ("BD") is already set by onChange.
          onInputChange={(_e, v, reason) => {
            if (reason === "reset") return;
            onChange({ frequency: v.trim() ? v : null });
          }}
          onChange={(_e, v) => onChange({ frequency: v || null })}
          renderInput={(params) => (
            <TextField {...params} label="Frequency" required error={Boolean(problems.frequency)} helperText={problems.frequency ?? (freq ? freq.label.split(" — ")[1] : undefined)} />
          )}
        />
        <TextField
          size="small"
          select
          label="Food"
          required
          value={item.timing ?? ""}
          onChange={(e) => onChange({ timing: (e.target.value || null) as MedicineTiming | null })}
          error={Boolean(problems.timing)}
          helperText={problems.timing}
        >
          {catalog.medicineTimings.map((t) => <MenuItem key={t} value={t}>{TIMING_LABEL[t] ?? titleCase(t)}</MenuItem>)}
        </TextField>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(56px, 1fr) minmax(76px, 1fr)", gap: 0.5 }}>
          <TextField
            size="small"
            label="Duration"
            type="number"
            required
            value={item.durationDays ?? ""}
            onChange={(e) => onChange({ durationDays: e.target.value ? Number(e.target.value) : null })}
            error={Boolean(problems.duration)}
            helperText={problems.duration}
            slotProps={{ htmlInput: { min: 1, max: 365 } }}
          />
          <TextField size="small" select value={item.durationUnit} onChange={(e) => onChange({ durationUnit: e.target.value as DurationUnit })} slotProps={{ htmlInput: { "aria-label": "Duration unit" } }}>
            {catalog.durationUnits.map((u) => <MenuItem key={u} value={u}>{titleCase(u)}s</MenuItem>)}
          </TextField>
        </Box>
        <TextField
          size="small"
          label="Qty"
          type="number"
          value={item.quantity ?? ""}
          onChange={(e) => onChange({ quantity: e.target.value ? Number(e.target.value) : null })}
          error={Boolean(problems.quantity)}
          helperText={problems.quantity}
          slotProps={{ htmlInput: { min: 1, max: 9999 } }}
        />
      </Box>

      {/* Secondary details — all optional. */}
      <Box sx={{ display: "grid", gap: 0.75, mt: 0.75, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "1fr 1fr 1fr 3fr" } }}>
        <TextField size="small" label="Dose" value={item.dosage ?? ""} onChange={(e) => onChange({ dosage: e.target.value || null })} placeholder="e.g. 1 tab" slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextField
          size="small"
          select
          label="Name on Rx"
          value={item.nameType ?? ""}
          onChange={(e) => onChange({ nameType: (e.target.value || null) as PrescriptionItem["nameType"] })}
        >
          <MenuItem value="">—</MenuItem>
          {catalog.medicineNameTypes.map((t) => <MenuItem key={t} value={t}>{titleCase(t)}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Priority" value={item.priority ?? ""} onChange={(e) => onChange({ priority: (e.target.value || null) as PrescriptionItem["priority"] })}>
          <MenuItem value="">—</MenuItem>
          {catalog.priorities.map((p) => <MenuItem key={p} value={p}>{p === "stat" ? "STAT" : titleCase(p)}</MenuItem>)}
        </TextField>
        <TextField
          size="small"
          label="Special instruction"
          value={item.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value || null })}
          sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
      </Box>
    </Paper>
  );
}

function CopyPreviousDialog({ patientId, visits, onClose, onCopy }: { patientId: string; visits: EmrVisit[]; onClose: () => void; onCopy: (items: PrescriptionItem[]) => void }) {
  const [visitId, setVisitId] = useState(visits[0]?.bookingId ?? "");
  const summary = useQuery({ queryKey: emrKeys.visit(patientId, visitId), queryFn: () => emrService.visitSummary(patientId, visitId), enabled: Boolean(visitId) });
  const items = summary.data?.prescription?.items ?? [];
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Copy previous medication</DialogTitle>
      <DialogContent dividers>
        {!visits.length ? (
          <Typography variant="body2">No previous completed visits.</Typography>
        ) : (
          <Stack spacing={1.25}>
            <TextField size="small" select label="From visit" value={visitId} onChange={(e) => setVisitId(e.target.value)}>
              {visits.map((v) => (
                <MenuItem key={v.bookingId} value={v.bookingId}>
                  {dayLabel(v.date)} · {v.doctor?.name ?? "Doctor"} · #{v.bookingId}
                </MenuItem>
              ))}
            </TextField>
            {summary.isLoading ? <Typography variant="body2">Loading…</Typography> : <ItemsReadOnly items={items} />}
            <Alert severity="info" sx={{ py: 0 }}>
              Copied lines are added to this visit&apos;s draft for you to review and change. Nothing is saved or signed until you do.
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!items.length}
          onClick={() =>
            onCopy(
              items.map((i) => {
                const x = i as VisitRxItem & { strength?: string | null; dosageForm?: string | null; medicineMasterId?: string | null };
                return {
                  medicineId: i.medicineId,
                  medicineMasterId: x.medicineMasterId ?? null,
                  medicineName: i.medicineName,
                  strength: x.strength ?? null,
                  dosageForm: x.dosageForm ?? null,
                  dosage: i.dosage,
                  route: i.route as MedicineRoute,
                  frequency: i.frequency,
                  timing: (i.timing ?? null) as MedicineTiming | null,
                  durationDays: i.durationDays,
                  durationUnit: i.durationUnit as DurationUnit,
                  notes: i.notes,
                  quantity: i.quantity,
                  priority: (i.priority ?? null) as PrescriptionItem["priority"],
                  nameType: (i.nameType ?? null) as PrescriptionItem["nameType"],
                };
              }),
            )
          }
        >
          Copy {items.length} line{items.length === 1 ? "" : "s"} for review
        </Button>
      </DialogActions>
    </Dialog>
  );
}
