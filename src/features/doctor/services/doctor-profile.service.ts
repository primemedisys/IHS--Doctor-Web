import { api } from "@/services/api";
import { compressImage } from "@/utils/compressImage";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { User } from "@/types/auth";
import type { DoctorDetail } from "@/types/doctor";
import type {
  DocType,
  DoctorAffiliation,
  DoctorAward,
  DoctorDocument,
  DoctorEducation,
  DoctorExperience,
  DoctorExpertise,
  DoctorFaqItem,
  DoctorFellowship,
  DoctorGalleryImage,
  DoctorKeyword,
  DoctorLink,
  DoctorMembership,
  DoctorPublication,
  DoctorService,
  DoctorTestimonial,
  OnboardingStatus,
  OwnDoctorProfile,
} from "@/types/doctor-portfolio";
import type {
  ProfessionalInput,
  AwardInput,
  LinkInput,
  KeywordInput,
  EducationInput,
  ExperienceInput,
  ServiceInput,
  PublicationInput,
  MembershipInput,
  FaqInput,
  TestimonialInput,
  AffiliationInput,
  FellowshipInput,
  ExpertiseInput,
  GalleryMetaInput,
} from "../schemas";

const ENDPOINTS = API_ENDPOINTS.doctor;

/**
 * Blank → null, else the trimmed value. Null (not undefined) on purpose: the
 * editors send the whole form on edit, so clearing an optional field must
 * reach the API as an explicit null instead of being silently dropped.
 */
const str = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);
/** numeric string → number, or null when blank. */
const num = (v?: string | null) => (v && v.trim() !== "" ? Number(v) : null);

/**
 * Generic CRUD transport for a "list of owned items" section (education,
 * experience, …). One implementation, parameterized by its two endpoints and a
 * form→payload converter — so we don't hand-write six near-identical blocks.
 */
function sectionApi<TItem, TInput>(
  listUrl: string,
  itemUrl: (id: string) => string,
  toPayload: (input: Partial<TInput>) => Record<string, unknown>,
) {
  return {
    list: () => api.get<ApiResponse<TItem[]>>(listUrl).then((r) => r.data.data),
    add: (input: TInput) =>
      api.post<ApiResponse<TItem>>(listUrl, toPayload(input)).then((r) => r.data.data),
    update: (id: string, patch: Partial<TInput>) =>
      api.patch<ApiResponse<TItem>>(itemUrl(id), toPayload(patch)).then((r) => r.data.data),
    remove: (id: string) => api.delete(itemUrl(id)).then(() => id),
  };
}

/**
 * The doctor's own profile & portfolio API. HTTP only, off the shared `api`
 * instance (so the auth header + refresh-on-401 interceptor apply). Mirrors the
 * backend contract in docs/doctor-onboarding/integration-plan.md.
 *
 * Multipart note: pass the FormData straight to axios and DO NOT set
 * Content-Type manually — the browser adds the multipart boundary.
 */
