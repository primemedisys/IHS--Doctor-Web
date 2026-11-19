/**
 * Display-only formatting for human-readable profile text. These never change
 * what is stored — apply them where a value is rendered, never to form values,
 * emails, ids, codes or anything sent back to the API.
 */

/** Uppercase the first letter of a lowercase chunk (Unicode-aware). */
function capitalizeChunk(chunk: string): string {
  const chars = Array.from(chunk);
  if (chars.length === 0) return chunk;
  return chars[0].toLocaleUpperCase() + chars.slice(1).join("");
}

/**
 * Title-case one whitespace-separated word, but only when it has NO deliberate
 * mixed casing. "puspak"/"PUSPAK" → "Puspak", "o'brien" → "O'Brien",
 * "mary-jane" → "Mary-Jane", "a.k." → "A.K.". Mixed-case words such as
 * "McDonald" or "DeSouza" are left exactly as typed, and scripts without case
 * (Devanagari, Odia, …) pass through unchanged.
 */
function formatNameWord(word: string): string {
  const lower = word.toLocaleLowerCase();
  const upper = word.toLocaleUpperCase();
  const isUniformCase = word === lower || word === upper;
  if (!isUniformCase) return word;
  // Split on hyphen / apostrophe / period, keeping the separators.
  return lower
    .split(/([-'’.])/)
    .map((part) => (/^[-'’.]$/.test(part) ? part : capitalizeChunk(part)))
    .join("");
}

/**
 * Readable title case for a person's name: "bibhu prasad" → "Bibhu Prasad",
 * "dr. puspak" → "Dr. Puspak". Collapses stray whitespace. Returns "" for
 * empty input so callers can keep their own fallbacks.
 */
export function formatPersonName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().split(/\s+/).map(formatNameWord).join(" ");
}

/** Education fields the ordering helper reads. */
interface YearedEntry {
  yearTo?: number | null;
  year?: number | null;
}

const validYear = (y: unknown): number | null =>
  typeof y === "number" && Number.isInteger(y) && y > 0 ? y : null;

/**
 * Completion year of an education entry: `yearTo` when the payload carries it,
 * otherwise the legacy `year` field (older payloads/mock data). Never guesses.
 */
export function educationCompletionYear(entry: YearedEntry): number | null {
  if ("yearTo" in entry) return validYear(entry.yearTo);
  return validYear(entry.year);
}

/**
 * Most recent completion year first; entries with no valid year go last.
 * Stable (equal years keep their incoming order) and returns a NEW array — the
 * source list is not mutated.
 */
export function sortEducationByYearDesc<T extends YearedEntry>(entries: readonly T[] | null | undefined): T[] {
  return [...(entries ?? [])].sort((a, b) => {
    const ya = educationCompletionYear(a);
    const yb = educationCompletionYear(b);
    if (ya == null && yb == null) return 0;
    if (ya == null) return 1;
    if (yb == null) return -1;
    return yb - ya;
  });
}

/** Experience fields the ordering helper reads. */
interface DatedRole {
  startYear?: number | null;
  endYear?: number | null;
  isCurrent?: boolean | null;
}

/**
 * Career timeline order: current roles first, then the most recently ended,
 * then the most recently started. Entries with no usable years go last. Stable
 * (ties keep their incoming order) and returns a NEW array.
 */
export function sortExperienceForDisplay<T extends DatedRole>(entries: readonly T[] | null | undefined): T[] {
  const end = (e: DatedRole) => (e.isCurrent ? Number.POSITIVE_INFINITY : validYear(e.endYear));
  const desc = (a: number | null, b: number | null) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a === b ? 0 : b > a ? 1 : -1;
  };
  return [...(entries ?? [])].sort(
    (a, b) => desc(end(a), end(b)) || desc(validYear(a.startYear), validYear(b.startYear)),
  );
}

/**
 * Newest first by `yearOf(entry)`; entries without a valid year go last.
 * Stable (equal / missing years keep their incoming order) and returns a NEW
 * array. Each section passes its OWN year field — a fellowship's completion
 * year, a publication's year, a membership's joining year, …
 */
export function sortByYearDesc<T>(entries: readonly T[] | null | undefined, yearOf: (entry: T) => number | null | undefined): T[] {
  return [...(entries ?? [])].sort((a, b) => {
    const ya = validYear(yearOf(a));
    const yb = validYear(yearOf(b));
    if (ya == null && yb == null) return 0;
    if (ya == null) return 1;
    if (yb == null) return -1;
    return yb - ya;
  });
}

/**
 * The URL when it is a plain http(s) link, else null — so a stored value can
 * never become a `javascript:` (or other scheme) href.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** "https://www.example.org/x" → "example.org" (display only). */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * True when a location carries a real map pin. The public API sends 0/0 for a
 * clinic saved without coordinates (address typed by hand), so 0/0 means "not
 * pinned" — never a place to draw a marker or route directions to.
 */
export function hasCoordinates(loc: { lat?: number | null; lng?: number | null }): boolean {
  const { lat, lng } = loc;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Google Maps directions link: to the pin when there is one, otherwise a plain
 * search for the typed address (no API key involved, nothing claimed verified).
 */
export function directionsUrl(loc: { lat?: number | null; lng?: number | null; name?: string; address?: string; city?: string }): string {
  if (hasCoordinates(loc)) return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
  const query = [loc.name, loc.address, loc.city].filter((p) => p && p.trim()).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
