/** Approximate coordinates for the cities used in the dummy dataset. */
export const cityCoords: Record<string, { lat: number; lng: number }> = {
  Mumbai: { lat: 19.076, lng: 72.8777 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Pune: { lat: 18.5204, lng: 73.8567 },
};

/** Geographic centre of India — default map view. */
export const INDIA_CENTER: [number, number] = [22.9734, 79.0];
export const INDIA_ZOOM = 4.4;

/** Deterministic small coordinate offset so co-located pins don't overlap. */
export function jitter(seed: number, amplitude = 0.05): number {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amplitude;
}