export const doctorProfileService = {
  getOnboarding: () =>
    api.get<ApiResponse<OnboardingStatus>>(ENDPOINTS.onboarding).then((r) => r.data.data),

  getProfile: () =>
    api.get<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.profile).then((r) => r.data.data),

  /** Own profile in the PUBLIC shape — "how patients see me" (any status). */
  getPreview: () =>
    api.get<ApiResponse<DoctorDetail>>(ENDPOINTS.preview).then((r) => r.data.data),

  updateProfile: (patch: ProfessionalInput) =>
    api
      .patch<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.profile, {
        qualification: patch.qualification,
        registrationNumber: patch.registrationNumber,
        experienceYears: Number(patch.experienceYears),
        bio: patch.bio || null,
        onlineFee: patch.onlineFee == null || patch.onlineFee.trim() === "" ? null : Number(patch.onlineFee),
        headline: patch.headline,
        gender: patch.gender,
        practicePhilosophy: patch.practicePhilosophy || null,
        publicPhone: patch.publicPhone || null,
        publicEmail: patch.publicEmail || null,
        // About section extras — sent only when the form carries them, so a
        // caller that does not know the fields never clears them.
        ...(patch.shortIntro !== undefined ? { shortIntro: str(patch.shortIntro) } : {}),
        ...(patch.careerSummary !== undefined ? { careerSummary: str(patch.careerSummary) } : {}),
      })
      .then((r) => r.data.data),

  setSpecializations: (specializationIds: number[]) =>
    api
      .put<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.specializations, { specializationIds })
      .then((r) => r.data.data),

  setSubSpecializations: (subSpecializationIds: number[]) =>
    api
      .put<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.subSpecializations, { subSpecializationIds })
      .then((r) => r.data.data),

  setLanguages: (languageIds: number[]) =>
    api.put<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.languages, { languageIds }).then((r) => r.data.data),

  // ── Awards ────────────────────────────────────────────────────────────────
  listAwards: () => api.get<ApiResponse<DoctorAward[]>>(ENDPOINTS.awards).then((r) => r.data.data),
  addAward: (input: AwardInput) =>
    api
      .post<ApiResponse<DoctorAward>>(ENDPOINTS.awards, {
        title: input.title,
        issuer: input.issuer?.trim() || undefined,
        description: input.description || undefined,
        awardYear: input.awardYear == null || input.awardYear.trim() === "" ? undefined : Number(input.awardYear),
      })
      .then((r) => r.data.data),
  updateAward: (id: string, input: AwardInput) =>
    api
      .patch<ApiResponse<DoctorAward>>(ENDPOINTS.award(id), {
        title: input.title,
        issuer: input.issuer?.trim() || null,
        description: input.description?.trim() || null,
        awardYear: input.awardYear == null || input.awardYear.trim() === "" ? null : Number(input.awardYear),
      })
      .then((r) => r.data.data),
  removeAward: (id: string) => api.delete(ENDPOINTS.award(id)).then(() => id),
  uploadAwardImage: async ({ id, file }: { id: string; file: File }) => {
    const fd = new FormData();
    fd.append("file", await compressImage(file));
    return api.post<ApiResponse<DoctorAward>>(ENDPOINTS.awardImage(id), fd).then((r) => r.data.data);
  },
  removeAwardImage: (id: string) =>
    api.delete<ApiResponse<DoctorAward>>(ENDPOINTS.awardImage(id)).then((r) => r.data.data),

  // ── Doctor-managed testimonials ───────────────────────────────────────────
  testimonials: sectionApi<DoctorTestimonial, TestimonialInput>(
    ENDPOINTS.testimonials,
    ENDPOINTS.testimonialItem,
    (i) => ({
      patientName: i.patientName,
      reviewText: i.reviewText,
      rating: i.rating,
      reviewDate: i.reviewDate === undefined ? undefined : i.reviewDate || null,
      isVisible: i.isVisible,
    }),
  ),
  /** Photo upload — `consent` records that the doctor confirmed the patient agreed. */
  uploadTestimonialPhoto: async ({ id, file }: { id: string; file: File }) => {
    const fd = new FormData();
    fd.append("file", await compressImage(file));
    fd.append("consent", "true");
    return api.post<ApiResponse<DoctorTestimonial>>(ENDPOINTS.testimonialPhoto(id), fd).then((r) => r.data.data);
  },
  removeTestimonialPhoto: (id: string) =>
    api.delete<ApiResponse<DoctorTestimonial>>(ENDPOINTS.testimonialPhoto(id)).then((r) => r.data.data),
  reorderTestimonials: (ids: string[]) =>
    api
      .put<ApiResponse<DoctorTestimonial[]>>(ENDPOINTS.testimonialOrder, { ids })
      .then((r) => r.data.data),

  // ── Links ─────────────────────────────────────────────────────────────────
  listLinks: () => api.get<ApiResponse<DoctorLink[]>>(ENDPOINTS.links).then((r) => r.data.data),
  addLink: (input: LinkInput) =>
    api.post<ApiResponse<DoctorLink>>(ENDPOINTS.links, input).then((r) => r.data.data),
  removeLink: (id: string) => api.delete(ENDPOINTS.link(id)).then(() => id),

  // ── Keywords ──────────────────────────────────────────────────────────────
  listKeywords: () => api.get<ApiResponse<DoctorKeyword[]>>(ENDPOINTS.keywords).then((r) => r.data.data),
  addKeyword: (input: KeywordInput) =>
    api
      .post<ApiResponse<DoctorKeyword>>(ENDPOINTS.keywords, {
        keyword: input.keyword,
        weight: Number(input.weight),
      })
      .then((r) => r.data.data),
  removeKeyword: (id: string) => api.delete(ENDPOINTS.keyword(id)).then(() => id),

  // ── Documents ─────────────────────────────────────────────────────────────
  listDocuments: () =>
    api.get<ApiResponse<DoctorDocument[]>>(ENDPOINTS.documents).then((r) => r.data.data),
  uploadDocument: async (docType: DocType, file: File) => {
    const fd = new FormData();
    fd.append("docType", docType);
    // Shrink a phone photo before it goes near the network — an 8–12 MB
    // camera shot is a multi-minute mobile upload; PDFs and non-images
    // pass through untouched.
    fd.append("file", await compressImage(file));
    return api.post<ApiResponse<DoctorDocument>>(ENDPOINTS.documents, fd).then((r) => r.data.data);
  },
  removeDocument: (id: string) => api.delete(ENDPOINTS.document(id)).then(() => id),

  // ── Photo + submit ────────────────────────────────────────────────────────
  uploadPhoto: async (file: File) => {
    const fd = new FormData();
    // Shrink a phone photo before it goes near the network — an 8–12 MB
    // camera shot is a multi-minute mobile upload; PDFs and non-images
    // pass through untouched.
    fd.append("file", await compressImage(file));
    return api.post<ApiResponse<User>>(ENDPOINTS.photo, fd).then((r) => r.data.data);
  },

  // ── Showcase image (the "Why Choose" section picture) ────────────────────
  uploadShowcaseImage: async (file: File) => {
    const fd = new FormData();
    // Shrink a phone photo before it goes near the network — an 8–12 MB
    // camera shot is a multi-minute mobile upload; PDFs and non-images
    // pass through untouched.
    fd.append("file", await compressImage(file));
    return api
      .post<ApiResponse<{ showcaseImageUrl: string }>>(ENDPOINTS.showcaseImage, fd)
      .then((r) => r.data.data);
  },
  removeShowcaseImage: () => api.delete(ENDPOINTS.showcaseImage).then(() => undefined),

  // ── Portfolio hero images (up to three; `slot` replaces that image) ───────
  uploadHeroImage: async ({ file, slot }: { file: File; slot?: number }) => {
    const fd = new FormData();
    fd.append("file", await compressImage(file));
    if (slot != null) fd.append("slot", String(slot));
    return api
      .post<ApiResponse<{ heroImageUrls: string[] }>>(ENDPOINTS.heroImages, fd)
      .then((r) => r.data.data.heroImageUrls);
  },
  removeHeroImage: (index: number) =>
    api
      .delete<ApiResponse<{ heroImageUrls: string[] }>>(ENDPOINTS.heroImage(index))
      .then((r) => r.data.data.heroImageUrls),

  // ── Portfolio v2 sections (docs/doctor-portfolio-v2) ────────────────────────
  education: sectionApi<DoctorEducation, EducationInput>(
    ENDPOINTS.education,
    ENDPOINTS.educationItem,
    (i) => ({
      degree: i.degree,
      institution: i.institution,
      fieldOfStudy: str(i.fieldOfStudy),
      location: str(i.location),
      yearFrom: num(i.yearFrom),
      yearTo: num(i.yearTo),
    }),
  ),
  experience: sectionApi<DoctorExperience, ExperienceInput>(
    ENDPOINTS.experience,
    ENDPOINTS.experienceItem,
    (i) => ({
      organization: i.organization,
      roleTitle: i.roleTitle,
      location: str(i.location),
      startYear: num(i.startYear),
      endYear: i.isCurrent ? null : num(i.endYear),
      isCurrent: Boolean(i.isCurrent),
      description: str(i.description),
    }),
  ),
  services: sectionApi<DoctorService, ServiceInput>(
    ENDPOINTS.services,
    ENDPOINTS.serviceItem,
    (i) => ({ name: i.name, description: str(i.description) }),
  ),
  publications: sectionApi<DoctorPublication, PublicationInput>(
    ENDPOINTS.publications,
    ENDPOINTS.publicationItem,
    (i) => ({
      title: i.title,
      authors: str(i.authors),
      publisher: str(i.publisher),
      year: num(i.year),
      url: str(i.url),
      doi: str(i.doi),
      abstract: str(i.abstract),
      category: str(i.category),
    }),
  ),
  memberships: sectionApi<DoctorMembership, MembershipInput>(
    ENDPOINTS.memberships,
    ENDPOINTS.membershipItem,
    (i) => ({
      organization: i.organization,
      roleTitle: str(i.roleTitle),
      sinceYear: num(i.sinceYear),
      membershipNumber: str(i.membershipNumber),
      showMembershipNumber: Boolean(i.showMembershipNumber),
      validUntilYear: num(i.validUntilYear),
      description: str(i.description),
    }),
  ),
  // ── Migration 049 sections ──────────────────────────────────────────────────
  affiliations: sectionApi<DoctorAffiliation, AffiliationInput>(
    ENDPOINTS.affiliations,
    ENDPOINTS.affiliationItem,
    (i) => ({
      organization: i.organization,
      roleTitle: str(i.roleTitle),
      department: str(i.department),
      location: str(i.location),
      startYear: num(i.startYear),
      endYear: i.isCurrent ? null : num(i.endYear),
      isCurrent: Boolean(i.isCurrent),
      website: str(i.website),
      phone: str(i.phone),
    }),
  ),
  fellowships: sectionApi<DoctorFellowship, FellowshipInput>(
    ENDPOINTS.fellowships,
    ENDPOINTS.fellowshipItem,
    (i) => ({
      title: i.title,
      institution: i.institution,
      specialtyArea: str(i.specialtyArea),
      location: str(i.location),
      startYear: num(i.startYear),
      endYear: num(i.endYear),
      description: str(i.description),
    }),
  ),
  expertise: sectionApi<DoctorExpertise, ExpertiseInput>(
    ENDPOINTS.expertise,
    ENDPOINTS.expertiseItem,
    (i) => ({ category: i.category, name: i.name?.trim(), description: str(i.description) }),
  ),
  faqs: sectionApi<DoctorFaqItem, FaqInput>(ENDPOINTS.faqs, ENDPOINTS.faqItem, (i) => ({
    question: i.question,
    answer: i.answer,
  })),

  // ── Gallery (image upload) ──────────────────────────────────────────────────
  listGallery: () =>
    api.get<ApiResponse<DoctorGalleryImage[]>>(ENDPOINTS.gallery).then((r) => r.data.data),
  addGalleryImage: async (file: File, meta?: Partial<GalleryMetaInput>, consent?: boolean) => {
    const fd = new FormData();
    // Shrink a phone photo before it goes near the network — an 8–12 MB
    // camera shot is a multi-minute mobile upload; PDFs and non-images
    // pass through untouched.
    fd.append("file", await compressImage(file));
    for (const [key, value] of Object.entries(meta ?? {})) {
      const v = typeof value === "string" ? value.trim() : "";
      if (v) fd.append(key, v);
    }
    if (consent) fd.append("consent", "true");
    return api.post<ApiResponse<DoctorGalleryImage>>(ENDPOINTS.gallery, fd).then((r) => r.data.data);
  },
  /** Edit one picture's metadata; blank fields are cleared. */
  updateGalleryImage: (id: string, meta: GalleryMetaInput) =>
    api
      .patch<ApiResponse<DoctorGalleryImage>>(ENDPOINTS.galleryItem(id), {
        title: str(meta.title),
        caption: str(meta.caption),
        category: meta.category || null,
        altText: str(meta.altText),
        takenOn: meta.takenOn || null,
      })
      .then((r) => r.data.data),
  /** Every picture id, in the new order. */
  reorderGallery: (ids: string[]) =>
    api.put<ApiResponse<DoctorGalleryImage[]>>(ENDPOINTS.galleryOrder, { ids }).then((r) => r.data.data),
  removeGalleryImage: (id: string) => api.delete(ENDPOINTS.galleryItem(id)).then(() => id),

  // ── Accepted insurance (replace-the-set) ────────────────────────────────────
  setInsurances: (insuranceIds: number[]) =>
    api.put<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.insurances, { insuranceIds }).then((r) => r.data.data),

  submit: () => api.post<ApiResponse<OnboardingStatus>>(ENDPOINTS.submit).then((r) => r.data.data),
};
