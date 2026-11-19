import type { Doctor, Specialty, StateInfo, Symptom } from "@/types/doctor";
import doctorsJson from "./doctors.json";
import specialtiesJson from "./specialties.json";
import statesJson from "./states.json";
import symptomsJson from "./symptoms.json";
import { getCity } from "./cities";
import { INDIA_CENTER, jitter } from "./geo";

/**
 * Typed access to the MVP's mock dataset. Components/services import from here
 * (never the raw JSON) so replacing this with a real API later is contained to
 * the service layer.
 */

/** Fields present in the raw JSON (before enrichment). */
type RawDoctor = Omit<Doctor, "lat" | "lng" | "registrationNumber" | "onlineConsult" | "onlineFee">;

/**
 * Enrich raw doctors with derived platform fields the PRD needs: map
 * coordinates (from the doctor's city/area), a medical-council registration
 * number, and video-consult availability/fee. Deterministic so SSR and client
 * render identically.
 */
export const doctors: Doctor[] = (doctorsJson as unknown as RawDoctor[]).map((raw, i) => {
  const city = getCity(raw.citySlug);
  const lat = (city?.lat ?? INDIA_CENTER[0]) + jitter(i + 1, 0.02);
  const lng = (city?.lng ?? INDIA_CENTER[1]) + jitter((i + 1) * 3, 0.02);
  return {
    ...raw,
    lat,
    lng,
    registrationNumber: `MCI-${raw.stateCode}-${10000 + i * 7}`,
    onlineConsult: raw.verified || i % 3 !== 0,
    onlineFee: Math.max(400, Math.round((raw.consultationFee - 200) / 50) * 50),
  } satisfies Doctor;
});

export const specialties = specialtiesJson as unknown as Specialty[];
export const symptoms = symptomsJson as unknown as Symptom[];
export const states = statesJson as unknown as StateInfo[];

/** Distinct languages across the dataset — powers the language filter. */
export const languages: string[] = [...new Set(doctors.flatMap((d) => d.languages))].sort();

export { cities, citiesByState, getCity, stateCodesWithCities } from "./cities";
export { INDIA_CENTER, INDIA_ZOOM } from "./geo";
