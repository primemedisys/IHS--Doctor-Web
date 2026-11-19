"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import { FiArrowRight, FiX } from "react-icons/fi";
import { toast } from "sonner";
// Deep import, not the `@/features/appointments` barrel — keeps this off the
// appointments feature's own import graph.
import { AppointmentDetailDialog } from "@/features/appointments/components/AppointmentDetailDialog";
import { getErrorMessage } from "@/utils/error";
import { useStartReferralConsultation } from "../hooks";
import { ReferralContextPanel } from "./ReferralContextPanel";
import type { IncomingReferral } from "@/types/referral";

export interface ReferralCaseDialogProps {
  open: boolean;
  onClose: () => void;
  referral: IncomingReferral;
}

/**
 * Opening a referral IS opening the appointment — same screen, same theme, same
 * data and actions as the Appointments board (description, prescribe, refer
 * onward, complete), with the referring doctor's context added on top.
 *
 * The patient walked over from the referring doctor within the SAME clinic visit,
 * so there's no separate booking to wait for: "Start consultation" creates this
 * doctor's own ₹0 appointment (the visit was already paid on the referring one)
 * and the case opens as a full appointment. Once started, it opens straight there.
 */
export function ReferralCaseDialog({ open, onClose, referral }: ReferralCaseDialogProps) {
  const [startedBookingId, setStartedBookingId] = useState<string | null>(null);
  const start = useStartReferralConsultation();

  // The patient may also have booked online — either way, once a booking exists
  // this IS the appointment screen.
  const bookingId = referral.targetBookingId ?? startedBookingId;
  if (bookingId) {
    return (
      <AppointmentDetailDialog
        appointmentId={bookingId}
        open={open}
        onClose={onClose}
        referral={referral}
      />
    );
  }

  const onStart = () => {
    start.mutate(referral.id, {
      onSuccess: (res) => setStartedBookingId(res.bookingId),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="body">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Referral from {referral.fromDoctor?.name ?? "another doctor"}
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <ReferralContextPanel referral={referral} />
          <Alert severity="info" variant="outlined">
            Start the consultation to see {referral.patient.name ?? "the patient"}&apos;s full details
            and record your own notes, prescription and onward referral — all under this visit, at no
            extra charge to the patient.
          </Alert>
          <Button
            variant="contained"
            size="large"
            endIcon={<FiArrowRight />}
            onClick={onStart}
            loading={start.isPending}
            sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
          >
            Start consultation
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
