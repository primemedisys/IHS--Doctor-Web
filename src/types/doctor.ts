export type Gender = "male" | "female" | "other";

export interface EducationEntry {
  degree: string;
  institution: string;
  /** Legacy single year (completion year, else start year; 0 when unknown). */
  year: number;
  fieldOfStudy?: string | null;
  location?: string | null;
  /** Start year as the doctor entered it (null when blank). */
  yearFrom?: number | null;
  /** Completion year as the doctor entered it — the portfolio sorts on this. */
  yearTo?: number | null;
}

/** A specialty/sub-specialty label as the public portfolio sends it. */
export interface PortfolioSpecialty {
  id: number;
  name: string;
  slug: string;
}

export interface PortfolioSubSpecialty extends PortfolioSpecialty {
  specializationId: number;
}

/** Public portfolio v2 sections (mirror serializePublicDoctor). */
export interface ExperienceEntry {
  id: string;
  organization: string;
  roleTitle: string;
  location?: string | null;
  startYear: number;
  endYear?: number | null;
  isCurrent: boolean;
  description?: string | null;
}
export interface ServiceEntry {
  id: string;
  name: string;
  description?: string | null;
}
export interface PublicationEntry {
  id: string;
  title: string;
  authors?: string | null;
  /** Journal / conference. */
  publisher?: string | null;
  year?: number | null;
  url?: string | null;
  /** A bare DOI ("10.1000/xyz123") — linked to https://doi.org/. */
  doi?: string | null;
  abstract?: string | null;
  category?: string | null;
}
export interface MembershipEntry {
  id: string;
  organization: string;
  roleTitle?: string | null;
  /** Only present when the doctor chose to show it publicly. */
  membershipNumber?: string | null;
  sinceYear?: number | null;
  validUntilYear?: number | null;
  description?: string | null;
}
export interface GalleryImage {
  id: string;
  imageUrl: string;
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  altText?: string | null;
  /** "YYYY-MM-DD". */
  takenOn?: string | null;
}
/** A hospital / clinic / institution the doctor is affiliated with. */
export interface AffiliationEntry {
  id: string;
  organization: string;
  roleTitle?: string | null;
  department?: string | null;
  location?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  /** Set by the doctor — never inferred. */
  isCurrent: boolean;
  website?: string | null;
  phone?: string | null;
}
export interface FellowshipEntry {
  id: string;
  title: string;
  institution: string;
  specialtyArea?: string | null;
  location?: string | null;
  startYear?: number | null;
  /** Completion year (null while ongoing). */
  endYear?: number | null;
  description?: string | null;
}
export type ExpertiseCategory = "clinical" | "scientific" | "area" | "interest";
export interface ExpertiseEntry {
  id: string;
  category: ExpertiseCategory;
  name: string;
  description?: string | null;
}
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}
export interface AwardEntry {
  id: string;
  title: string;
  issuer?: string | null;
  description?: string | null;
  awardYear?: number | null;
  imageUrl?: string | null;
}

/**
 * A public testimonial: visible entries only, entered by the doctor
 * (`source: "doctor"`) — never presented as a verified patient review.
 */
export interface TestimonialEntry {
  id: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  reviewText: string;
  rating: number;
  reviewDate?: string | null;
  source?: "doctor";
}
export interface LinkEntry {
  id: string;
  linkType: string;
  url: string;
}

/** A physical clinic location for a doctor (PRD 4.3a — one doctor → many clinics). */
export interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  stateCode: string;
  lat: number;
  lng: number;
  phone: string;
  /** Per-clinic consultation fee (a doctor may charge differently per clinic). */
  fee: number;
  /** Weekly days this clinic runs, e.g. ["Mon", "Wed", "Fri"]. */
  days: string[];
  openTime: string; // "10:00"
  closeTime: string; // "13:00"
  slotMinutes: number;
}

/** Independent weekly schedule for video/online consults (PRD 4.3a). */
export interface OnlineAvailability {
  days: string[];
  openTime: string;
  closeTime: string;
  slotMinutes: number;
}

