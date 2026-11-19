"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { ErrorState, Loading } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import { useBookingPrescription, useCreatePrescription } from "../hooks";

/**
 * `/dashboard/appointments/:bookingId/prescription` — the entry point from an
 * appointment. Resolves the booking's prescription (creating the draft if there
 * isn't one) and hands off to the composer, which is keyed by prescription id.
 *
 * A 404 from `getByBooking` is the ANSWER ("no prescription yet"), not an error.
 */
export function PrescriptionGate({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const existing = useBookingPrescription(bookingId);
  const create = useCreatePrescription();

  // React 18 mounts effects twice in dev; without this we'd POST two drafts and
  // the second would come back 409 RX_ALREADY_EXISTS.
  const started = useRef(false);

  const notFound = existing.isError && existing.error instanceof AxiosError && existing.error.response?.status === 404;

  useEffect(() => {
    if (existing.data) {
      router.replace(ROUTES.dashboard.prescription(existing.data.id));
      return;
    }
    if (notFound && !started.current) {
      started.current = true;
      create.mutate(
        { bookingId },
        {
          onSuccess: (rx) => router.replace(ROUTES.dashboard.prescription(rx.id)),
          onError: (e) => {
            // Another tab / a double submit created it first: open that one —
            // never a second prescription for the same consultation.
            const existingId =
              e instanceof AxiosError && e.response?.status === 409
                ? (e.response.data as { error?: { details?: { prescriptionId?: string } } })?.error?.details?.prescriptionId
                : undefined;
            if (existingId) return router.replace(ROUTES.dashboard.prescription(existingId));
            started.current = false;
          },
        },
      );
    }
  }, [existing.data, notFound, bookingId, create, router]);

  if (create.isError) {
    return (
      <ErrorState
        title="Couldn't start the prescription"
        description={getErrorMessage(create.error)}
        onRetry={() => {
          started.current = false;
          create.reset();
        }}
      />
    );
  }
  if (existing.isError && !notFound) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }
  return <Loading label={notFound ? "Starting a prescription…" : "Opening prescription…"} />;
}
