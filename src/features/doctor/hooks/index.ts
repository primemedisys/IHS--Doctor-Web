"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/error";
import { catalogService } from "../services/catalog.service";
import { doctorProfileService } from "../services/doctor-profile.service";
import { clinicService } from "../services/clinic.service";
import { paymentQrService } from "../services/payment-qr.service";
import type {
  AwardInput,
  EducationInput,
  ExperienceInput,
  FaqInput,
  KeywordInput,
  LinkInput,
  MembershipInput,
  ProfessionalInput,
  PublicationInput,
  ServiceInput,
  TestimonialInput,
  AffiliationInput,
  FellowshipInput,
  ExpertiseInput,
  GalleryMetaInput,
} from "../schemas";
import type { DocType, SubSpecialization } from "@/types/doctor-portfolio";
import type { ClinicInput, ExceptionInput, WeeklySlotInput } from "@/types/clinic";
import type { PaymentQr, PaymentQrUpdate } from "@/types/payment-qr";

/**
 * React Query hooks for the doctor's own profile & portfolio, following the
 * auth-hooks pattern (useMutation + sonner toast + getErrorMessage). Every
 * mutation invalidates `['doctor','onboarding']` so the completeness UI (wizard
 * stepper + dashboard nudge) stays truthful after any change.
 */

// ── Queries ───────────────────────────────────────────────────────────────────
export function useOnboarding() {
  return useQuery({
    queryKey: queryKeys.doctor.onboarding(),
    queryFn: () => doctorProfileService.getOnboarding(),
  });
}

export function useOwnProfile() {
  return useQuery({
    queryKey: queryKeys.doctor.profile(),
    queryFn: () => doctorProfileService.getProfile(),
  });
}

/** The doctor's own profile in the PUBLIC shape — drives the portfolio preview. */
export function usePortfolioPreview() {
  return useQuery({
    queryKey: queryKeys.doctor.preview(),
    queryFn: () => doctorProfileService.getPreview(),
  });
}

export function useCatalog() {
  const specializations = useQuery({
    queryKey: queryKeys.catalog.specializations(),
    queryFn: () => catalogService.getSpecializations(),
    staleTime: Infinity,
  });
  const languages = useQuery({
    queryKey: queryKeys.catalog.languages(),
    queryFn: () => catalogService.getLanguages(),
    staleTime: Infinity,
  });
  return { specializations, languages };
}

/**
 * The whole sub-specialization catalog (a few hundred short rows). Pickers
 * filter it by the doctor's selected specialties, so switching or adding a
 * specialty needs no extra request. Refetched on mount so entries other doctors
 * added since the last visit show up.
 */
export function useAllSubSpecializations() {
  return useQuery({
    queryKey: queryKeys.catalog.subSpecializations(),
    queryFn: () => catalogService.getSubSpecializations(),
    staleTime: 5 * 60_000,
  });
}

/**
 * "+ Add new sub-specialty": persists to the shared catalog (find-or-create),
 * then merges the row into the cached list so it is selectable immediately.
 */
export function useCreateSubSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { specializationId: number; name: string }) =>
      catalogService.createSubSpecialization(input),
    onSuccess: ({ subSpecialization, created }) => {
      qc.setQueryData<SubSpecialization[]>(queryKeys.catalog.subSpecializations(), (prev) =>
        prev && !prev.some((s) => s.id === subSpecialization.id) ? [...prev, subSpecialization] : prev
      );
      qc.invalidateQueries({ queryKey: queryKeys.catalog.subSpecializationsRoot() });
      toast.success(
        created
          ? `Added "${subSpecialization.name}"`
          : `"${subSpecialization.name}" already exists — selected it for you`
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ── Shared invalidation ────────────────────────────────────────────────────────
function useProfileInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.doctor.profile() });
    qc.invalidateQueries({ queryKey: queryKeys.doctor.onboarding() });
    // Keep the public portfolio preview (dashboard → portfolio) in sync so
    // inline edits show up on the template immediately after saving.
    qc.invalidateQueries({ queryKey: queryKeys.doctor.preview() });
  };
}