export interface Review {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  /** ISO date. */
  date: string;
}

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  gender: Gender;
  photoUrl?: string;
  /** Primary specialty slug (see Specialty). */
  specialtySlug: string;
  specialtyName: string;
  qualifications: string[];
  /** Medical council registration number (shown with a verified badge). */
  registrationNumber: string;
  experienceYears: number;
  languages: string[];
  hospital: string;
  /** City/area slug (see City) — second level of the location cascade. */
  citySlug: string;
  city: string;
  /** State code, e.g. "OD" (see StateInfo). */
  stateCode: string;
  stateName: string;
  /** Primary location coordinates (main clinic) for map discovery. */
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  /** Lowest of the doctor's fees (used for listing/sorting). */
  consultationFee: number;
  /** Fee for a video consultation. */
  onlineFee: number;
  /** Whether the doctor offers video consultation (has online slots). */
  onlineConsult: boolean;
  verified: boolean;
  available: boolean;
  about: string;
  education: EducationEntry[];
  /** Symptom slugs this doctor commonly treats. */
  symptoms: string[];
}

/** A doctor enriched with clinics, online availability and reviews (profile page). */
export interface DoctorDetail extends Doctor {
  clinics: Clinic[];
  onlineAvailability: OnlineAvailability;
  reviews: Review[];
  // ── Portfolio v2 sections (optional so a sparse profile renders cleanly) ──
  headline?: string;
  practicePhilosophy?: string;
  /** One-to-two sentence introduction. */
  shortIntro?: string;
  careerSummary?: string;
  /** Current (and doctor-marked past) affiliations, current first. */
  affiliations?: AffiliationEntry[];
  /** Fellowships / advanced training, newest completion first. */
  fellowships?: FellowshipEntry[];
  /** Clinical / scientific expertise, areas of expertise, professional interests. */
  expertise?: ExpertiseEntry[];
  experience?: ExperienceEntry[];
  services?: ServiceEntry[];
  publications?: PublicationEntry[];
  memberships?: MembershipEntry[];
  gallery?: GalleryImage[];
  faqs?: FaqEntry[];
  insurances?: string[];
  awards?: AwardEntry[];
  /** Doctor-managed patient feedback (visible entries only). */
  testimonials?: TestimonialEntry[];
  links?: LinkEntry[];
  publicPhone?: string | null;
  publicEmail?: string | null;
  /** Doctor-chosen "Why Choose" section image; falls back to the stock image. */
  showcaseImageUrl?: string | null;
  /** Doctor-uploaded hero background slideshow (0–3 URLs, display order). */
  heroImageUrls?: string[];
  /** Every specialty the doctor saved (`specialtyName` is just the first). */
  specialties?: PortfolioSpecialty[];
  subSpecializations?: PortfolioSubSpecialty[];
}

export interface Specialty {
  id: string;
  slug: string;
  name: string;
  /** react-icons component name. */
  icon: string;
  description: string;
  doctorsCount: number;
}

export interface Symptom {
  id: string;
  slug: string;
  name: string;
  /** Symptom → specialization mapping (PRD 4.2 recommendation engine). */
  specialtySlug: string;
}

export interface StateInfo {
  code: string;
  name: string;
  doctorsCount: number;
  hospitalsCount: number;
  specialistsCount: number;
}

/** A city / locality within a state — the second level of the location cascade. */
export interface City {
  slug: string;
  name: string;
  stateCode: string;
  lat: number;
  lng: number;
}

export type DoctorSort = "relevance" | "rating" | "experience" | "fee" | "nearest";

/** Query params for the Find Doctor listing. */
export interface DoctorFilters {
  search?: string;
  stateCode?: string;
  /** City/area slug within the selected state (location cascade). */
  city?: string;
  specialtySlug?: string;
  symptomSlug?: string;
  minExperience?: number;
  language?: string;
  gender?: Gender;
  hospital?: string;
  verified?: boolean;
  available?: boolean;
  /** Only doctors offering video consultation. */
  videoConsult?: boolean;
  maxFee?: number;
  minRating?: number;
  sort?: DoctorSort;
  page?: number;
  pageSize?: number;
}

/** A resolved universal-search suggestion. */
export interface SearchResult {
  type: "doctor" | "specialty" | "symptom" | "location";
  label: string;
  sublabel?: string;
  href: string;
}

/** Booking mode chosen by a patient (PRD 4.6). */
export type BookingMode = "video" | "clinic";

/** A concrete bookable time slot. */
export interface BookingSlot {
  /** ISO datetime. */
  start: string;
  label: string; // "10:30 AM"
}

/** A map pin used by DoctorsMap. */
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href?: string;
}
