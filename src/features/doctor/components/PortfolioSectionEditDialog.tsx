"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FiX } from "react-icons/fi";
import { Loading } from "@/components/feedback";
import type { PortfolioSectionKey } from "@/features/doctors";
import { useOwnProfile } from "../hooks";
import { PhotoUpload } from "./PhotoUpload";
import { ShowcaseImageUpload } from "./ShowcaseImageUpload";
import { HeroImagesUpload } from "./HeroImagesUpload";
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
} from "./PortfolioSections";
import { ClinicsManager } from "./ClinicsManager";
import { ProfessionalStep } from "./steps/ProfessionalStep";
import { SpecialtiesStep } from "./steps/SpecialtiesStep";
import { LinksEditor } from "./steps/PortfolioStep";
import { AwardsEditor } from "./AwardsEditor";
import { TestimonialsEditor } from "./TestimonialsEditor";
import type { OwnDoctorProfile } from "@/types/doctor-portfolio";

/** Human-readable dialog titles for each editable section. */
const SECTION_TITLES: Record<PortfolioSectionKey, string> = {
  profile: "Profile details",
  photo: "Profile photo",
  showcaseImage: "About section image",
  heroImages: "Hero background images",
  about: "About the doctor",
  affiliations: "Current affiliations",
  specialties: "Specialties & languages",
  expertise: "Specialization & expertise",
  services: "Procedures & treatments",
  experience: "Professional experience",
  fellowships: "Fellowships & advanced training",
  education: "Education & qualifications",
  publications: "Research & publications",
  awards: "Awards & achievements",
  memberships: "Professional memberships",
  testimonials: "Patient feedback",
  gallery: "Gallery",
  insurance: "Insurance accepted",
  clinics: "Clinics & locations",
  faq: "Frequently asked questions",
  contact: "Contact & social links",
};

/** Renders the correct editor for a section, given the loaded profile. */
function SectionEditor({ section, profile }: { section: PortfolioSectionKey; profile: OwnDoctorProfile }) {
  switch (section) {
    case "profile":
      return <ProfessionalStep profile={profile} />;
    case "photo":
      return <PhotoUpload name={profile.name ?? "Doctor"} photoUrl={profile.photoUrl} />;
    case "showcaseImage":
      return <ShowcaseImageUpload imageUrl={profile.showcaseImageUrl} />;
    case "heroImages":
      return <HeroImagesUpload imageUrls={profile.heroImageUrls} />;
    case "about":
      return (
        <Stack spacing={3}>
          <ProfessionalStep profile={profile} />
          <Divider />
          <InterestsEditor />
        </Stack>
      );
    case "affiliations":
      return <AffiliationsEditor />;
    case "specialties":
      return <SpecialtiesStep profile={profile} />;
    case "expertise":
      return (
        <Stack spacing={3}>
          <SpecialtiesStep profile={profile} />
          <Divider />
          <ExpertiseEditor />
          <Divider />
          <ServicesEditor />
        </Stack>
      );
    case "services":
      return <ServicesEditor />;
    case "experience":
      return <ExperienceEditor />;
    case "fellowships":
      return <FellowshipsEditor />;
    case "education":
      return <EducationEditor />;
    case "publications":
      return <PublicationsEditor />;
    case "awards":
      return <AwardsEditor />;
    case "memberships":
      return <MembershipsEditor />;
    case "testimonials":
      return <TestimonialsEditor />;
    case "gallery":
      return <GalleryEditor />;
    case "insurance":
      return <InsuranceEditor profile={profile} />;
    case "clinics":
      return <ClinicsManager />;
    case "faq":
      return <FaqEditor />;
    case "contact":
      return <LinksEditor />;
    default:
      return null;
  }
}

/**
 * Inline editor shown as a modal directly over the portfolio template, so the
 * doctor edits a section in place instead of navigating to a separate editor
 * page. Every save auto-refreshes the preview (mutations invalidate the
 * `doctor.preview` query), so changes appear on the template behind the dialog.
 */
export function PortfolioSectionEditDialog({
  section,
  onClose,
}: {
  section: PortfolioSectionKey | null;
  onClose: () => void;
}) {
  const { data: profile, isLoading } = useOwnProfile();
  const open = section !== null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
          {section ? SECTION_TITLES[section] : ""}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }}>
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading || !profile ? (
          <Loading label="Loading…" />
        ) : section ? (
          <SectionEditor section={section} profile={profile} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
