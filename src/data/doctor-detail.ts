import type { Clinic, Doctor, DoctorDetail, Review } from "@/types/doctor";
import { citiesByState } from "./cities";
import { jitter } from "./geo";

const REVIEWERS = [
  "Subham P.", "Anjali M.", "Rakesh S.", "Pooja N.", "Manoj D.",
  "Sunita R.", "Amit K.", "Deepa V.", "Bibhu B.", "Sneha T.",
];
const COMMENTS = [
  "Very patient and explained everything clearly. Highly recommend.",
  "Excellent doctor — the online consultation was smooth and helpful.",
  "Diagnosis was spot on and the clinic staff were courteous.",
  "Took time to understand my concerns. Felt genuinely cared for.",
  "Professional and knowledgeable. My symptoms improved quickly.",
  "Booking was easy and the doctor was punctual for the video call.",
];

/** Deterministic pseudo-random int from a string seed. */
function seed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function buildClinics(doctor: Doctor): Clinic[] {
  const s = seed(doctor.id);
  const areaLabels = ["Sector 6", "Unit 4", "Ring Road", "Station Square", "College Square"];
  const clinics: Clinic[] = [
    {
      id: `${doctor.id}-c1`,
      name: doctor.hospital,
      address: `${areaLabels[s % areaLabels.length]}, ${doctor.city}, ${doctor.stateName}`,
      city: doctor.city,
      stateCode: doctor.stateCode,
      lat: doctor.lat,
      lng: doctor.lng,
      phone: `+91 9${(700000000 + (s % 89999999)).toString().slice(0, 9)}`,
      fee: doctor.consultationFee,
      days: ["Mon", "Wed", "Fri"],
      openTime: "10:00",
      closeTime: "13:00",
      slotMinutes: 20,
    },
  ];

  // ~60% of doctors run a second clinic in a different area of the same state.
  const sameStateCities = citiesByState(doctor.stateCode).filter((c) => c.slug !== doctor.citySlug);
  if (sameStateCities.length && s % 5 < 3) {
    const second = sameStateCities[s % sameStateCities.length];
    clinics.push({
      id: `${doctor.id}-c2`,
      name: `${doctor.name.replace(/^Dr\.?\s*/, "")} Clinic — ${second.name}`,
      address: `${areaLabels[(s + 2) % areaLabels.length]}, ${second.name}, ${doctor.stateName}`,
      city: second.name,
      stateCode: second.stateCode,
      lat: second.lat + jitter(s, 0.015),
      lng: second.lng + jitter(s * 2, 0.015),
      phone: `+91 8${(600000000 + (s % 89999999)).toString().slice(0, 9)}`,
      fee: doctor.consultationFee + 100,
      days: ["Tue", "Thu", "Sat"],
      openTime: "17:00",
      closeTime: "20:00",
      slotMinutes: 20,
    });
  }
  return clinics;
}

function buildReviews(doctor: Doctor): Review[] {
  const s = seed(doctor.id);
  const count = 3 + (s % 3);
  return Array.from({ length: count }).map((_, i) => {
    const idx = (s + i * 7) % REVIEWERS.length;
    const rating = Math.min(5, Math.max(3, Math.round(doctor.rating) - (i % 2)));
    const daysAgo = 4 + ((s + i * 11) % 120);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
    return {
      id: `${doctor.id}-r${i}`,
      patientName: REVIEWERS[idx],
      rating,
      comment: COMMENTS[(s + i * 5) % COMMENTS.length],
      date,
    };
  });
}

/** Enrich a base doctor into a full profile with clinics, online availability and reviews. */
export function buildDoctorDetail(doctor: Doctor): DoctorDetail {
  return {
    ...doctor,
    clinics: buildClinics(doctor),
    onlineAvailability: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      openTime: "18:00",
      closeTime: "21:00",
      slotMinutes: 15,
    },
    reviews: buildReviews(doctor),
  };
}
