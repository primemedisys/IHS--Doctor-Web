import { doctors } from "@/data";
import { buildDoctorDetail } from "@/data/doctor-detail";
import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import { sleep } from "@/utils/async";
import type { ApiResponse } from "@/types/common";
import type {
  BookingSlot,
  Doctor,
  DoctorDetail,
  DoctorFilters,
  OnlineAvailability,
} from "@/types/doctor";

const MOCK_LATENCY = 300;
const DEFAULT_PAGE_SIZE = 9;

/**
 * When the mock dataset should still back the public pages (e.g. before the
 * backend read path is deployed). Set NEXT_PUBLIC_USE_MOCK_DOCTORS=true to keep
 * discovery/profile on the local JSON during the transition.
 */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DOCTORS === "true";

const EMPTY_AVAILABILITY: OnlineAvailability = { days: [], openTime: "", closeTime: "", slotMinutes: 30 };

/**
 * Normalize the backend `serializePublicDoctor` payload to the frontend
 * `DoctorDetail` type. Clinics/online availability arrive empty until the next
 * plan — we backfill safe defaults so the profile page renders without crashing.
 */
function toDoctorDetail(raw: Record<string, unknown>): DoctorDetail {
  const availability = (raw.onlineAvailability as OnlineAvailability | null) ?? EMPTY_AVAILABILITY;
  const clinics = (raw.clinics as DoctorDetail["clinics"]) ?? [];
  return {
    ...(raw as unknown as DoctorDetail),
    clinics,
    reviews: (raw.reviews as DoctorDetail["reviews"]) ?? [],
    education: (raw.education as DoctorDetail["education"]) ?? [],
    languages: (raw.languages as string[]) ?? [],
    qualifications: (raw.qualifications as string[]) ?? [],
    symptoms: (raw.symptoms as string[]) ?? [],
    onlineAvailability: availability,
    // No online slots until the availability plan ships, so don't advertise video.
    onlineConsult: Boolean(raw.onlineConsult) && availability.days.length > 0,
  };
}

export interface DoctorListResult {
  data: Doctor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Doctor discovery over the local dataset — filter, sort and paginate.
 * Simulated latency keeps loading/skeleton states realistic. Replace the body
 * with an API call later; the signature and return shape stay identical.
 */
export async function listDoctors(filters: DoctorFilters = {}): Promise<DoctorListResult> {
  await sleep(MOCK_LATENCY);

  const {
    search,
    specialtySlug,
    symptomSlug,
    stateCode,
    city,
    gender,
    language,
    minExperience,
    maxFee,
    minRating,
    verified,
    available,
    videoConsult,
    sort = "relevance",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filters;

  const q = search?.trim().toLowerCase();

  const filtered = doctors.filter((d) => {
    if (q && ![d.name, d.specialtyName, d.hospital, d.city].some((f) => f.toLowerCase().includes(q))) return false;
    if (specialtySlug && d.specialtySlug !== specialtySlug) return false;
    if (symptomSlug && !d.symptoms.includes(symptomSlug)) return false;
    if (stateCode && d.stateCode !== stateCode) return false;
    if (city && d.citySlug !== city) return false;
    if (gender && d.gender !== gender) return false;
    if (language && !d.languages.includes(language)) return false;
    if (minExperience && d.experienceYears < minExperience) return false;
    if (maxFee && d.consultationFee > maxFee) return false;
    if (minRating && d.rating < minRating) return false;
    if (verified && !d.verified) return false;
    if (available && !d.available) return false;
    if (videoConsult && !d.onlineConsult) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (sort) {
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "experience":
      sorted.sort((a, b) => b.experienceYears - a.experienceYears);
      break;
    case "fee":
      sorted.sort((a, b) => a.consultationFee - b.consultationFee);
      break;
    case "relevance":
    case "nearest": // no live geolocation in the MVP — keep dataset order
    default:
      break;
  }

  const total = sorted.length;
  const start = (page - 1) * pageSize;
  return {
    data: sorted.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Fetch a single doctor (base record) by slug. */
export async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  await sleep(200);
  return doctors.find((d) => d.slug === slug) ?? null;
}

/**
 * Fetch a full doctor profile by slug. Reads the real backend
 * (`GET /doctors/:slug`, approved doctors only) and maps the payload onto
 * `DoctorDetail`; falls back to the mock dataset when USE_MOCK is set. Returns
 * null on a 404 (unknown or not-yet-approved doctor).
 */
export async function getDoctorDetail(slug: string): Promise<DoctorDetail | null> {
  if (USE_MOCK) {
    await sleep(250);
    const doctor = doctors.find((d) => d.slug === slug);
    return doctor ? buildDoctorDetail(doctor) : null;
  }

  try {
    const { data } = await api.get<ApiResponse<Record<string, unknown>>>(
      API_ENDPOINTS.doctors.byId(slug),
    );
    return toDoctorDetail(data.data);
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Other doctors in the same specialty. The doctor portal no longer suggests
 * them from the bundled sample dataset (those profiles don't exist on the
 * server); the patient app shows real related doctors.
 */
export async function getRelatedDoctors(_slug: string): Promise<Doctor[]> {
  return [];
}

/**
 * Generate concrete bookable slots for the next `daysAhead` days that fall on
 * the given weekly `days`, between `openTime`–`closeTime` at `slotMinutes`
 * granularity. Pure/synchronous — used by both clinic and video booking.
 */
export function generateSlots(
  config: { days: string[]; openTime: string; closeTime: string; slotMinutes: number },
  daysAhead = 7,
): { date: string; label: string; slots: BookingSlot[] }[] {
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [openH, openM] = config.openTime.split(":").map(Number);
  const [closeH, closeM] = config.closeTime.split(":").map(Number);
  const result: { date: string; label: string; slots: BookingSlot[] }[] = [];

  for (let offset = 0; offset < daysAhead; offset++) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);
    if (!config.days.includes(DOW[day.getDay()])) continue;

    const slots: BookingSlot[] = [];
    const cursor = new Date(day);
    cursor.setHours(openH, openM, 0, 0);
    const end = new Date(day);
    end.setHours(closeH, closeM, 0, 0);

    while (cursor < end) {
      // Skip slots already in the past for today.
      if (cursor.getTime() > Date.now()) {
        slots.push({
          start: cursor.toISOString(),
          label: cursor.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }),
        });
      }
      cursor.setMinutes(cursor.getMinutes() + config.slotMinutes);
    }

    if (slots.length) {
      result.push({
        date: day.toISOString(),
        label: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        slots,
      });
    }
  }
  return result;
}
