"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useState } from "react";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { FormContainer } from "@/components/forms/FormContainer";
import { RHFTextField } from "@/components/forms/RHFTextField";
import { PhotoUpload } from "../PhotoUpload";
import { AwardsEditor } from "../AwardsEditor";
import { TestimonialsEditor } from "../TestimonialsEditor";
import { HeroImagesUpload } from "../HeroImagesUpload";
import {
  AffiliationsEditor,
  EducationEditor,
  ExperienceEditor,
  ExpertiseEditor,
  FaqEditor,
  FellowshipsEditor,
  GalleryEditor,
  InsuranceEditor,
  InterestsEditor,
  MembershipsEditor,
  PublicationsEditor,
  ServicesEditor,
} from "../PortfolioSections";
import { useKeywords, useLinks } from "../../hooks";
import { keywordSchema, linkSchema, type KeywordInput, type LinkInput } from "../../schemas";

// Kept as a re-export for callers that imported the awards editor from here.
export { AwardsEditor };
import type { LinkType, OwnDoctorProfile } from "@/types/doctor-portfolio";

const LINK_TYPES: LinkType[] = ["website", "linkedin", "instagram", "youtube", "other"];

/** Editors separated by dividers. */
function Stacked({ children }: { children: React.ReactNode[] }) {
  return (
    <Stack spacing={3} divider={<Divider flexItem />}>
      {children}
    </Stack>
  );
}

/**
 * The portfolio's editors, grouped the way the public portfolio reads. Each
 * group is one tab so the step is never one endless form; every editor saves
 * on its own (no shared "save" to forget).
 */
const GROUPS: { key: string; label: string; render: (p: OwnDoctorProfile) => React.ReactNode }[] = [
  {
    key: "photos",
    label: "Photos",
    render: (p) => (
      <Stacked>
        <PhotoUpload name={p.name ?? "Doctor"} photoUrl={p.photoUrl} />
        <Stack spacing={1}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
            Hero background images
          </Typography>
          <HeroImagesUpload imageUrls={p.heroImageUrls} />
        </Stack>
        <GalleryEditor />
      </Stacked>
    ),
  },
  {
    key: "about",
    label: "About & expertise",
    render: () => (
      <Stacked>
        <Typography variant="body2" color="text.secondary">
          Your biography, short introduction and career summary are edited in the Professional details step; your
          specialties and sub-specialties in the Specialties step.
        </Typography>
        <InterestsEditor />
        <ExpertiseEditor />
        <ServicesEditor />
      </Stacked>
    ),
  },
  {
    key: "career",
    label: "Career & training",
    render: () => (
      <Stacked>
        <AffiliationsEditor />
        <ExperienceEditor />
        <FellowshipsEditor />
        <EducationEditor />
      </Stacked>
    ),
  },
  {
    key: "recognition",
    label: "Awards & research",
    render: () => (
      <Stacked>
        <AwardsEditor />
        <MembershipsEditor />
        <PublicationsEditor />
      </Stacked>
    ),
  },
  {
    key: "patients",
    label: "Patients & contact",
    render: (p) => (
      <Stacked>
        <LinksEditor />
        <InsuranceEditor profile={p} />
        <TestimonialsEditor />
        <FaqEditor />
        <KeywordsEditor />
      </Stacked>
    ),
  },
];

/**
 * Step 3 — portfolio: photos, expertise, career, recognition and patient-facing
 * extras, one tab per group. (Bio is captured in the Professional step;
 * together bio + photo satisfy the backend's `portfolio` completeness flag.)
 */
export function PortfolioStep({ profile }: { profile: OwnDoctorProfile }) {
  const [tab, setTab] = useState(GROUPS[0].key);
  const current = GROUPS.find((g) => g.key === tab) ?? GROUPS[0];
  return (
    <Stack spacing={3}>
      <Tabs
        value={current.key}
        onChange={(_e, v: string) => setTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Portfolio sections"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {GROUPS.map((g) => (
          <Tab key={g.key} value={g.key} label={g.label} id={`portfolio-tab-${g.key}`} aria-controls={`portfolio-panel-${g.key}`} />
        ))}
      </Tabs>
      <Box role="tabpanel" id={`portfolio-panel-${current.key}`} aria-labelledby={`portfolio-tab-${current.key}`}>
        {current.render(profile)}
      </Box>
    </Stack>
  );
}

export function LinksEditor() {
  const { list, add, remove } = useLinks();
  const methods = useForm<LinkInput>({
    resolver: zodResolver(linkSchema),
    values: { linkType: "website", url: "" },
  });

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Social & web links
      </Typography>
      <Stack spacing={1}>
        {(list.data ?? []).map((l) => (
          <Stack key={l.id} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Link href={l.url} target="_blank" rel="noopener" variant="body2">
              {l.linkType} · {l.url}
            </Link>
            <IconButton size="small" aria-label="Remove link" onClick={() => remove.mutate(l.id)}>
              <FiTrash2 size={16} />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <FormContainer methods={methods} onSubmit={(v) => add.mutate(v, { onSuccess: () => methods.reset() })}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <RHFTextField<LinkInput> name="linkType" label="Type" size="small" select fullWidth>
              {LINK_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: "capitalize" }}>
                  {t}
                </MenuItem>
              ))}
            </RHFTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <RHFTextField<LinkInput> name="url" label="URL" size="small" placeholder="https://…" fullWidth />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button type="submit" size="small" variant="outlined" startIcon={<FiPlus />} loading={add.isPending}>
              Add link
            </Button>
          </Grid>
        </Grid>
      </FormContainer>
    </Stack>
  );
}

function KeywordsEditor() {
  const { list, add, remove } = useKeywords();
  const methods = useForm<KeywordInput>({
    resolver: zodResolver(keywordSchema),
    values: { keyword: "", weight: "1" },
  });

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Search keywords
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Symptoms/terms you want to appear for (e.g. &ldquo;leg pain&rdquo;), beyond your specialty.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
        {(list.data ?? []).map((k) => (
          <Chip key={k.id} label={k.keyword} onDelete={() => remove.mutate(k.id)} variant="outlined" />
        ))}
      </Stack>
      <FormContainer methods={methods} onSubmit={(v) => add.mutate(v, { onSuccess: () => methods.reset() })}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <RHFTextField<KeywordInput> name="keyword" label="Keyword" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <RHFTextField<KeywordInput> name="weight" label="Weight" type="number" size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button type="submit" size="small" variant="outlined" startIcon={<FiPlus />} loading={add.isPending}>
              Add keyword
            </Button>
          </Grid>
        </Grid>
      </FormContainer>
    </Stack>
  );
}
