"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { PhotoUpload } from "../PhotoUpload";
import { useUpdateProfessional } from "../../hooks";
import { professionalSchema, type ProfessionalInput } from "../../schemas";
import type { OwnDoctorProfile } from "@/types/doctor-portfolio";

/**
 * Step 1 — professional details (qualification, registration number, experience,
 * bio, optional online fee). Saves via PATCH /doctor/profile. A 409
 * REG_NUMBER_IN_USE surfaces as a field error on registrationNumber.
 */
export function ProfessionalStep({ profile }: { profile: OwnDoctorProfile }) {
  const update = useUpdateProfessional();

  // A `PENDING-…` placeholder registration number reads as empty in the form.
  const reg = profile.registrationNumber?.startsWith("PENDING-") ? "" : profile.registrationNumber ?? "";

  const methods = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    values: {
      qualification: profile.qualification ?? "",
      registrationNumber: reg,
      experienceYears: String(profile.experienceYears ?? 0),
      bio: profile.bio ?? "",
      onlineFee: profile.onlineFee != null ? String(profile.onlineFee) : "",
      headline: profile.headline ?? "",
      gender: profile.gender ?? "male",
      practicePhilosophy: profile.practicePhilosophy ?? "",
      publicPhone: profile.publicPhone ?? "",
      publicEmail: profile.publicEmail ?? "",
      shortIntro: profile.shortIntro ?? "",
      careerSummary: profile.careerSummary ?? "",
    },
  });

  const onSubmit = (values: ProfessionalInput) => {
    update.mutate(values, {
      onError: (error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
        if (status === 409 || code === "REG_NUMBER_IN_USE") {
          methods.setError("registrationNumber", { message: "That registration number is already in use" });
        }
      },
    });
  };

  return (
    <FormContainer methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={2}>
        {/* The SAME PhotoUpload the Portfolio step renders — one component, one
            endpoint (POST /doctor/photo), so changing the picture here changes
            it there and vice versa. Two independent uploaders over one column
            is how the two screens end up disagreeing about your face.
            Uploading is immediate; it is not part of this form's save. */}
        <Grid size={{ xs: 12 }}>
          <PhotoUpload name={profile.name ?? "Doctor"} photoUrl={profile.photoUrl} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <RHFTextField<ProfessionalInput> name="qualification" label="Qualification" placeholder="MBBS, MD" fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RHFTextField<ProfessionalInput> name="registrationNumber" label="Medical registration number" fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RHFTextField<ProfessionalInput> name="experienceYears" label="Years of experience" type="number" fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RHFTextField<ProfessionalInput>
            name="onlineFee"
            label="Video consult fee (₹)"
            type="number"
            helperText="Leave blank if you don't offer video consults"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <RHFTextField<ProfessionalInput>
            name="headline"
            label="Headline / tagline"
            placeholder="Board-Certified Cardiologist"
            helperText="Shown under your name on your public profile"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <RHFTextField<ProfessionalInput> name="gender" label="Gender" select fullWidth>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </RHFTextField>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <RHFTextField<ProfessionalInput>
            name="shortIntro"
            label="Short introduction (optional)"
            multiline
            minRows={2}
            placeholder="One or two sentences patients read first — e.g. your focus and where you practise."
            helperText="Shown in your portfolio hero and footer"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <RHFTextField<ProfessionalInput> name="bio" label="Professional biography" multiline minRows={4} placeholder="Tell patients about your experience and approach." fullWidth />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <RHFTextField<ProfessionalInput>
            name="careerSummary"
            label="Career summary (optional)"
            multiline
            minRows={2}
            placeholder="A brief overview of your career milestones."
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <RHFTextField<ProfessionalInput>
            name="practicePhilosophy"
            label="Philosophy of care (optional)"
            multiline
            minRows={2}
            placeholder="What makes your approach to patient care unique?"
            fullWidth
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider>
            <Typography variant="caption" color="text.secondary">
              Public contact
            </Typography>
          </Divider>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RHFTextField<ProfessionalInput>
            name="publicPhone"
            label="Public phone"
            helperText="Falls back to your account phone if left blank"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RHFTextField<ProfessionalInput>
            name="publicEmail"
            label="Public email"
            helperText="Falls back to your account email if left blank"
            fullWidth
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained" loading={update.isPending}>
            Save details
          </Button>
        </Grid>
      </Grid>
    </FormContainer>
  );
}
