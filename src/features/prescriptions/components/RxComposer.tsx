"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FiArrowLeft, FiCheck, FiEdit3, FiExternalLink, FiFileText, FiTrash2 } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { queryKeys } from "@/constants/queryKeys";
import { getErrorMessage } from "@/utils/error";
import type { Prescription, PrescriptionItem, WorkbenchSnapshot } from "@/types/prescription";
import { useDeletePrescription, useFinalizePrescription, usePrescription } from "../hooks";
import { prescriptionService } from "../services/prescription.service";
import { formLabel, lineProblems } from "../medicine-line";
import { PrescriptionView } from "./PrescriptionView";
import { RxPad } from "./RxPad";
import { WorkbenchSummary } from "./WorkbenchSummary";
import { draftFrom } from "./draft";
import { ROUTE_LABELS, TIMING_LABELS, durationText, fmtDate } from "./rx-format";

export function RxComposer({ prescriptionId }: { prescriptionId: string }) {
  const router = useRouter();
  const { data: rx, isLoading, isError, refetch } = usePrescription(prescriptionId);

  if (isLoading) return <Loading label="Loading prescription…" />;
  if (isError || !rx) return <ErrorState onRetry={() => refetch()} />;

  // Once finalized, the composer becomes the read-only record. Same route, and
  // the doctor can't be tricked into thinking a locked document is editable.
  if (rx.status === "finalized") {
    return <PrescriptionView prescription={rx} onBack={() => router.push(ROUTES.dashboard.appointments)} />;
  }
  return <DraftReview rx={rx} />;
}

/**
 * A draft prescription, generated from the Patient Workbench.
 *
 * The Workbench is the single source of truth: complaint, examinations,
 * diagnosis + ICD, vitals, investigations, medication order, published advice
 * and follow-up are all entered THERE. This page only shows the draft built
 * from that saved data — in the Form view (the record, section by section) or
 * the Letterhead view (the doctor's own pad, exactly as it prints) — and signs
 * it. Nothing here can be typed, so the two places can never disagree.
 */
