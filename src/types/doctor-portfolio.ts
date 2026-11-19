/**
 * The signed-in doctor's OWN editable profile shapes — distinct from the public
 * `Doctor`/`DoctorDetail` discovery types in `./doctor`. These mirror the
 * backend serializers (utils/serializers.js: serializeDoctorProfile) and the
 * onboarding contract (integration-plan.md §2).
 */

import type { OwnClinic, WeeklySlot } from "@/types/clinic";

export type DocType = "degree_certificate" | "id_proof" | "council_registration" | "other";
export type LinkType = "website" | "linkedin" | "instagram" | "youtube" | "other";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type Gender = "male" | "female" | "other";

/** The completeness checklist that drives the onboarding wizard + dashboard nudge. */
export interface OnboardingStatus {
  steps: {
    professional: boolean;
    specialties: boolean;
    portfolio: boolean;
    documents: boolean;
    // Deferred to the next plan — `null` renders as a disabled "coming next" tile.
    clinics: boolean | null;
    availability: boolean | null;
    bank: boolean | null;
  };
  canSubmit: boolean;
  isSubmitted: boolean;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
}

/** An onboarding step key that is currently in scope (has a screen). */
export type OnboardingStepKey =
  | "professional"
  | "specialties"
  | "portfolio"
  | "documents"
  | "clinics"
  | "availability";

export interface DoctorAward {
  id: string;
  title: string;
  /** Issuing organisation (optional). */
  issuer?: string | null;
  description?: string | null;
  awardYear?: number | null;
  /** Optional uploaded award / certificate picture. */
  imageUrl?: string | null;
}

/**
 * Patient feedback the DOCTOR enters and manages for their public portfolio.
 * Only `isVisible` entries are shown publicly, labelled as shared by the doctor.
 */
export interface DoctorTestimonial {
  id: string;
  patientName: string;
  /** Set only after the doctor confirmed the patient's consent. */
  patientPhotoUrl: string | null;
  reviewText: string;
  rating: number;
  /** "YYYY-MM-DD" or null. */
  reviewDate: string | null;
  isVisible: boolean;
  displayOrder: number;
}

export interface DoctorLink {
  id: string;
  linkType: LinkType;
  url: string;
}

export interface DoctorKeyword {
  id: string;
  keyword: string;
  weight: number;
  isApproved: boolean;
}

export interface DoctorDocument {
  id: string;
  docType: DocType;
  fileUrl: string;
  uploadedAt: string | null;
}

// ── Portfolio v2 section item types (mirror the backend serializers) ─────────
export interface DoctorEducation {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string | null;
  location?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  displayOrder: number;
}

export interface DoctorExperience {
  id: string;
  organization: string;
  roleTitle: string;
  location?: string | null;
  startYear: number;
  endYear?: number | null;
  isCurrent: boolean;
  description?: string | null;
  displayOrder: number;
}

export interface DoctorService {
  id: string;
  name: string;
  description?: string | null;
  displayOrder: number;
}

export interface DoctorPublication {
  id: string;
  title: string;
  authors?: string | null;
  /** Journal / conference. */
  publisher?: string | null;
  year?: number | null;
  url?: string | null;
  /** A bare DOI such as "10.1000/xyz123". */
  doi?: string | null;
  abstract?: string | null;
  category?: string | null;
  displayOrder: number;
}

export interface DoctorMembership {
  id: string;
  organization: string;
  roleTitle?: string | null;
  /** Private unless `showMembershipNumber` is true. */
  membershipNumber?: string | null;
  showMembershipNumber?: boolean;
  sinceYear?: number | null;
  validUntilYear?: number | null;
  description?: string | null;
  displayOrder: number;
}

export type GalleryCategory = "clinic" | "facilities" | "equipment" | "events" | "activities" | "other";

export interface DoctorGalleryImage {
  id: string;
  imageUrl: string;
  title?: string | null;
  caption?: string | null;
  category?: GalleryCategory | null;
  altText?: string | null;
  /** "YYYY-MM-DD" or null. */
  takenOn?: string | null;
  displayOrder: number;
}

/** Where the doctor practises now (or, when `isCurrent` is false, used to). */
export interface DoctorAffiliation {
  id: string;
  organization: string;
  roleTitle: string | null;
  department: string | null;
  location: string | null;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
  website: string | null;
  phone: string | null;
  displayOrder: number;
}

/** A fellowship / advanced-training entry (separate from education). */
export interface DoctorFellowship {
  id: string;
  title: string;
  institution: string;
  specialtyArea: string | null;
  location: string | null;
  startYear: number | null;
  /** Completion year; null while ongoing. */
  endYear: number | null;
  description: string | null;
  displayOrder: number;
}

/** Procedures are not a category here — they are the doctor's services. */
export type ExpertiseCategory = "clinical" | "scientific" | "area" | "interest";

export interface DoctorExpertise {
  id: string;
  category: ExpertiseCategory;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface DoctorFaqItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface Insurance {
  id: number;
  name: string;
}

export interface Specialization {
  id: number;
  name: string;
  slug: string;
}

export interface SubSpecialization {
  id: number;
  name: string;
  slug: string;
  specializationId: number;
}

export interface Language {
  id: number;
  name: string;
}

/** The doctor's full own draft (GET /doctor/profile). */
export interface OwnDoctorProfile {
  id: string;
  slug: string;
  qualification: string | null;
  registrationNumber: string | null;
  experienceYears: number;
  bio: string | null;
  /** One-to-two sentence introduction (hero + portfolio footer). */
  shortIntro?: string | null;
  careerSummary?: string | null;
  headline: string | null;
  gender: Gender | null;
  practicePhilosophy: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  onlineFee: number | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  isSubmitted: boolean;
  avgRating: number;
  ratingCount: number;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  /** The "Why Choose <name>" section picture; null → stock image fallback. */
  showcaseImageUrl: string | null;
  /** Portfolio hero background images (0–3 URLs, display order). */
  heroImageUrls: string[];
  specializations: Specialization[];
  subSpecializations: SubSpecialization[];
  languages: Language[];
  awards: DoctorAward[];
  testimonials?: DoctorTestimonial[];
  links: DoctorLink[];
  documents: DoctorDocument[];
  keywords: DoctorKeyword[];
  education: DoctorEducation[];
  experience: DoctorExperience[];
  services: DoctorService[];
  publications: DoctorPublication[];
  memberships: DoctorMembership[];
  gallery: DoctorGalleryImage[];
  faqs: DoctorFaqItem[];
  affiliations?: DoctorAffiliation[];
  fellowships?: DoctorFellowship[];
  expertise?: DoctorExpertise[];
  insurances: Insurance[];
  /** Filled by docs/clinics-availability — clinics + the online/video schedule. */
  clinics: OwnClinic[];
  onlineAvailability: WeeklySlot[];
}
