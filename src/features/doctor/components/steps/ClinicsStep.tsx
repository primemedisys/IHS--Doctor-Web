"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { Loading } from "@/components/feedback";
import { useClinics, useRemoveClinic } from "../../hooks";
import { ClinicCard } from "../ClinicCard";
import { ClinicForm } from "../ClinicForm";
import type { OwnClinic } from "@/types/clinic";

/**
 * Clinics step (onboarding step 5 / dashboard manager). Lists the doctor's
 * clinics and opens the create/edit dialog. A clinic's weekly hours are set on
 * the Availability step.
 */
export function ClinicsStep() {
  const { data: clinics, isLoading } = useClinics();
  const removeClinic = useRemoveClinic();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OwnClinic | null>(null);
  const [deleting, setDeleting] = useState<OwnClinic | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (clinic: OwnClinic) => {
    setEditing(clinic);
    setFormOpen(true);
  };

  if (isLoading) return <Loading label="Loading your clinics…" />;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Add each place you consult in person. You&apos;ll set the weekly hours next.
        </Typography>
        <Button variant="contained" startIcon={<FiPlus />} onClick={openAdd}>
          Add clinic
        </Button>
      </Stack>

      {clinics && clinics.length > 0 ? (
        clinics.map((clinic) => (
          <ClinicCard key={clinic.id} clinic={clinic} onEdit={openEdit} onDelete={setDeleting} />
        ))
      ) : (
        <Typography color="text.secondary">
          No clinics yet — add your first location to continue.
        </Typography>
      )}

      {/* Remount per open (and per target) so the embedded hours editor + local
          state start fresh each time the dialog is opened. */}
      <ClinicForm
        key={`${editing?.id ?? "new"}:${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        clinic={editing}
      />

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle>Remove this clinic?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{deleting?.name}&quot; and its weekly hours will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            loading={removeClinic.isPending}
            onClick={() =>
              deleting &&
              removeClinic.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
            }
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