function DraftReview({ rx }: { rx: Prescription }) {
  const router = useRouter();
  const qc = useQueryClient();
  const finalize = useFinalizePrescription(rx.id);
  const remove = useDeletePrescription();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [emailPatient, setEmailPatient] = useState(true);
  // Form = the record section by section; Letterhead = the doctor's pad. Both
  // read the SAME saved draft, so switching never changes a value.
  const [view, setView] = useState<"form" | "pad">("form");

  /*
   * Refresh from the Workbench on open (also run by "Save & Generate
   * Prescription" and once more, server-side, at signing). A plain promise,
   * not a mutation's per-call callbacks: those are dropped when StrictMode
   * re-runs effects.
   */
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(rx.clinicalSnapshot ?? null);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const syncStarted = useRef(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await prescriptionService.syncWorkbench(rx.id);
      qc.setQueryData(queryKeys.prescriptions.detail(rx.id), fresh);
      setSnapshot(fresh.clinicalSnapshot ?? null);
      setSyncError(null);
    } catch (e) {
      setSyncError(getErrorMessage(e));
    } finally {
      setRefreshing(false);
      setSynced(true);
    }
  }, [qc, rx.id]);
  useEffect(() => {
    if (syncStarted.current) return;
    syncStarted.current = true;
    void refresh();
  }, [refresh]);

  const draft = draftFrom(rx);
  const template = rx.template;
  const columns = template?.bodyJson.medicineColumns ?? ["medicineName", "dosage", "frequency"];
  const patientId = snapshot?.patient.id ?? rx.patient.id;
  const bookingId = rx.booking?.id ?? null;
  const workbenchHref = patientId && bookingId ? ROUTES.dashboard.emrPatient(patientId, bookingId) : null;
  const locked = {
    chiefComplaint: Boolean(snapshot?.printed.chiefComplaint),
    diagnosis: Boolean(snapshot?.printed.diagnosis),
    vitals: Boolean(snapshot?.printed.vitals),
  };

  // Medicine lines missing an instruction this letterhead prints — fixed in
  // the Workbench Medication Order, never here.
  const required = {
    frequency: columns.includes("frequency"),
    timing: columns.includes("timing"),
    duration: columns.includes("durationDays"),
  };
  const incomplete = rx.items.flatMap((it, i) => {
    if (!it.medicineName.trim()) return [];
    const missing = Object.values(lineProblems(it, required));
    return missing.length ? [`${it.medicineName} (line ${i + 1}): ${missing.join(", ").toLowerCase()}`] : [];
  });
  const canFinalize =
    !refreshing &&
    incomplete.length === 0 &&
    (rx.items.some((i) => i.medicineName.trim()) || rx.adviceSelected.length > 0 || Boolean(rx.noMedication));

  const onFinalize = () => {
    finalize.mutate(emailPatient, {
      onSuccess: (saved) => {
        setConfirmOpen(false);
        // A null pdfUrl means the render failed AFTER the record was signed.
        // The record is valid; the PDF endpoint rebuilds it. Don't alarm anyone.
        toast.success(`Prescription ${saved.rxNumber} signed`);
        // Signed from the video call's side panel? Tell the parent to close the
        // panel and put the call back to full screen. Same-origin target, never
        // "*", so the message cannot leak to another site.
        if (typeof window !== "undefined" && window.self !== window.top) {
          window.parent.postMessage({ type: "ihs:rx-finalized" }, window.location.origin);
          return; // the parent owns navigation now; don't also route this frame
        }
        // Land back on the appointment's detail modal (mark-complete flow).
        router.push(rx.booking?.id ? `${ROUTES.dashboard.appointments}?appointment=${rx.booking.id}` : ROUTES.dashboard.appointments);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const editButton = (label = "Edit in Workbench") =>
    workbenchHref ? (
      <Button size="small" variant="outlined" component={Link} href={workbenchHref} endIcon={<FiExternalLink />}>
        {label}
      </Button>
    ) : null;

  return (
    <Stack spacing={2}>
      {/* header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <IconButton
            onClick={() => router.push(workbenchHref ?? ROUTES.dashboard.appointments)}
            aria-label={workbenchHref ? "Back to the Patient Portal" : "Back to appointments"}
          >
            <FiArrowLeft />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
              Prescription · {rx.patient.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Chip size="small" color="warning" variant="outlined" label="Draft — not signed" />
              {rx.booking && <Chip size="small" variant="outlined" label={`Consultation #${rx.booking.id} · ${fmtDate(rx.booking.date)}`} />}
              {template && <Chip size="small" variant="outlined" label={template.name} />}
              {rx.version > 1 && <Chip size="small" color="warning" label={`Amendment v${rx.version}`} />}
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          {template && (
            <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v: "form" | "pad" | null) => v && setView(v)} aria-label="Preview">
              <ToggleButton value="form" sx={{ textTransform: "none", fontWeight: 700, px: 1.5 }}>
                <FiEdit3 style={{ marginRight: 6 }} /> Form
              </ToggleButton>
              <ToggleButton value="pad" sx={{ textTransform: "none", fontWeight: 700, px: 1.5 }}>
                <FiFileText style={{ marginRight: 6 }} /> Letterhead
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          {editButton()}
          <Button
            color="error"
            startIcon={<FiTrash2 />}
            onClick={() =>
              remove.mutate(rx.id, {
                onSuccess: () => {
                  toast.success("Draft discarded");
                  router.push(ROUTES.dashboard.appointments);
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              })
            }
          >
            Discard draft
          </Button>
          <Button variant="contained" startIcon={<FiCheck />} disabled={!canFinalize} onClick={() => setConfirmOpen(true)}>
            Finalize
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ py: 0.25 }}>
        Generated from the saved Patient Portal consultation. To change anything, edit it in the Workbench and press
        <b> Save &amp; Generate Prescription</b> again.
      </Alert>

      {syncError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refresh()} disabled={refreshing}>Retry</Button>}>
          Couldn&apos;t refresh from the Patient Portal: {syncError}. Showing the draft as last saved.
        </Alert>
      )}

      {!synced && !snapshot ? (
        <Loading label="Loading the Workbench record…" />
      ) : view === "pad" && template ? (
        <RxPad
          rx={rx}
          template={template}
          draft={draft}
          onPatch={() => undefined}
          locked={locked}
          readOnly
          investigations={snapshot?.printed.investigations ?? []}
          followUpNote={snapshot?.printed.followUpNote ?? null}
        />
      ) : (
        <Stack spacing={2}>
          {snapshot ? (
            <WorkbenchSummary snapshot={snapshot} onRefresh={() => void refresh()} refreshing={refreshing} hideFollowUp />
          ) : (
            <Alert severity="warning">
              This prescription has no Patient Workbench consultation to read from. Open the patient from their appointment to record the consultation.
            </Alert>
          )}

          <Card variant="outlined">
            <CardContent>
              <SectionTitle>℞ Prescribed medicines</SectionTitle>
              {rx.items.length ? (
                <MedicinesReview items={rx.items} />
              ) : (
                <Empty action={editButton("Open Medication Order")}>
                  {rx.noMedication
                    ? "Medication not needed for this consultation (ticked in the Workbench)."
                    : "No medicines saved in the Workbench Medication Order for this consultation."}
                </Empty>
              )}
              {incomplete.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                  Complete in the Workbench Medication Order before signing: {incomplete.join(" · ")}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <SectionTitle>Advice &amp; follow-up (as printed)</SectionTitle>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Label>Advice</Label>
                  {rx.advice?.trim() ? (
                    <>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{rx.advice}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {snapshot?.advice?.length
                          ? "From your published doctor's notes in the Workbench."
                          : "Written on this draft earlier (not from a published Workbench note)."}
                      </Typography>
                    </>
                  ) : (
                    <Empty>No advice — publish a doctor&apos;s note in the Workbench to print advice. Private notes never print.</Empty>
                  )}
                  {rx.adviceSelected.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <Box component="span" sx={{ color: "text.secondary" }}>Ticked on the letterhead: </Box>
                      {rx.adviceSelected.join(", ")}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Label>Follow-up</Label>
                  {rx.followUpDate ? (
                    <Typography variant="body2">
                      <b>{fmtDate(rx.followUpDate)}</b>
                      {snapshot?.printed.followUpNote ? ` — ${snapshot.printed.followUpNote}` : ""}
                    </Typography>
                  ) : (
                    <Empty>No follow-up date set in the Workbench.</Empty>
                  )}
                </Box>
              </Box>
              {rx.notes?.trim() && (
                <Box sx={{ mt: 2 }}>
                  <Label>Notes (written on this draft earlier — also print)</Label>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{rx.notes}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Always reachable: a long review ends at the foot of the page.
          `<span>` wrapper: a disabled control fires no events, so the tooltip
          explaining WHY it's disabled needs a live element to hang off. */}
      <Tooltip
        title={
          canFinalize
            ? "Sign & lock this prescription"
            : refreshing
              ? "Refreshing from the Workbench…"
              : incomplete.length
                ? "Complete every medicine line in the Workbench Medication Order first"
                : "Save a medication order (or tick “Medication not needed”) in the Workbench first"
        }
        placement="left"
      >
        <Box component="span" sx={{ position: "fixed", right: { xs: 16, md: 28 }, bottom: { xs: 88, md: 32 }, zIndex: (theme) => theme.zIndex.speedDial }}>
          <Fab variant="extended" color="primary" disabled={!canFinalize} onClick={() => setConfirmOpen(true)} sx={{ fontWeight: 700, textTransform: "none", px: 2.5, boxShadow: 3 }}>
            <FiCheck style={{ marginRight: 8 }} />
            Finalize
          </Fab>
        </Box>
      </Tooltip>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Sign this prescription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It will be signed, numbered and locked. You can’t edit it afterwards — only amend it. The letterhead is frozen
            exactly as it looks today, and the Workbench record is captured once more at signing.
          </DialogContentText>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            When you finalize, these medicines are added to the patient&apos;s My Medicines so they can set reminders.
          </Typography>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox checked={emailPatient} onChange={(e) => setEmailPatient(e.target.checked)} />}
            label="Email a copy to the patient"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={finalize.isPending} onClick={onFinalize} startIcon={<FiCheck />}>
            {finalize.isPending ? "Signing…" : "Sign & lock"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/** The medicines of the Workbench medication order, as they print. */
function MedicinesReview({ items }: { items: PrescriptionItem[] }) {
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          minWidth: 720,
          borderCollapse: "collapse",
          fontSize: 13.5,
          "& th, & td": { borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "left", verticalAlign: "top" },
          "& th": { color: "text.secondary", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" },
        }}
      >
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Strength</th>
            <th>Dose</th>
            <th>Frequency</th>
            <th>Food direction</th>
            <th>Duration</th>
            <th>Qty</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.medicineName}-${idx}`}>
              <td>
                <b>{i.medicineName}</b>
                <Typography component="div" variant="caption" color="text.secondary">
                  {[
                    i.dosageForm ? formLabel(i.dosageForm) : i.route ? ROUTE_LABELS[i.route] : null,
                    i.nameType ? (i.nameType === "generic" ? "Generic" : "Trade") : null,
                    i.priority && i.priority !== "routine" ? i.priority.toUpperCase() : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </td>
              <td>{i.strength ?? "—"}</td>
              <td>{i.dosage ?? "—"}</td>
              <td>{i.frequency ?? "—"}</td>
              <td>{i.timing ? TIMING_LABELS[i.timing] : "—"}</td>
              <td>{durationText(i.durationDays, i.durationUnit) || "—"}</td>
              <td>{i.quantity ?? "—"}</td>
              <td>{i.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, letterSpacing: 0.2 }}>
      {children}
    </Typography>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, lineHeight: 1.8, display: "block" }}>
      {children}
    </Typography>
  );
}

/** "Nothing here yet — complete it in the Workbench." */
function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
      <Typography variant="body2" color="text.secondary">{children}</Typography>
      {action}
    </Stack>
  );
}
