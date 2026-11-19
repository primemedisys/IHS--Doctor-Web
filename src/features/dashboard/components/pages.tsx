"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import { useForm } from "react-hook-form";
import { EmptyState } from "@/components/feedback";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile";
import { updateProfileSchema, type UpdateProfileInput } from "@/features/auth/schemas";
import { useAuth } from "@/hooks/useAuth";

// `EarningsView` moved to ./EarningsView.tsx and is now backed by
// GET /doctor/earnings/*. The version that lived here rendered a hardcoded
// six-month series and a bare `₹38,000` "Next payout" literal.
//
// `AppointmentsView` used to live here rendering a permanent empty state with a
// comment claiming "no appointments data source yet". That comment was stale —
// /dashboard/appointments routes to the real `AppointmentsBoard`, which has
// consumed GET /doctor/bookings since the booking plan shipped.

/** Profile settings — saves through PATCH /auth/profile. Email/role are read-only. */
export function SettingsView() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const methods = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  return (
    <Card sx={{ maxWidth: 640 }}>
      <CardHeader title="Profile" subheader="Manage your account details" />
      <CardContent>
        <FormContainer methods={methods} onSubmit={(values) => updateProfile.mutate(values)}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField<UpdateProfileInput> name="name" label="Full name" autoComplete="name" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Email" value={user?.email ?? ""} disabled fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RHFTextField<UpdateProfileInput> name="phone" label="Phone" placeholder="+91 …" type="tel" autoComplete="tel" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Role" value={user?.role ?? ""} disabled fullWidth sx={{ textTransform: "capitalize" }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button type="submit" variant="contained" loading={updateProfile.isPending}>
                Save changes
              </Button>
            </Grid>
          </Grid>
        </FormContainer>
      </CardContent>
    </Card>
  );
}

/** Professional placeholder for sections still on the roadmap. */
export function DashboardPlaceholder({ title, description, icon = "FiClock" }: { title: string; description: string; icon?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <EmptyState icon={icon} title={title} description={description} />
    </Paper>
  );
}
