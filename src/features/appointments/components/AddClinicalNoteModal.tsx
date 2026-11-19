"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { FiX } from "react-icons/fi";
import { ClinicalNoteForm } from "./ClinicalNoteForm";
import type { ClinicalNote } from "@/types/appointment";

/**
 * A clinical note ("Test and Details" — c/o, o/e, h/o, diagnosis, treatment,
 * vitals) captured in a modal. Opened from the prescription composer's Vitals
 * card so the doctor can record fresh vitals without leaving the draft; the
 * created note is handed back to prefill the prescription.
 */
export function AddClinicalNoteModal({
  open,
  bookingId,
  onClose,
  onSaved,
}: {
  open: boolean;
  bookingId: string;
  onClose: () => void;
  onSaved?: (note: ClinicalNote) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="body">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Add test / report
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <ClinicalNoteForm
          bookingId={bookingId}
          onCancel={onClose}
          onSaved={(note) => {
            onSaved?.(note);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
