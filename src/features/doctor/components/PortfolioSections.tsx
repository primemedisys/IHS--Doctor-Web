"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { Controller, useForm, useWatch, type Control, type FieldValues, type Path } from "react-hook-form";
import { FiArrowDown, FiArrowUp, FiEdit2, FiImage, FiTrash2, FiUpload } from "react-icons/fi";
import { toast } from "sonner";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { RepeatableSection, SectionRow, useEditableSection, yearStr } from "./RepeatableSection";
import {
  useAffiliations,
  useEducation,
  useExperience,
  useExpertise,
  useFaqs,
  useFellowships,
  useGallery,
  useInsuranceCatalog,
  useMemberships,
  usePublications,
  useServices,
  useSetInsurances,
} from "../hooks";
import {
  affiliationSchema,
  educationSchema,
  experienceSchema,
  faqSchema,
  fellowshipSchema,
  galleryMetaSchema,
  membershipSchema,
  publicationSchema,
  serviceSchema,
  type AffiliationInput,
  type EducationInput,
  type ExperienceInput,
  type FaqInput,
  type FellowshipInput,
  type GalleryMetaInput,
  type MembershipInput,
  type PublicationInput,
  type ServiceInput,
} from "../schemas";
import type {
  DoctorAffiliation,
  DoctorEducation,
  DoctorExperience,
  DoctorExpertise,
  DoctorFaqItem,
  DoctorFellowship,
  DoctorGalleryImage,
  DoctorMembership,
  DoctorPublication,
  DoctorService,
  ExpertiseCategory,
  GalleryCategory,
  Insurance,
  OwnDoctorProfile,
} from "@/types/doctor-portfolio";

const yearRange = (from?: number | null, to?: number | null) =>
  [from, to].some((v) => v != null) ? `${from ?? "—"}–${to ?? "present"}` : "";

/** A labelled checkbox bound to a boolean form field. */
function RHFCheckbox<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: Path<T>;
  label: React.ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
          label={label}
        />
      )}
    />
  );
}

// ── Current affiliations ──────────────────────────────────────────────────────
const AFFILIATION_EMPTY: AffiliationInput = {
  organization: "",
  roleTitle: "",
  department: "",
  location: "",
  startYear: "",
  endYear: "",
  isCurrent: true,
  website: "",
  phone: "",
};

