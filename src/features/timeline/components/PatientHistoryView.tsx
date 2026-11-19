"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { EmptyState, ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { RxPdfPreviewDialog } from "@/features/prescriptions/components/RxPdfPreviewDialog";
import { usePrescriptionPdf } from "@/features/prescriptions/hooks/usePrescription";
import type { TimelineFilters } from "@/types/timeline";
import { useTimelineByBooking, useTimelineByPatient } from "../hooks";
import { TimelineToolbar } from "./TimelineToolbar";
import { TreatmentTimelineTable } from "./TreatmentTimelineTable";

type Source =
  | { by: "booking"; bookingId: string }
  | { by: "patient"; patientId: string; patientName?: string | null };

/**
 * A patient's full treatment history, full-width.
 *
 * Two entry points, one page (docs/treatment-timeline §5.3 / §5.4):
 *   • booking-keyed — opened in a NEW TAB from an appointment or a live video
 *     consult, so the call is never torn down;
 *   • patient-keyed — from the My Patients roster.
 *
 * A treating doctor CAN open prior prescriptions (README §7-A, decided
 * 2026-07-28) — every read is re-authorized server-side, so holding an id
 * grants nothing on its own. "View details" opens that consultation's full
 * patient page (vitals, notes, reports).
 */
export function PatientHistoryView({ source }: { source: Source }) {
  const [filters, setFilters] = useState<TimelineFilters>({ sort: "newest" });
  const [viewingRx, setViewingRx] = useState<string | null>(null);
  const pdf = usePrescriptionPdf(viewingRx ?? "", Boolean(viewingRx));

  const byBooking = useTimelineByBooking(source.by === "booking" ? source.bookingId : "", filters);
  const byPatient = useTimelineByPatient(source.by === "patient" ? source.patientId : "", filters);
  const q = source.by === "booking" ? byBooking : byPatient;

  const backHref =
    source.by === "booking"
      ? ROUTES.dashboard.patientDescription(source.bookingId)
      : ROUTES.dashboard.patients;
  const backLabel = source.by === "booking" ? "Back to patient" : "Back to My Patients";

  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        href={backHref}
        startIcon={<FiArrowLeft />}
        color="inherit"
        sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
      >
        {backLabel}
      </Button>

      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Treatment history
          {source.by === "patient" && source.patientName ? ` · ${source.patientName}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Previous consultations across all doctors. The consultation in progress isn&apos;t listed.
        </Typography>
      </div>

      {q.isLoading ? (
        <Loading label="Loading treatment history…" />
      ) : q.isError || !q.data ? (
        <ErrorState title="Couldn't load this history" onRetry={() => q.refetch()} />
      ) : (
        <>
          <TimelineToolbar
            filters={filters}
            years={q.data.years}
            total={q.data.total}
            onChange={setFilters}
          />
          {q.data.rows.length === 0 ? (
            <EmptyState
              icon="FiActivity"
              title="No previous consultations"
              description="Nothing on record for this patient yet."
            />
          ) : (
            <>
              <TreatmentTimelineTable
                rows={q.data.rows}
                onViewPrescription={(row) => setViewingRx(row.prescription?.id ?? null)}
                // NEW TAB, not a push. This page is often itself opened from a
                // LIVE video consult, and the destination offers prescription
                // actions bound to that PAST booking — keeping the history tab
                // intact makes the context switch visible instead of silently
                // replacing where the doctor thought they were.
                // `?from=history` puts the destination in READ-ONLY mode:
                // it may show an existing prescription but never offers to
                // write one, because a prescription written there would bind
                // to this PAST booking rather than the live consultation.
                onViewDetails={(row) =>
                  window.open(
                    `${ROUTES.dashboard.patientDescription(row.bookingId)}?from=history`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              />
              {q.data.capped && (
                <Typography variant="caption" color="text.secondary">
                  Showing the 200 most recent consultations.
                </Typography>
              )}
            </>
          )}
        </>
      )}

      {/* The prescription PDF. The server re-checks on every request that this
          doctor either authored it or has a booking with its patient, so
          holding an id grants nothing on its own. */}
      <RxPdfPreviewDialog
        open={Boolean(viewingRx)}
        onClose={() => setViewingRx(null)}
        title="Prescription"
        blob={pdf.data}
        isLoading={pdf.isLoading}
        isError={pdf.isError}
        onRetry={() => pdf.refetch()}
      />
    </Stack>
  );
}
