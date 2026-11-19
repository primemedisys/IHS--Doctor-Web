"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { useCreateClinic, useSetClinicAvailability, useUpdateClinic } from "../hooks";
import { clinicSchema, type ClinicFormInput } from "../schemas";
import { ClinicLocationPicker, type PickedLocation } from "./ClinicLocationPicker";
import { WeeklyScheduleEditor } from "./WeeklyScheduleEditor";
import type { ClinicInput, OwnClinic, WeeklySlotInput } from "@/types/clinic";

/** Empty-string → undefined, so optional fields aren't sent as "". */
const opt = (v?: string) => (v && v.trim() !== "" ? v.trim() : undefined);

/** Both coordinates as numbers, or both null — a half pin is never sent. */
function coordinates(latStr: string, lngStr: string): { lat: number | null; lng: number | null } {
  const lat = latStr.trim() === "" ? NaN : Number(latStr);
  const lng = lngStr.trim() === "" ? NaN : Number(lngStr);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: null, lng: null };
}

/**
 * Create/edit a clinic AND its weekly consulting hours in one dialog
 * (frontend-plan.md §7). The address is typed by hand; the Google Maps search
 * above it is an OPTIONAL shortcut that fills the same fields (and a pin), so a
 * missing or failing Maps key never blocks saving. On submit the clinic is
 * saved first, then — if the schedule was touched — its hours are PUT with the
 * new/edited id.
 */
export function ClinicForm({
  open,
  onClose,
  clinic,
}: {
  open: boolean;
  onClose: () => void;
  clinic?: OwnClinic | null;
}) {
  const create = useCreateClinic();
  const update = useUpdateClinic();
  const setHours = useSetClinicAvailability();
  const editing = Boolean(clinic);

  // The weekly hours live in local state (the embedded editor emits on change).
  // `touched` gates whether we PUT them, so an untouched edit doesn't re-write.
  const [slots, setSlots] = useState<WeeklySlotInput[]>([]);
  const [hoursTouched, setHoursTouched] = useState(false);
  const onHoursChange = (next: WeeklySlotInput[]) => {
    setSlots(next);
    setHoursTouched(true);
  };

  const methods = useForm<ClinicFormInput>({
    resolver: zodResolver(clinicSchema),
    values: {
      name: clinic?.name ?? "",
      addressLine: clinic?.addressLine ?? "",
      city: clinic?.city ?? "",
      state: clinic?.state ?? "",
      pincode: clinic?.pincode ?? "",
      lat: clinic?.lat != null ? String(clinic.lat) : "",
      lng: clinic?.lng != null ? String(clinic.lng) : "",
      phone: clinic?.phone ?? "",
      offlineFee: clinic?.offlineFee != null ? String(clinic.offlineFee) : "",
    },
  });

  const [latStr, lngStr] = useWatch({ control: methods.control, name: ["lat", "lng"] });
  const lat = Number(latStr);
  const lng = Number(lngStr);

  /**
   * Pin picked on the map (search / click / drag) → fill whatever the geocoder
   * resolved: coordinates AND address/city/state/pincode. Every field stays
   * editable afterwards.
   */
  const handlePick = (loc: PickedLocation) => {
    const set = (field: keyof ClinicFormInput, v?: string) =>
      methods.setValue(field, v ?? "", { shouldValidate: true, shouldDirty: true });
    set("lat", String(loc.lat));
    set("lng", String(loc.lng));
    if (loc.addressLine) set("addressLine", loc.addressLine);
    if (loc.city) set("city", loc.city);
    if (loc.state) set("state", loc.state);
    if (loc.pincode) set("pincode", loc.pincode);
  };

  const onSubmit = async (values: ClinicFormInput) => {
    const body: ClinicInput = {
      name: values.name.trim(),
      addressLine: values.addressLine.trim(),
      city: opt(values.city) ?? null,
      state: opt(values.state) ?? null,
      pincode: opt(values.pincode) ?? null,
      ...coordinates(values.lat, values.lng),
      phone: opt(values.phone) ?? null,
      offlineFee: Number(values.offlineFee),
    };
    try {
      // 1. Save the clinic (create returns the new row with its id).
      const saved =
        editing && clinic
          ? await update.mutateAsync({ id: clinic.id, patch: body })
          : await create.mutateAsync(body);
      // 2. If the doctor set/edited hours, replace this clinic's weekly schedule.
      if (hoursTouched) await setHours.mutateAsync({ clinicId: saved.id, slots });
      onClose();
    } catch {
      // The mutation hooks already surface a toast; keep the dialog open to retry.
    }
  };

  const saving = create.isPending || update.isPending || setHours.isPending;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Edit clinic" : "Add a clinic"}</DialogTitle>
      <FormContainer methods={methods} onSubmit={onSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <RHFTextField<ClinicFormInput> name="name" label="Clinic name" fullWidth />
            </Grid>
            {/* Optional shortcut: the Google search FILLS the fields below it,
                which is why it leads. Typing the address by hand is always
                enough to save. */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Find on Google Maps{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  (optional)
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Pick a result to fill the address and map pin, or skip this and type the details below.
              </Typography>
              <ClinicLocationPicker
                value={latStr.trim() !== "" && lngStr.trim() !== "" && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null}
                onChange={handlePick}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <RHFTextField<ClinicFormInput>
                name="addressLine"
                label="Address"
                fullWidth
                helperText="Building, street and area — type it, or fill it from the search above."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <RHFTextField<ClinicFormInput> name="city" label="City" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RHFTextField<ClinicFormInput> name="state" label="State" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <RHFTextField<ClinicFormInput> name="pincode" label="Pincode" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField<ClinicFormInput>
                name="lat"
                label="Latitude (optional)"
                type="number"
                fullWidth
                helperText="Leave both empty if you don't know them."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField<ClinicFormInput>
                name="lng"
                label="Longitude (optional)"
                type="number"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField<ClinicFormInput> name="phone" label="Phone" fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField<ClinicFormInput>
                name="offlineFee"
                label="In-clinic fee (₹)"
                type="number"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Weekly consulting hours
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Tick the days you sit at this clinic and set the hours — saved together with
                the clinic. Patients book a day inside those hours and take a token; the
                minutes-per-patient figure only estimates their wait.
              </Typography>
              <WeeklyScheduleEditor slots={clinic?.availability ?? []} onChange={onHoursChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={saving}>
            {editing ? "Save changes" : "Add clinic"}
          </Button>
        </DialogActions>
      </FormContainer>
    </Dialog>
  );
}