export function AffiliationsEditor() {
  const { list, add, update, remove } = useAffiliations();
  const s = useEditableSection<DoctorAffiliation, AffiliationInput>({
    schema: affiliationSchema,
    empty: AFFILIATION_EMPTY,
    add,
    update,
    toForm: (a) => ({
      organization: a.organization,
      roleTitle: a.roleTitle ?? "",
      department: a.department ?? "",
      location: a.location ?? "",
      startYear: yearStr(a.startYear),
      endYear: yearStr(a.endYear),
      isCurrent: a.isCurrent,
      website: a.website ?? "",
      phone: a.phone ?? "",
    }),
  });
  const isCurrent = useWatch({ control: s.methods.control, name: "isCurrent" });
  const items = list.data ?? [];
  return (
    <RepeatableSection<AffiliationInput>
      title="Current affiliations"
      hint="Hospitals, clinics or institutions where you practise now. Untick “current” only for a past affiliation you still want listed."
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add affiliation"
      onAdd={s.submit}
      rows={items.map((a) => (
        <SectionRow
          key={a.id}
          active={s.editingId === a.id}
          primary={[a.roleTitle, a.organization].filter(Boolean).join(" · ")}
          secondary={[
            a.department,
            a.location,
            a.isCurrent ? (a.startYear ? `Since ${a.startYear}` : "Current") : yearRange(a.startYear, a.endYear) || "Past",
          ]
            .filter(Boolean)
            .join(" · ")}
          onEdit={() => s.startEdit(a)}
          onRemove={() => {
            s.forget(a.id);
            remove.mutate(a.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<AffiliationInput> name="organization" label="Hospital / clinic / institution" placeholder="AIIMS Bhubaneswar" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<AffiliationInput> name="roleTitle" label="Designation (optional)" placeholder="Professor & Head" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<AffiliationInput> name="department" label="Department (optional)" placeholder="Cardiology" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<AffiliationInput> name="location" label="Location / address (optional)" placeholder="Sijua, Bhubaneswar" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<AffiliationInput> name="startYear" label="Since (year)" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<AffiliationInput> name="endYear" label="Until (year)" type="number" size="small" fullWidth disabled={!!isCurrent} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
        <RHFCheckbox<AffiliationInput> control={s.methods.control} name="isCurrent" label="I currently practise here" />
      </Grid>
      <Grid size={{ xs: 12, sm: 7 }}>
        <RHFTextField<AffiliationInput> name="website" label="Website (optional)" placeholder="https://…" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 5 }}>
        <RHFTextField<AffiliationInput> name="phone" label="Contact phone (optional)" size="small" fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── Education ─────────────────────────────────────────────────────────────────
const EDUCATION_EMPTY: EducationInput = { degree: "", institution: "", fieldOfStudy: "", location: "", yearFrom: "", yearTo: "" };

export function EducationEditor() {
  const { list, add, update, remove } = useEducation();
  const s = useEditableSection<DoctorEducation, EducationInput>({
    schema: educationSchema,
    empty: EDUCATION_EMPTY,
    add,
    update,
    toForm: (e) => ({
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy ?? "",
      location: e.location ?? "",
      yearFrom: yearStr(e.yearFrom),
      yearTo: yearStr(e.yearTo),
    }),
  });
  const items = list.data ?? [];
  return (
    <RepeatableSection<EducationInput>
      title="Education & qualifications"
      hint="Your degrees and where you earned them. At least one is required. The portfolio lists the most recent completion year first."
      required
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add education"
      onAdd={s.submit}
      rows={items.map((e) => (
        <SectionRow
          key={e.id}
          active={s.editingId === e.id}
          primary={e.degree}
          secondary={[e.institution, e.fieldOfStudy, e.location, yearRange(e.yearFrom, e.yearTo)].filter(Boolean).join(" · ")}
          onEdit={() => s.startEdit(e)}
          onRemove={() => {
            s.forget(e.id);
            remove.mutate(e.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<EducationInput> name="degree" label="Degree" placeholder="MD - Cardiology" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<EducationInput> name="institution" label="Institution" placeholder="AIIMS, New Delhi" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<EducationInput> name="fieldOfStudy" label="Specialization (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<EducationInput> name="location" label="Location (optional)" placeholder="New Delhi" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<EducationInput> name="yearFrom" label="From" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<EducationInput> name="yearTo" label="Completed" type="number" size="small" fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── Experience ────────────────────────────────────────────────────────────────
const EXPERIENCE_EMPTY: ExperienceInput = {
  organization: "",
  roleTitle: "",
  location: "",
  startYear: "",
  endYear: "",
  isCurrent: false,
  description: "",
};

export function ExperienceEditor() {
  const { list, add, update, remove } = useExperience();
  const s = useEditableSection<DoctorExperience, ExperienceInput>({
    schema: experienceSchema,
    empty: EXPERIENCE_EMPTY,
    add,
    update,
    toForm: (x) => ({
      organization: x.organization,
      roleTitle: x.roleTitle,
      location: x.location ?? "",
      startYear: yearStr(x.startYear),
      endYear: yearStr(x.endYear),
      isCurrent: x.isCurrent,
      description: x.description ?? "",
    }),
  });
  const isCurrent = useWatch({ control: s.methods.control, name: "isCurrent" });
  const items = list.data ?? [];
  return (
    <RepeatableSection<ExperienceInput>
      title="Professional experience"
      hint="Hospitals/clinics you've worked at and your roles. At least one is required. Shown most recent first."
      required
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add experience"
      onAdd={s.submit}
      rows={items.map((x) => (
        <SectionRow
          key={x.id}
          active={s.editingId === x.id}
          primary={`${x.roleTitle} · ${x.organization}`}
          secondary={[x.location, `${x.startYear}–${x.isCurrent ? "Present" : x.endYear ?? "—"}`].filter(Boolean).join(" · ")}
          onEdit={() => s.startEdit(x)}
          onRemove={() => {
            s.forget(x.id);
            remove.mutate(x.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<ExperienceInput> name="organization" label="Organization" placeholder="Apollo Hospitals" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<ExperienceInput> name="roleTitle" label="Role/title" placeholder="Senior Consultant" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<ExperienceInput> name="location" label="Location (optional)" placeholder="Kolkata" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<ExperienceInput> name="startYear" label="Start year" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<ExperienceInput> name="endYear" label="End year" type="number" size="small" fullWidth disabled={!!isCurrent} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFCheckbox<ExperienceInput> control={s.methods.control} name="isCurrent" label="I currently work here" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<ExperienceInput>
          name="description"
          label="Responsibilities (optional)"
          size="small"
          multiline
          minRows={2}
          fullWidth
        />
      </Grid>
    </RepeatableSection>
  );
}

// ── Fellowships & advanced training ──────────────────────────────────────────
const FELLOWSHIP_EMPTY: FellowshipInput = {
  title: "",
  institution: "",
  specialtyArea: "",
  location: "",
  startYear: "",
  endYear: "",
  description: "",
};

export function FellowshipsEditor() {
  const { list, add, update, remove } = useFellowships();
  const s = useEditableSection<DoctorFellowship, FellowshipInput>({
    schema: fellowshipSchema,
    empty: FELLOWSHIP_EMPTY,
    add,
    update,
    toForm: (f) => ({
      title: f.title,
      institution: f.institution,
      specialtyArea: f.specialtyArea ?? "",
      location: f.location ?? "",
      startYear: yearStr(f.startYear),
      endYear: yearStr(f.endYear),
      description: f.description ?? "",
    }),
  });
  const items = list.data ?? [];
  return (
    <RepeatableSection<FellowshipInput>
      title="Fellowships & advanced training"
      hint="Fellowships, observerships and advanced courses (optional). Leave the completion year blank if it is ongoing."
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add fellowship / training"
      onAdd={s.submit}
      rows={items.map((f) => (
        <SectionRow
          key={f.id}
          active={s.editingId === f.id}
          primary={f.title}
          secondary={[f.institution, f.specialtyArea, f.location, yearRange(f.startYear, f.endYear)].filter(Boolean).join(" · ")}
          onEdit={() => s.startEdit(f)}
          onRemove={() => {
            s.forget(f.id);
            remove.mutate(f.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<FellowshipInput> name="title" label="Fellowship / training" placeholder="Fellowship in Interventional Cardiology" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<FellowshipInput> name="institution" label="Institution / organization" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<FellowshipInput> name="specialtyArea" label="Specialty / training area (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<FellowshipInput> name="location" label="Location (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<FellowshipInput> name="startYear" label="Start year" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<FellowshipInput> name="endYear" label="Completed" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<FellowshipInput> name="description" label="Description / achievements (optional)" size="small" multiline minRows={2} fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── Expertise chips (clinical / scientific / areas / interests) ──────────────
/** "Heart  Failure " → "heart failure" — the duplicate-check key (mirrors the API). */
const expertiseKey = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/**
 * One category of expertise as editable chips: type + Enter (or Add) to add,
 * click a chip to rename it, its × to remove it. Duplicates (ignoring case
 * and spacing) are stopped before they reach the API, which rejects them too.
 */
export function ExpertiseChipsEditor({
  category,
  title,
  hint,
  placeholder,
}: {
  category: ExpertiseCategory;
  title: string;
  hint: string;
  placeholder: string;
}) {
  const { list, add, update, remove } = useExpertise();
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<DoctorExpertise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = (list.data ?? []).filter((x) => x.category === category);

  const reset = () => {
    setValue("");
    setEditing(null);
    setError(null);
  };
  const submit = () => {
    const name = value.trim().replace(/\s+/g, " ");
    if (name.length < 2) return setError("Enter at least 2 characters");
    if (name.length > 150) return setError("Keep it under 150 characters");
    if (items.some((x) => x.id !== editing?.id && expertiseKey(x.name) === expertiseKey(name))) {
      return setError("You've already added that");
    }
    setError(null);
    if (editing) update.mutate({ id: editing.id, patch: { category, name } }, { onSuccess: reset });
    else add.mutate({ category, name, description: "" }, { onSuccess: reset });
  };

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      {items.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {items.map((x) => (
            <Chip
              key={x.id}
              label={x.name}
              variant={editing?.id === x.id ? "filled" : "outlined"}
              color={editing?.id === x.id ? "primary" : "default"}
              onClick={() => {
                setEditing(x);
                setValue(x.name);
                setError(null);
              }}
              onDelete={() => {
                if (editing?.id === x.id) reset();
                remove.mutate(x.id);
              }}
              aria-label={`${x.name} — click to edit`}
            />
          ))}
        </Stack>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-start" } }}>
        <TextField
          size="small"
          label={editing ? `Rename “${editing.name}”` : "Add an entry"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape" && editing) reset();
          }}
          error={Boolean(error)}
          helperText={error ?? " "}
          slotProps={{ htmlInput: { maxLength: 150 } }}
          sx={{ flex: 1 }}
        />
        <Stack direction="row" spacing={1}>
          <Button variant={editing ? "contained" : "outlined"} onClick={submit} loading={add.isPending || update.isPending} sx={{ mt: { sm: 0.25 } }}>
            {editing ? "Save" : "Add"}
          </Button>
          {editing && (
            <Button onClick={reset} sx={{ mt: { sm: 0.25 } }}>
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

/** Clinical expertise, scientific expertise and areas of expertise. */
export function ExpertiseEditor() {
  return (
    <Stack spacing={3}>
      <ExpertiseChipsEditor
        category="clinical"
        title="Clinical expertise"
        hint="Conditions you treat and patient-care capabilities (e.g. heart failure, diabetic foot care)."
        placeholder="Heart failure"
      />
      <ExpertiseChipsEditor
        category="scientific"
        title="Scientific / research expertise"
        hint="Research fields or methods you work in (optional)."
        placeholder="Cardiac imaging research"
      />
      <ExpertiseChipsEditor
        category="area"
        title="Areas of expertise"
        hint="Broader fields of practice (optional)."
        placeholder="Preventive cardiology"
      />
    </Stack>
  );
}

/** Professional interests (shown in the About section). */
export function InterestsEditor() {
  return (
    <ExpertiseChipsEditor
      category="interest"
      title="Professional interests"
      hint="Topics you are especially interested in (optional), shown in your About section."
      placeholder="Medical education"
    />
  );
}

// ── Services / procedures ─────────────────────────────────────────────────────
export function ServicesEditor() {
  const { list, add, update, remove } = useServices();
  const s = useEditableSection<DoctorService, ServiceInput>({
    schema: serviceSchema,
    empty: { name: "", description: "" },
    add,
    update,
    toForm: (x) => ({ name: x.name, description: x.description ?? "" }),
  });
  const items = list.data ?? [];
  return (
    <RepeatableSection<ServiceInput>
      title="Procedures & treatments"
      hint="Procedures and treatments you perform (e.g. Angioplasty). At least one is required. Listing a procedure does not certify it — list only what you are qualified to perform."
      required
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add procedure"
      onAdd={(v) => {
        const key = expertiseKey(v.name);
        if (items.some((x) => x.id !== s.editingId && expertiseKey(x.name) === key)) {
          s.methods.setError("name", { message: "You've already added that" });
          return;
        }
        s.submit(v);
      }}
      rows={items.map((x) => (
        <SectionRow
          key={x.id}
          active={s.editingId === x.id}
          primary={x.name}
          secondary={x.description ?? undefined}
          onEdit={() => s.startEdit(x)}
          onRemove={() => {
            s.forget(x.id);
            remove.mutate(x.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12, sm: 5 }}>
        <RHFTextField<ServiceInput> name="name" label="Procedure / treatment" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 7 }}>
        <RHFTextField<ServiceInput> name="description" label="Description (optional)" size="small" fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── Publications ──────────────────────────────────────────────────────────────
const PUBLICATION_EMPTY: PublicationInput = { title: "", authors: "", publisher: "", year: "", url: "", doi: "", abstract: "", category: "" };

export function PublicationsEditor() {
  const { list, add, update, remove } = usePublications();
  const s = useEditableSection<DoctorPublication, PublicationInput>({
    schema: publicationSchema,
    empty: PUBLICATION_EMPTY,
    add,
    update,
    toForm: (p) => ({
      title: p.title,
      authors: p.authors ?? "",
      publisher: p.publisher ?? "",
      year: yearStr(p.year),
      url: p.url ?? "",
      doi: p.doi ?? "",
      abstract: p.abstract ?? "",
      category: p.category ?? "",
    }),
  });
  const items = list.data ?? [];
  return (
    <RepeatableSection<PublicationInput>
      title="Research & publications"
      hint="Papers, journal articles, case studies and conference presentations (optional)."
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add publication"
      onAdd={s.submit}
      rows={items.map((p) => (
        <SectionRow
          key={p.id}
          active={s.editingId === p.id}
          primary={p.title}
          secondary={[p.authors, p.publisher, p.year, p.doi ? `DOI ${p.doi}` : null].filter(Boolean).join(" · ")}
          onEdit={() => s.startEdit(p)}
          onRemove={() => {
            s.forget(p.id);
            remove.mutate(p.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12 }}>
        <RHFTextField<PublicationInput> name="title" label="Title" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 7 }}>
        <RHFTextField<PublicationInput> name="authors" label="Authors (optional)" placeholder="A. Rao, B. Das" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 5 }}>
        <RHFTextField<PublicationInput> name="publisher" label="Journal / conference (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<PublicationInput> name="year" label="Year" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <RHFTextField<PublicationInput> name="category" label="Category (optional)" placeholder="Original research" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 5 }}>
        <RHFTextField<PublicationInput> name="doi" label="DOI (optional)" placeholder="10.1000/xyz123" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<PublicationInput> name="url" label="Link (optional)" placeholder="https://…" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<PublicationInput> name="abstract" label="Abstract / short description (optional)" size="small" multiline minRows={2} fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── Memberships ───────────────────────────────────────────────────────────────
const MEMBERSHIP_EMPTY: MembershipInput = {
  organization: "",
  roleTitle: "",
  sinceYear: "",
  membershipNumber: "",
  showMembershipNumber: false,
  validUntilYear: "",
  description: "",
};

export function MembershipsEditor() {
  const { list, add, update, remove } = useMemberships();
  const s = useEditableSection<DoctorMembership, MembershipInput>({
    schema: membershipSchema,
    empty: MEMBERSHIP_EMPTY,
    add,
    update,
    toForm: (m) => ({
      organization: m.organization,
      roleTitle: m.roleTitle ?? "",
      sinceYear: yearStr(m.sinceYear),
      membershipNumber: m.membershipNumber ?? "",
      showMembershipNumber: Boolean(m.showMembershipNumber),
      validUntilYear: yearStr(m.validUntilYear),
      description: m.description ?? "",
    }),
  });
  const items = list.data ?? [];
  return (
    <RepeatableSection<MembershipInput>
      title="Professional memberships"
      hint="Medical councils and professional associations (optional). Membership numbers stay private unless you choose to show them."
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add membership"
      onAdd={s.submit}
      rows={items.map((m) => (
        <SectionRow
          key={m.id}
          active={s.editingId === m.id}
          primary={m.organization}
          secondary={[
            m.roleTitle,
            m.sinceYear ? `since ${m.sinceYear}` : "",
            m.validUntilYear ? `valid until ${m.validUntilYear}` : "",
            m.membershipNumber ? `No. ${m.membershipNumber} (${m.showMembershipNumber ? "public" : "private"})` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
          onEdit={() => s.startEdit(m)}
          onRemove={() => {
            s.forget(m.id);
            remove.mutate(m.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<MembershipInput> name="organization" label="Organization" placeholder="Indian Medical Association" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<MembershipInput> name="roleTitle" label="Membership type (optional)" placeholder="Life Member" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<MembershipInput> name="sinceYear" label="Since" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <RHFTextField<MembershipInput> name="validUntilYear" label="Valid until" type="number" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<MembershipInput> name="membershipNumber" label="Membership number (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFCheckbox<MembershipInput>
          control={s.methods.control}
          name="showMembershipNumber"
          label="Show the membership number on my public profile"
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<MembershipInput> name="description" label="Description (optional)" size="small" fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
export function FaqEditor() {
  const { list, add, update, remove } = useFaqs();
  const s = useEditableSection<DoctorFaqItem, FaqInput>({
    schema: faqSchema,
    empty: { question: "", answer: "" },
    add,
    update,
    toForm: (f) => ({ question: f.question, answer: f.answer }),
  });
  const items = list.data ?? [];
  return (
    <RepeatableSection<FaqInput>
      title="FAQ"
      hint="Common questions patients ask you (optional)."
      isEmpty={items.length === 0}
      methods={s.methods}
      adding={s.saving}
      editing={s.editingId !== null}
      onCancelEdit={s.stopEdit}
      addLabel="Add FAQ"
      onAdd={s.submit}
      rows={items.map((f) => (
        <SectionRow
          key={f.id}
          active={s.editingId === f.id}
          primary={f.question}
          secondary={f.answer}
          onEdit={() => s.startEdit(f)}
          onRemove={() => {
            s.forget(f.id);
            remove.mutate(f.id);
          }}
          removing={remove.isPending}
        />
      ))}
    >
      <Grid size={{ xs: 12 }}>
        <RHFTextField<FaqInput> name="question" label="Question" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<FaqInput> name="answer" label="Answer" size="small" multiline minRows={2} fullWidth />
      </Grid>
    </RepeatableSection>
  );
}

// ── Clinical gallery ──────────────────────────────────────────────────────────
const MAX_GALLERY = 12;
/** Keep in step with the backend's MAX_UPLOAD_MB. */
const MAX_MB = 10;
const IMAGE_TYPES = "image/png,image/jpeg,image/webp";

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  clinic: "Clinic",
  facilities: "Facilities",
  equipment: "Equipment",
  events: "Events",
  activities: "Professional activities",
  other: "Other",
};

const GALLERY_EMPTY: GalleryMetaInput = { title: "", caption: "", category: "", altText: "", takenOn: "" };

const toGalleryForm = (g: DoctorGalleryImage): GalleryMetaInput => ({
  title: g.title ?? "",
  caption: g.caption ?? "",
  category: g.category ?? "",
  altText: g.altText ?? "",
  takenOn: g.takenOn ?? "",
});

/** The shared metadata fields (upload + edit). */
function GalleryMetaFields() {
  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<GalleryMetaInput> name="title" label="Title (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RHFTextField<GalleryMetaInput> name="category" label="Category (optional)" select size="small" fullWidth>
          <MenuItem value="">—</MenuItem>
          {Object.entries(GALLERY_CATEGORY_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </RHFTextField>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RHFTextField<GalleryMetaInput> name="caption" label="Caption (optional)" size="small" fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <RHFTextField<GalleryMetaInput>
          name="altText"
          label="Image description for screen readers (optional)"
          placeholder="Reception area of the clinic"
          size="small"
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <RHFTextField<GalleryMetaInput>
          name="takenOn"
          label="Date (optional)"
          type="date"
          size="small"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Grid>
    </>
  );
}

/**
 * The clinical gallery: upload professional photos with optional title,
 * caption, category, alt text and date; edit those details later; re-arrange
 * the order (arrow buttons, keyboard-friendly); remove a photo. Uploading
 * requires confirming the photo shows no identifiable patient — or that the
 * patient's consent was obtained.
 */
export function GalleryEditor() {
  const { list, add, update, reorder, remove } = useGallery();
  const items = list.data ?? [];
  const [consent, setConsent] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadForm = useForm<GalleryMetaInput>({ resolver: zodResolver(galleryMetaSchema), defaultValues: GALLERY_EMPTY });
  const editForm = useForm<GalleryMetaInput>({ resolver: zodResolver(galleryMetaSchema), defaultValues: GALLERY_EMPTY });
  const full = items.length >= MAX_GALLERY;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.split(",").includes(file.type)) return void toast.error("Upload a PNG, JPEG or WebP image");
    if (file.size > MAX_MB * 1024 * 1024) return void toast.error(`Images must be ${MAX_MB} MB or smaller`);
    // Validate the metadata first so a bad date never uploads a file.
    const ok = await uploadForm.trigger();
    if (!ok) return;
    add.mutate(
      { file, meta: uploadForm.getValues(), consent: true },
      {
        onSuccess: () => {
          uploadForm.reset(GALLERY_EMPTY);
          setConsent(false);
        },
      },
    );
  };

  const move = (index: number, delta: number) => {
    const next = items.map((g) => g.id);
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  const startEdit = (g: DoctorGalleryImage) => {
    setEditingId(g.id);
    editForm.reset(toGalleryForm(g));
  };
  const stopEdit = () => {
    setEditingId(null);
    editForm.reset(GALLERY_EMPTY);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          Clinical gallery
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Professional photos of your clinic, facilities, equipment, events or activities (optional, up to {MAX_GALLERY}).
        </Typography>
      </Box>

      {items.length > 0 && (
        <Stack spacing={1}>
          {items.map((g, i) => (
            <Paper key={g.id} variant="outlined" sx={{ p: 1.25, borderColor: editingId === g.id ? "primary.main" : "divider" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 72, height: 54, flexShrink: 0, borderRadius: 1, overflow: "hidden", bgcolor: "action.hover" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.imageUrl}
                    alt={g.altText || g.title || g.caption || "Gallery image"}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {g.title || g.caption || "Untitled photo"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
                    {[g.category ? GALLERY_CATEGORY_LABELS[g.category] : null, g.takenOn, g.title ? g.caption : null]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" aria-label="Move photo up" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                        <FiArrowUp size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Move photo down"
                        disabled={i === items.length - 1 || reorder.isPending}
                        onClick={() => move(i, 1)}
                      >
                        <FiArrowDown size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Edit details">
                    <IconButton size="small" aria-label="Edit photo details" onClick={() => startEdit(g)}>
                      <FiEdit2 size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Delete photo"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (editingId === g.id) stopEdit();
                          remove.mutate(g.id);
                        }}
                      >
                        <FiTrash2 size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
              {editingId === g.id && (
                <Box sx={{ mt: 1.5 }}>
                  <FormContainer
                    methods={editForm}
                    onSubmit={(meta) => update.mutate({ id: g.id, meta }, { onSuccess: stopEdit })}
                  >
                    <Grid container spacing={1.5}>
                      <GalleryMetaFields />
                      <Grid size={{ xs: 12 }}>
                        <Stack direction="row" spacing={1}>
                          <Button type="submit" size="small" variant="contained" loading={update.isPending}>
                            Save details
                          </Button>
                          <Button size="small" onClick={stopEdit}>
                            Cancel
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </FormContainer>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {full ? (
        <Alert severity="info">You have reached {MAX_GALLERY} photos — remove one to add another.</Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          {/* The picker opens straight from the button click (a user gesture);
              the details are validated once a file is chosen. */}
          <FormContainer methods={uploadForm} onSubmit={() => undefined}>
            <Grid container spacing={1.5}>
              <GalleryMetaFields />
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
                  label={
                    <Typography variant="body2">
                      This photo shows no identifiable patient or patient information — or I have the patient’s written
                      consent to publish it.
                    </Typography>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={add.isPending ? <FiImage /> : <FiUpload />}
                  disabled={!consent}
                  loading={add.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  Choose & upload photo
                </Button>
                <input ref={fileInput} hidden type="file" accept={IMAGE_TYPES} onChange={onFile} />
              </Grid>
            </Grid>
          </FormContainer>
        </Paper>
      )}
    </Stack>
  );
}

// ── Insurance (M:N multi-select) ──────────────────────────────────────────────
export function InsuranceEditor({ profile }: { profile: OwnDoctorProfile }) {
  const catalog = useInsuranceCatalog();
  const setInsurances = useSetInsurances();
  const options = catalog.data ?? [];
  const [selected, setSelected] = useState<Insurance[]>(profile.insurances ?? []);

  const save = (next: Insurance[]) => {
    setSelected(next);
    setInsurances.mutate(next.map((i) => i.id));
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        Insurance accepted
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Providers you accept (optional). Patients can filter by these.
      </Typography>
      <Box>
        <Autocomplete
          multiple
          size="small"
          options={options}
          value={selected}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_e, next) => save(next)}
          loading={catalog.isLoading}
          renderInput={(params) => <TextField {...params} label="Insurance providers" placeholder="Select…" />}
        />
      </Box>
    </Stack>
  );
}