// ── Profile / specialties / languages ──────────────────────────────────────────
export function useUpdateProfessional() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (patch: ProfessionalInput) => doctorProfileService.updateProfile(patch),
    onSuccess: () => {
      invalidate();
      toast.success("Professional details saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSetSpecializations() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (ids: number[]) => doctorProfileService.setSpecializations(ids),
    onSuccess: () => {
      invalidate();
      toast.success("Specialties updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

/**
 * Save specialties AND sub-specialties as one action, in order: the specialty
 * set first (the server drops sub-specialties whose parent was removed), then
 * the sub-specialty set (validated against the just-saved specialties). The
 * profile cache is replaced with the server's response, so the form shows what
 * was actually persisted.
 */
export function useSaveSpecialties() {
  const qc = useQueryClient();
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: async ({ specializationIds, subSpecializationIds }: { specializationIds: number[]; subSpecializationIds: number[] }) => {
      await doctorProfileService.setSpecializations(specializationIds);
      return doctorProfileService.setSubSpecializations(subSpecializationIds);
    },
    onSuccess: (profile) => {
      qc.setQueryData(queryKeys.doctor.profile(), profile);
      toast.success("Specialties saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    // Even a half-finished save (specialties ok, sub-specialties rejected) must
    // re-sync the form and portfolio with the server.
    onSettled: () => invalidate(),
  });
}

export function useSetSubSpecializations() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (ids: number[]) => doctorProfileService.setSubSpecializations(ids),
    onSuccess: () => {
      invalidate();
      toast.success("Sub-specialties updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSetLanguages() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (ids: number[]) => doctorProfileService.setLanguages(ids),
    onSuccess: () => {
      invalidate();
      toast.success("Languages updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ── Awards ──────────────────────────────────────────────────────────────────────
export function useAwards() {
  const invalidate = useProfileInvalidation();
  const list = useQuery({ queryKey: queryKeys.doctor.awards(), queryFn: () => doctorProfileService.listAwards() });
  const add = useMutation({
    mutationFn: (input: AwardInput) => doctorProfileService.addAward(input),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Award added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeAward(id),
    onSuccess: () => {
      invalidate();
      list.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const done = (message: string) => () => {
    invalidate();
    list.refetch();
    toast.success(message);
  };
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AwardInput }) => doctorProfileService.updateAward(id, input),
    onSuccess: done("Award updated"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const uploadImage = useMutation({
    mutationFn: (v: { id: string; file: File }) => doctorProfileService.uploadAwardImage(v),
    onSuccess: done("Award image saved"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const removeImage = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeAwardImage(id),
    onSuccess: done("Award image removed"),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, add, update, remove, uploadImage, removeImage };
}

// ── Links ─────────────────────────────────────────────────────────────────────
export function useLinks() {
  const invalidate = useProfileInvalidation();
  const list = useQuery({ queryKey: queryKeys.doctor.links(), queryFn: () => doctorProfileService.listLinks() });
  const add = useMutation({
    mutationFn: (input: LinkInput) => doctorProfileService.addLink(input),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Link added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeLink(id),
    onSuccess: () => {
      invalidate();
      list.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, add, remove };
}

// ── Keywords ────────────────────────────────────────────────────────────────────
export function useKeywords() {
  const invalidate = useProfileInvalidation();
  const list = useQuery({ queryKey: queryKeys.doctor.keywords(), queryFn: () => doctorProfileService.listKeywords() });
  const add = useMutation({
    mutationFn: (input: KeywordInput) => doctorProfileService.addKeyword(input),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Keyword added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeKeyword(id),
    onSuccess: () => {
      invalidate();
      list.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, add, remove };
}

// ── Documents ────────────────────────────────────────────────────────────────────
// ── Portfolio v2 sections (generic list/add/update/remove) ────────────────────
/**
 * One hook shape for every "list of owned items" section. Each mutation
 * invalidates the profile + onboarding (education/experience/services gate
 * submit, so the completeness UI must refresh). Instantiated once per section.
 */
function useSectionResource<TItem, TInput>(
  queryKey: readonly unknown[],
  transport: {
    list: () => Promise<TItem[]>;
    add: (input: TInput) => Promise<TItem>;
    update: (id: string, patch: Partial<TInput>) => Promise<TItem>;
    remove: (id: string) => Promise<string>;
  },
  addedMessage: string,
) {
  const invalidate = useProfileInvalidation();
  const list = useQuery({ queryKey, queryFn: () => transport.list() });
  const add = useMutation({
    mutationFn: (input: TInput) => transport.add(input),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success(addedMessage);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TInput> }) => transport.update(id, patch),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Changes saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => transport.remove(id),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, add, update, remove };
}

// ── Migration 049 sections ──────────────────────────────────────────────────────
export const useAffiliations = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorAffiliation, AffiliationInput>(
    queryKeys.doctor.affiliations(),
    doctorProfileService.affiliations,
    "Affiliation added",
  );
export const useFellowships = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorFellowship, FellowshipInput>(
    queryKeys.doctor.fellowships(),
    doctorProfileService.fellowships,
    "Fellowship added",
  );
/** Clinical / scientific expertise, areas of expertise and professional interests. */
export const useExpertise = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorExpertise, ExpertiseInput>(
    queryKeys.doctor.expertise(),
    doctorProfileService.expertise,
    "Added",
  );

export const useEducation = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorEducation, EducationInput>(
    queryKeys.doctor.education(),
    doctorProfileService.education,
    "Education added",
  );
export const useExperience = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorExperience, ExperienceInput>(
    queryKeys.doctor.experience(),
    doctorProfileService.experience,
    "Experience added",
  );
export const useServices = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorService, ServiceInput>(
    queryKeys.doctor.services(),
    doctorProfileService.services,
    "Service added",
  );
export const usePublications = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorPublication, PublicationInput>(
    queryKeys.doctor.publications(),
    doctorProfileService.publications,
    "Publication added",
  );
export const useMemberships = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorMembership, MembershipInput>(
    queryKeys.doctor.memberships(),
    doctorProfileService.memberships,
    "Membership added",
  );
export const useFaqs = () =>
  useSectionResource<import("@/types/doctor-portfolio").DoctorFaqItem, FaqInput>(
    queryKeys.doctor.faqs(),
    doctorProfileService.faqs,
    "FAQ added",
  );

// ── Doctor-managed testimonials ─────────────────────────────────────────────────
/**
 * The generic section CRUD plus the testimonial extras: the consented patient
 * photo and manual ordering (the full id list in the new order).
 */
export function useTestimonials() {
  const base = useSectionResource<import("@/types/doctor-portfolio").DoctorTestimonial, TestimonialInput>(
    queryKeys.doctor.testimonials(),
    doctorProfileService.testimonials,
    "Testimonial added",
  );
  const invalidate = useProfileInvalidation();
  const refresh = () => {
    invalidate();
    base.list.refetch();
  };
  const uploadPhoto = useMutation({
    mutationFn: (v: { id: string; file: File }) => doctorProfileService.uploadTestimonialPhoto(v),
    onSuccess: () => {
      refresh();
      toast.success("Photo saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const removePhoto = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeTestimonialPhoto(id),
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => doctorProfileService.reorderTestimonials(ids),
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { ...base, uploadPhoto, removePhoto, reorder };
}

// ── Gallery (image upload) ────────────────────────────────────────────────────
export function useGallery() {
  const invalidate = useProfileInvalidation();
  const list = useQuery({
    queryKey: queryKeys.doctor.gallery(),
    queryFn: () => doctorProfileService.listGallery(),
  });
  const add = useMutation({
    mutationFn: ({ file, meta, consent }: { file: File; meta?: Partial<GalleryMetaInput>; consent?: boolean }) =>
      doctorProfileService.addGalleryImage(file, meta, consent),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Image added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const update = useMutation({
    mutationFn: ({ id, meta }: { id: string; meta: GalleryMetaInput }) => doctorProfileService.updateGalleryImage(id, meta),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Image details saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => doctorProfileService.reorderGallery(ids),
    onSuccess: () => {
      invalidate();
      list.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeGalleryImage(id),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Image removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, add, update, reorder, remove };
}

// ── Accepted insurance (lookup + replace-the-set) ─────────────────────────────
export function useInsuranceCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog.insurances(),
    queryFn: () => catalogService.getInsurances(),
    staleTime: Infinity,
  });
}

export function useSetInsurances() {
  const invalidate = useProfileInvalidation();
  return useMutation({
    mutationFn: (ids: number[]) => doctorProfileService.setInsurances(ids),
    onSuccess: () => {
      invalidate();
      toast.success("Insurance updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDocuments() {
  const invalidate = useProfileInvalidation();
  const list = useQuery({ queryKey: queryKeys.doctor.documents(), queryFn: () => doctorProfileService.listDocuments() });
  const upload = useMutation({
    mutationFn: ({ docType, file }: { docType: DocType; file: File }) =>
      doctorProfileService.uploadDocument(docType, file),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Document uploaded");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => doctorProfileService.removeDocument(id),
    onSuccess: () => {
      invalidate();
      list.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, upload, remove };
}

// ── Photo ────────────────────────────────────────────────────────────────────────
export function useUploadPhoto() {
  const invalidate = useProfileInvalidation();
  const { user, setUser } = useAuth();
  return useMutation({
    mutationFn: (file: File) => doctorProfileService.uploadPhoto(file),
    onSuccess: (updated) => {
      // Update the navbar avatar live without a refetch.
      if (user) setUser({ ...user, avatarUrl: updated.avatarUrl ?? null });
      invalidate();
      toast.success("Photo updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ── Showcase image (the "Why Choose" section picture) ───────────────────────────
export function useShowcaseImage() {
  const invalidate = useProfileInvalidation();
  const upload = useMutation({
    mutationFn: (file: File) => doctorProfileService.uploadShowcaseImage(file),
    onSuccess: () => {
      invalidate();
      toast.success("Section image updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => doctorProfileService.removeShowcaseImage(),
    onSuccess: () => {
      invalidate();
      toast.success("Reverted to the standard image");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { upload, remove };
}

// ── Portfolio hero images (up to three background pictures) ────────────────────
export function useHeroImages() {
  const invalidate = useProfileInvalidation();
  const upload = useMutation({
    mutationFn: (vars: { file: File; slot?: number }) => doctorProfileService.uploadHeroImage(vars),
    onSuccess: (_urls, vars) => {
      invalidate();
      toast.success(vars.slot != null ? "Hero image replaced" : "Hero image added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (index: number) => doctorProfileService.removeHeroImage(index),
    onSuccess: () => {
      invalidate();
      toast.success("Hero image removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { upload, remove };
}

// ── Clinics ─────────────────────────────────────────────────────────────────────
export function useClinics() {
  return useQuery({
    queryKey: queryKeys.doctor.clinics(),
    queryFn: () => clinicService.list(),
  });
}

/** Invalidate the clinic list + onboarding (clinics is now a gated step). */
function useClinicInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.doctor.clinics() });
    qc.invalidateQueries({ queryKey: queryKeys.doctor.onboarding() });
    qc.invalidateQueries({ queryKey: queryKeys.doctor.profile() });
    // Clinics render on the public portfolio preview — refresh it too.
    qc.invalidateQueries({ queryKey: queryKeys.doctor.preview() });
  };
}

export function useCreateClinic() {
  const invalidate = useClinicInvalidation();
  return useMutation({
    mutationFn: (input: ClinicInput) => clinicService.create(input),
    onSuccess: () => {
      invalidate();
      toast.success("Clinic added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateClinic() {
  const invalidate = useClinicInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClinicInput> }) =>
      clinicService.update(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success("Clinic updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRemoveClinic() {
  const invalidate = useClinicInvalidation();
  return useMutation({
    mutationFn: (id: string) => clinicService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Clinic removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ── Availability (per-clinic + online, replace-the-set) ──────────────────────────
export function useSetClinicAvailability() {
  const invalidate = useClinicInvalidation();
  return useMutation({
    mutationFn: ({ clinicId, slots }: { clinicId: string; slots: WeeklySlotInput[] }) =>
      clinicService.setClinicAvailability(clinicId, slots),
    onSuccess: () => {
      invalidate();
      toast.success("Clinic hours saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useOnlineAvailability() {
  const invalidate = useClinicInvalidation();
  const list = useQuery({
    queryKey: queryKeys.doctor.onlineAvailability(),
    queryFn: () => clinicService.getOnline(),
  });
  const save = useMutation({
    mutationFn: (slots: WeeklySlotInput[]) => clinicService.setOnline(slots),
    onSuccess: () => {
      invalidate();
      list.refetch();
      toast.success("Online hours saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, save };
}

// ── Exceptions ───────────────────────────────────────────────────────────────────
export function useExceptions() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: queryKeys.doctor.exceptions(),
    queryFn: () => clinicService.listExceptions(),
  });
  const add = useMutation({
    mutationFn: (input: ExceptionInput) => clinicService.addException(input),
    onSuccess: () => {
      list.refetch();
      qc.invalidateQueries({ queryKey: queryKeys.doctor.onboarding() });
      toast.success("Date blocked");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => clinicService.removeException(id),
    onSuccess: () => list.refetch(),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { list, add, remove };
}

// ── Submit for verification ───────────────────────────────────────────────────────
export function useSubmitForVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => doctorProfileService.submit(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.doctor.onboarding() });
      toast.success("Submitted for review");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

// ── Consultation payment QR (the doctor's own UPI QR) ──────────────────────────────
/**
 * Every endpoint answers with the full `PaymentQr`, so mutations write the
 * response straight into the cache instead of refetching. Toasts on success
 * live here; errors are toasted too, and the form additionally maps field
 * `details` onto its inputs.
 */
export function usePaymentQr() {
  const qc = useQueryClient();
  const setCache = (data: PaymentQr) => qc.setQueryData(queryKeys.doctor.paymentQr(), data);

  const query = useQuery({
    queryKey: queryKeys.doctor.paymentQr(),
    queryFn: () => paymentQrService.get(),
  });
  const update = useMutation({
    mutationFn: (patch: PaymentQrUpdate) => paymentQrService.update(patch),
    onSuccess: (data) => {
      setCache(data);
      toast.success("Payment QR settings saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const upload = useMutation({
    mutationFn: (file: File) => paymentQrService.uploadImage(file),
    onSuccess: (data) => {
      setCache(data);
      toast.success("QR code uploaded");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => paymentQrService.remove(),
    onSuccess: (data) => {
      setCache(data);
      toast.success("Payment QR removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return { query, update, upload, remove };
}
