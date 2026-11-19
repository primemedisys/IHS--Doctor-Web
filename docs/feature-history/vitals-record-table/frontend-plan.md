# Frontend Plan — Vitals Record Table (row-per-reading + Location)

Rewrites the two twin `HealthRecordTable` components from a transposed matrix to a **row-per-reading**
grid, adds an optional **Location** input to both add-vitals dialogs, and extends the two type files.
The API payload keeps its `{ fields, entries }` shape (now with `location` on each entry and `fields`
in the target order), so the components stay dumb renderers. **Legend:** 🟢 exists · 🟡 extend · 🔵 new.

The patient and doctor components are **twins** — apply the identical rewrite to both and keep them in
sync. All three patient render sites (My Profile, Health page, and the completed-booking "Vitals
record" in `MyBookingsView`) and the doctor site (`PatientDescriptionView`) reuse these components, so
they inherit the new layout with no further change.

---

## 1. Types 🟡

**`frontend-patient/src/types/patient.ts`**
```ts
export interface VitalsEntry {
  id: string;
  recordedOn: string;         // "YYYY-MM-DD"
  source: "patient" | "doctor";
  note: string | null;
  location: string | null;    // ← NEW
  values: Record<string, number | string | null>;
}
export interface VitalsInput {
  recordedOn?: string;
  bloodPressure?: string | null;
  pulseRateBpm?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  temperatureF?: number | null;
  spo2Percent?: number | null;
  note?: string | null;
  location?: string | null;   // ← NEW
}
```

**`frontend-doctor/src/types/appointment.ts`** — the identical additions to `VitalsEntry.location`
and `PatientVitalsInput.location`.

---

## 2. `HealthRecordTable.tsx` — row-based rewrite 🟡 (both apps)

Same rewrite for `frontend-patient/src/features/health/components/HealthRecordTable.tsx` and
`frontend-doctor/src/features/appointments/components/HealthRecordTable.tsx`.

**Structure**
- Header row (sticky): `Date`, `Location`, then one `<TableCell>` per `fields[]` showing `label` +
  `(unit)`. Use MUI **`<Table stickyHeader>`** so the header pins while the body scrolls.
- Body: `const rows = [...entries].reverse();` (API is newest-first → rows run **oldest → newest**,
  newest at the **bottom**). One `<TableRow>` per reading:
  - `Date` → `dateLabel(e.recordedOn)` (reuse the existing `dateLabel` helper).
  - `Location` → a **short** label (the first comma-segment / place name) in an ellipsis-clamped
    (`maxWidth`) span wrapped in an MUI `<Tooltip title={e.location}>` so the **full** location shows on
    hover only; `"—"` when absent. When `e.source === "doctor"` append a small **"clinic"** tag
    (preserves the source indicator).
  - one cell per field → `cell(e.values[f.key])` (reuse the existing `cell` `—` helper).

**Scoped scroll + open-at-bottom**
```tsx
const scrollRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = scrollRef.current;
  if (el) el.scrollTop = el.scrollHeight;   // newest (last) row visible by default
}, [entries]);
// …
<Box
  ref={scrollRef}
  sx={{
    maxHeight: { xs: 320, sm: 420 },
    overflowY: "auto",
    overflowX: "auto",                       // narrow screens still scroll sideways in-box
    border: (t) => `1px solid ${t.palette.divider}`,
    borderRadius: (t) => `${t.tokens.radius.md}px`,
  }}
>
  <Table size="small" stickyHeader> … </Table>
</Box>
```

**Keep as-is**
- The `editable` / `onAddReading` "Add Vitals" button (patient) and the empty state.
- The doctor twin keeps its `onAddReading` "Add reading" button and empty state.
- Replace the old `scrollLeft = scrollWidth` effect and the `[...entries].reverse()`-for-columns
  logic with the row logic above.

**Optional polish:** make the `Date` column sticky-left (`position:sticky; left:0`) so it stays
visible during horizontal scroll on small screens — mirrors the current sticky first column.

---

## 3. Location field — Google Maps, required 🟡🔵

**New shared component (twin per app):**
`features/health/components/LocationAutocomplete{,Inner}.tsx` (patient) and
`features/appointments/components/LocationAutocomplete{,Inner}.tsx` (doctor). Mirrors the doctor app's
existing `ClinicLocationPicker`: a client-only dynamic import (`ssr:false`) whose inner mounts
`APIProvider apiKey={env.googleMapsApiKey} libraries={["places"]}` and renders an MUI `Autocomplete`
(freeSolo) driven by the Google **`AutocompleteService`** (debounced, `country:"in"`), plus a
**"use my current location"** button that reverse-geocodes `navigator.geolocation` via the Google
`Geocoder`. `onChange(value: string)` returns the picked place-description string (capped at 150 to
match the column). When `!env.isMapsEnabled` it degrades to a plain required `TextField`.

**Both dialogs** (`AddVitalsEntry.tsx`, `AddPatientVitalsModal.tsx`) — identical change:
```tsx
const [location, setLocation] = useState("");
const [locError, setLocError] = useState(false);
// reset(): setLocation(""); setLocError(false);
// …in the Grid (its own full-width row):
<Grid size={{ xs: 12 }}>
  <LocationAutocomplete
    value={location}
    onChange={(v) => { setLocation(v); if (v.trim()) setLocError(false); }}
    required
    error={locError}
    helperText={locError ? "Location is required" : "Search Google Maps or use your current location."}
  />
</Grid>
// …in save(), before building the body:
if (!location.trim()) { setLocError(true); toast.error("Add the location where this reading was taken."); return; }
draft.location = location.trim();
```
`location` is not a "vital", so the "≥1 vital" guard still applies on top (checked after the location
guard).

---

## 4. Copy tweaks 🟡

In `frontend-patient/src/features/health/components/{HealthPage,ProfilePage}.tsx`, update the Vitals
card `subheader` from "…each date is a column" to "…one row per reading" so the description matches the
new layout.

---

## 5. Verification (frontend)

- **Patient:** My Profile / Health → Vitals card shows `Date | Location | Weight | Height | BMI | Pulse |
  BP | Temp | SpO₂`, rows oldest→newest with the newest at the bottom, opened scrolled to it; scrolling
  stays inside the table (page doesn't move). "Add Vitals" with a Location → the reading appears as the
  bottom row with the location and auto BMI.
- **Completed booking:** a completed booking's "Vitals record" in `MyBookingsView` renders the new
  layout (same component).
- **Doctor:** open a confirmed appointment's patient page → Health records table matches; "Add reading"
  with a Location works and the row shows the **clinic** tag.
- **Static:** `tsc --noEmit` + ESLint clean on the touched files in both `frontend-patient` and
  `frontend-doctor`.
</content>
