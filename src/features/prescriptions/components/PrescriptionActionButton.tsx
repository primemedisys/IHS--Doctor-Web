"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiEdit3, FiEye, FiFileText } from "react-icons/fi";
import { ROUTES } from "@/constants/routes";
import { useBookingPrescription, usePrescriptionPdf } from "../hooks";
import { RxPdfPreviewDialog } from "./RxPdfPreviewDialog";

/**
 * The one button an appointment shows for prescriptions. Its label depends on
 * what already exists, so the doctor never has to guess:
 *
 *   confirmed/completed, none   → Write prescription
 *   draft exists                → Continue draft
 *   finalized exists            → View prescription (opens the PDF in place)
 *   anything else               → nothing at all
 */
export function PrescriptionActionButton({
  bookingId,
  bookingStatus,
  readOnly = false,
  patientId,
}: {
  bookingId: string;
  /** When set, "Write prescription" opens this patient's workbench on the visit. */
  patientId?: string | number | null;
  bookingStatus: string;
  /**
   * Hide every WRITE action (Write prescription / Continue draft) and keep only
   * "View prescription".
   *
   * Set when this page was reached from the treatment timeline's "View
   * details", i.e. while looking at a PAST consultation. A prescription written
   * there binds to that old booking — a doctor mid-video-consult did exactly
   * that and the prescription landed on a visit from four days earlier. Reading
   * history must never be one click from writing onto it.
   */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pdfOpen, setPdfOpen] = useState(false);
  const eligible = bookingStatus === "confirmed" || bookingStatus === "completed";
  const { data, isLoading, isError, error } = useBookingPrescription(eligible ? bookingId : "");
  const finalized = data?.status === "finalized";
  // Only streams while the viewer is open; disabled until then.
  const pdf = usePrescriptionPdf(data?.id ?? "", pdfOpen && finalized);

  if (!eligible) return null;

  // A 404 means "no prescription yet" — the normal case, not a failure.
  const notFound = isError && error instanceof AxiosError && error.response?.status === 404;
  if (isError && !notFound) return null;

  if (data) {
    if (finalized) {
      // View the finalized PDF right here on the appointments page — no
      // navigating away — just like the patient app's "View".
      return (
        <>
          <Stack spacing={0.5}>
            <Button variant="outlined" startIcon={<FiEye />} onClick={() => setPdfOpen(true)}>
              View prescription
            </Button>
            {data.rxNumber && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                {data.rxNumber}
              </Typography>
            )}
          </Stack>
          <RxPdfPreviewDialog
            open={pdfOpen}
            onClose={() => setPdfOpen(false)}
            title={data.rxNumber ? `Prescription ${data.rxNumber}` : "Prescription"}
            blob={pdf.data}
            isLoading={pdf.isLoading || pdf.isFetching}
            isError={pdf.isError}
            onRetry={() => pdf.refetch()}
            fileName={`${data.rxNumber ?? "prescription"}.pdf`}
          />
        </>
      );
    }

    // A draft: pick up where the doctor left off in the composer.
    if (readOnly) {
      return (
        <Typography variant="body2" color="text.secondary">
          A draft prescription exists for this consultation. Open it from that appointment.
        </Typography>
      );
    }
    return (
      <Button
        variant="contained"
        startIcon={<FiEdit3 />}
        onClick={() => router.push(ROUTES.dashboard.prescription(data.id))}
      >
        Continue draft
      </Button>
    );
  }

  if (readOnly) {
    return (
      <Typography variant="body2" color="text.secondary">
        No prescription for this consultation. To write one, open the appointment it belongs to.
      </Typography>
    );
  }

  return (
    <Button
      variant="contained"
      startIcon={<FiFileText />}
      loading={isLoading}
      // Open the patient workbench on this visit so the doctor reads the full
      // history first; the prescription is written from there. Falls back to the
      // direct composer when the patient id isn't known.
      onClick={() =>
        router.push(
          patientId
            ? ROUTES.dashboard.emrPatient(patientId, bookingId)
            : ROUTES.dashboard.writePrescription(bookingId),
        )
      }
    >
      Write prescription
    </Button>
  );
}
