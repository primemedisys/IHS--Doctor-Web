"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FiArrowLeft, FiDownload, FiEdit3 } from "react-icons/fi";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import type { Prescription } from "@/types/prescription";
import { useAmendPrescription, usePrescriptionPdf } from "../hooks";
import { RxPdfPreviewDialog } from "./RxPdfPreviewDialog";
import { WorkbenchSummary } from "./WorkbenchSummary";
import { durationText, fmtDate } from "./rx-format";

/**
 * A finalized prescription: signed, numbered, frozen. The only writes available
 * are "amend" (which creates a new version) and "download".
 */
export function PrescriptionView({ prescription: rx, onBack }: { prescription: Prescription; onBack?: () => void }) {
  const router = useRouter();
  const amend = useAmendPrescription(rx.id);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [reason, setReason] = useState("");

  // `pdfUrl` may legitimately be null when the render failed after signing —
  // the endpoint rebuilds it from the frozen snapshot. Always ask the endpoint.
  const pdf = usePrescriptionPdf(rx.id, pdfOpen);

  const superseded = !!rx.supersededById;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <IconButton onClick={() => (onBack ? onBack() : router.back())} aria-label="Back">
            <FiArrowLeft />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
              {rx.rxNumber}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
              <Chip size="small" color={superseded ? "default" : "success"} label={superseded ? "Superseded" : "Signed"} variant={superseded ? "outlined" : "filled"} />
              <Chip size="small" variant="outlined" label={`v${rx.version}`} />
              <Typography variant="caption" color="text.secondary">
                {rx.patient.name} · {fmtDate(rx.finalizedAt)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FiDownload />} onClick={() => setPdfOpen(true)}>
            View &amp; download
          </Button>
          {!superseded && (
            <Button variant="contained" startIcon={<FiEdit3 />} onClick={() => setAmendOpen(true)}>
              Amend
            </Button>
          )}
        </Stack>
      </Stack>

      {rx.amendReason && (
        <Typography variant="body2" color="text.secondary">
          Amended: {rx.amendReason}
        </Typography>
      )}

      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
        <Summary rx={rx} />
      </Box>

      {/* The Patient Workbench record frozen with the signature (migration 059). */}
      {rx.clinicalSnapshot && <WorkbenchSummary snapshot={rx.clinicalSnapshot} readOnly />}

      <RxPdfPreviewDialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title={rx.rxNumber ?? "Prescription"}
        blob={pdf.data}
        isLoading={pdf.isLoading || pdf.isFetching}
        isError={pdf.isError}
        onRetry={() => pdf.refetch()}
        fileName={`${rx.rxNumber ?? "prescription"}.pdf`}
      />

      <Dialog open={amendOpen} onClose={() => setAmendOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Amend this prescription</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The signed copy stays on record and is marked superseded. A new editable version opens,
            pre-filled with everything you wrote.
          </DialogContentText>
          <TextField autoFocus fullWidth size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAmendOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!reason.trim() || amend.isPending}
            onClick={() =>
              amend.mutate(reason.trim(), {
                onSuccess: (draft) => {
                  setAmendOpen(false);
                  toast.success("Amendment started");
                  router.push(ROUTES.dashboard.prescription(draft.id));
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              })
            }
          >
            Start amendment
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function Summary({ rx }: { rx: Prescription }) {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        {rx.diagnosis && <Field label="Diagnosis" value={rx.diagnosis} />}
        {rx.chiefComplaint && <Field label="Chief complaint" value={rx.chiefComplaint} />}

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Medicines
          </Typography>
          {rx.items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              None prescribed.
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {rx.items.map((i, idx) => (
                <Typography key={idx} variant="body2">
                  <b>{i.medicineName}</b>
                  {[i.dosage, i.frequency, durationText(i.durationDays, i.durationUnit)]
                    .filter(Boolean)
                    .map((part) => ` · ${part}`)
                    .join("")}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>

        {rx.adviceSelected.length > 0 && <Field label="Investigations advised" value={rx.adviceSelected.join(", ")} />}
        {rx.advice && <Field label="Advice" value={rx.advice} />}
        {rx.followUpDate && <Field label="Follow-up" value={fmtDate(rx.followUpDate)} />}
      </Stack>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {value}
      </Typography>
    </Box>
  );
}
