/**
 * URL query-param keys for the Find Doctor page. Centralized so the SearchBar,
 * filter UI and the listing page read/write identical keys.
 */
export const SEARCH_PARAMS = {
  query: "q",
  specialty: "specialty",
  symptom: "symptom",
  state: "state",
  city: "city",
  gender: "gender",
  language: "language",
  minExperience: "minExp",
  maxFee: "maxFee",
  minRating: "minRating",
  verified: "verified",
  available: "available",
  videoConsult: "video",
  sort: "sort",
  page: "page",
} as const;
