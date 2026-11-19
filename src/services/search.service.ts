import { ROUTES } from "@/constants/routes";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { doctors, specialties, states, symptoms } from "@/data";
import type { SearchResult } from "@/types/doctor";

const withParam = (key: string, value: string) => `${ROUTES.findDoctor}?${key}=${encodeURIComponent(value)}`;

/**
 * Universal search over the local dataset — the platform's most important
 * entry point. Ranks specialties and symptoms first (intent), then doctors and
 * locations. Reads the shared dataset directly; swap for an API/AI endpoint
 * later without touching the SearchBar component.
 */
export function searchAll(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const s of specialties) {
    if (s.name.toLowerCase().includes(q)) {
      results.push({ type: "specialty", label: s.name, sublabel: "Specialty", href: withParam(SEARCH_PARAMS.specialty, s.slug) });
    }
  }
  for (const s of symptoms) {
    if (s.name.toLowerCase().includes(q)) {
      results.push({ type: "symptom", label: s.name, sublabel: "Symptom", href: withParam(SEARCH_PARAMS.symptom, s.slug) });
    }
  }
  for (const d of doctors) {
    if (d.name.toLowerCase().includes(q) || d.hospital.toLowerCase().includes(q)) {
      results.push({ type: "doctor", label: d.name, sublabel: `${d.specialtyName} · ${d.city}`, href: ROUTES.doctorProfile(d.slug) });
    }
  }
  for (const st of states) {
    if (st.name.toLowerCase().includes(q)) {
      results.push({ type: "location", label: st.name, sublabel: "Location", href: withParam(SEARCH_PARAMS.state, st.code) });
    }
  }

  return results.slice(0, limit);
}
