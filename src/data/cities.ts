import type { City } from "@/types/doctor";

/**
 * Cities/areas that make up the location cascade (State → City). Odisha is the
 * primary coverage area with many localities; a few metros in other states keep
 * the state selector meaningful. Coordinates power the map + "near me" sorting.
 */
export const cities: City[] = [
  // --- Odisha (OD) — primary coverage ---
  { slug: "bhubaneswar", name: "Bhubaneswar", stateCode: "OD", lat: 20.2961, lng: 85.8245 },
  { slug: "cuttack", name: "Cuttack", stateCode: "OD", lat: 20.4625, lng: 85.883 },
  { slug: "puri", name: "Puri", stateCode: "OD", lat: 19.8135, lng: 85.8312 },
  { slug: "rourkela", name: "Rourkela", stateCode: "OD", lat: 22.2604, lng: 84.8536 },
  { slug: "sambalpur", name: "Sambalpur", stateCode: "OD", lat: 21.4669, lng: 83.9812 },
  { slug: "berhampur", name: "Berhampur", stateCode: "OD", lat: 19.3149, lng: 84.7941 },
  { slug: "balasore", name: "Balasore", stateCode: "OD", lat: 21.4942, lng: 86.9336 },
  { slug: "angul", name: "Angul", stateCode: "OD", lat: 20.84, lng: 85.1016 },
  { slug: "jharsuguda", name: "Jharsuguda", stateCode: "OD", lat: 21.8556, lng: 84.0062 },
  { slug: "baripada", name: "Baripada", stateCode: "OD", lat: 21.9339, lng: 86.7335 },

  // --- Other states (a couple each) ---
  { slug: "kolkata", name: "Kolkata", stateCode: "WB", lat: 22.5726, lng: 88.3639 },
  { slug: "durgapur", name: "Durgapur", stateCode: "WB", lat: 23.5204, lng: 87.3119 },
  { slug: "new-delhi", name: "New Delhi", stateCode: "DL", lat: 28.6139, lng: 77.209 },
  { slug: "mumbai", name: "Mumbai", stateCode: "MH", lat: 19.076, lng: 72.8777 },
  { slug: "pune", name: "Pune", stateCode: "MH", lat: 18.5204, lng: 73.8567 },
  { slug: "bengaluru", name: "Bengaluru", stateCode: "KA", lat: 12.9716, lng: 77.5946 },
];

const cityBySlug = new Map(cities.map((c) => [c.slug, c]));

export function getCity(slug: string): City | undefined {
  return cityBySlug.get(slug);
}

/** Cities within a given state, alphabetical. */
export function citiesByState(stateCode: string): City[] {
  return cities.filter((c) => c.stateCode === stateCode).sort((a, b) => a.name.localeCompare(b.name));
}

/** State codes that actually have listed cities (drives the cascade's state list). */
export const stateCodesWithCities: string[] = [...new Set(cities.map((c) => c.stateCode))];
