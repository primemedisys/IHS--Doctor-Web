# Frontend — Clinics & Availability

**App:** `frontend-doctor/` — Next.js 16 (App Router) + MUI + React Query + Axios + Zod + React Hook Form. TypeScript.

The doctor-onboarding build is done: the wizard shell, `doctor-profile.service`, `useOnboarding`, the `VerificationBanner`, the reusable `StepShell`/`RepeatableList`, and the public `/doctors/[slug]` page (now reading real data) all exist. This plan builds the **three deferred step screens** — Clinics, Clinic Availability, Online Availability — replaces the two dashboard placeholder pages, and lights up the public profile's clinic + video cards. The wizard already renders these as **disabled "coming next" tiles**; we make them real.

**Legend:** 🟢 exists (reuse) · 🟡 exists (extend) · 🔵 new.

---

## 1. What already exists (reuse)

| Thing | File | Use |
|---|---|---|
| Axios + refresh-on-401 | `src/services/api.ts` 🟢 | All new requests ride the same instance. |
| Onboarding brain | `features/doctor/hooks/useOnboarding.ts` 🟢 | Now returns `steps.clinics`/`.availability` as **booleans** (backend fills them) — the wizard tiles switch from disabled to active automatically. |
| Wizard shell + `StepShell` | `app/(dashboard)/dashboard/onboarding/page.tsx`, `features/doctor/components/StepShell.tsx` 🟢/🟡 | Add the three real steps where the "coming next" tiles are. |
| `RepeatableList` | `features/doctor/components/RepeatableList.tsx` 🟢 | Drives the weekly-slot rows and the clinics list. |
| `VerificationBanner` | `features/doctor/components/VerificationBanner.tsx` 🟢 | Unchanged — `canSubmit` now also depends on clinics/availability. |
| Placeholders to replace | `app/(dashboard)/dashboard/clinics/page.tsx`, `…/availability/page.tsx` 🟡 | Become the real Clinics + Availability managers. |
| Public profile (real data) | `app/doctors/[slug]/page.tsx`, `features/doctors/*` 🟢 | Already renders `clinics[]` + "Video Consult" **conditionally** — arrives non-empty once the backend serializer fills them. **No change needed.** |
| Types | `types/doctor.ts` 🟢 (`Clinic`, `OnlineAvailability`, `DoctorDetail`) | Public shapes already exist — reserved by the onboarding plan. |
| Date/time pickers | `@mui/x-date-pickers` 🟢 (in `package.json`) | Slot time fields. |

---

## 2. Map picker — Leaflet / OpenStreetMap (no API key) ✅ IMPLEMENTED

The app already standardises on **Leaflet + OpenStreetMap** (Carto tiles) for every map — `components/ui/DoctorsMap`, `HeroLocatorMap`. The clinic picker is built on that same stack, so it needs **no Google key and no new billing**. (This supersedes the earlier Google-Places plan — kept keyless for consistency with the rest of the app.)

- **`ClinicLocationPickerInner.tsx`** 🔵 — a `react-leaflet` map with:
  - an **address search box** (MUI `Autocomplete`) backed by **OpenStreetMap Nominatim** (`/search`, debounced ~350 ms, `countrycodes=in`, `addressdetails=1`) — free, no key;
  - **click-to-place** (`useMapEvents`) and a **draggable pin**;
  - on every pick it **reverse-geocodes** (`/reverse`) and emits `PickedLocation { lat, lng, addressLine?, city?, state?, pincode? }`.
- **`ClinicLocationPicker.tsx`** 🔵 — the `ssr:false` dynamic wrapper (Leaflet touches `window`), mirroring `DoctorsMap`.
- **Auto-fill:** `ClinicForm.handlePick` writes `lat`/`lng` (read-only fields) **and** overwrites `addressLine`/`city`/`state`/`pincode` from the geocode result — the doctor searches once and every field populates; the address fields stay editable only as a fallback for gaps in the OSM data.
- **Env:** none. (If a team later prefers Google Places specifically, swap the two picker files for a `@vis.gl/react-google-maps` implementation behind the same `PickedLocation` contract + a `NEXT_PUBLIC_GOOGLE_MAPS_KEY` — the rest of the form is untouched.)

---

## 3. Constants, routes, types

**🟡 `src/constants/api.ts`** — add a `clinics` + `availability` block (mirrors backend catalog):

```ts
doctor: {
  ...existing,
  clinics: "/doctor/clinics",
  clinic: (id: string) => `/doctor/clinics/${id}`,
  clinicAvailability: (id: string) => `/doctor/clinics/${id}/availability`,
  onlineAvailability: "/doctor/online-availability",
  exceptions: "/doctor/exceptions",
  exception: (id: string) => `/doctor/exceptions/${id}`,
},
doctors: { ...existing, slots: (id: string) => `/doctors/${id}/slots` },
```

**🔵 `src/types/clinic.ts`** — the doctor's own editable shapes (distinct from the public `Clinic`):

```ts
export interface WeeklySlot { dayOfWeek: number; startTime: string; endTime: string; slotDurationMinutes: number }
export interface OwnClinic {
  id: string; name: string; addressLine: string; city?: string; state?: string; pincode?: string;
  lat: number; lng: number; phone?: string; offlineFee: number; isActive: boolean;
  availability: WeeklySlot[];
}
export interface AvailabilityException { id: string; clinicId: string | null; exceptionDate: string; reason?: string }
export interface ClinicInput { /* create/patch body, no id/availability */ }
```

> The **public** `Clinic`/`OnlineAvailability` types in `types/doctor.ts` stay as-is — those are what the patient page consumes; these are the owner-editor shapes.

---

## 4. Services — `src/features/doctor/services/clinic.service.ts` 🔵

Talk HTTP only, off the shared `api` instance, mirroring `doctor-profile.service.ts`:

```ts
export const clinicService = {
  list:   () => api.get<ApiResponse<OwnClinic[]>>(ENDPOINTS.doctor.clinics).then(r => r.data.data),
  create: (b: ClinicInput) => api.post(ENDPOINTS.doctor.clinics, b).then(r => r.data.data),
  update: (id: string, b: Partial<ClinicInput>) => api.patch(ENDPOINTS.doctor.clinic(id), b).then(r => r.data.data),
  remove: (id: string) => api.delete(ENDPOINTS.doctor.clinic(id)).then(r => r.data.data),
  getAvailability: (id: string) => api.get(ENDPOINTS.doctor.clinicAvailability(id)).then(r => r.data.data),
  setAvailability: (id: string, slots: WeeklySlot[]) => api.put(ENDPOINTS.doctor.clinicAvailability(id), { slots }).then(r => r.data.data),
  getOnline: () => api.get(ENDPOINTS.doctor.onlineAvailability).then(r => r.data.data),
  setOnline: (slots: WeeklySlot[]) => api.put(ENDPOINTS.doctor.onlineAvailability, { slots }).then(r => r.data.data),
  listExceptions: () => api.get(ENDPOINTS.doctor.exceptions).then(r => r.data.data),
  addException: (b: { clinicId: string | null; exceptionDate: string; reason?: string }) => api.post(ENDPOINTS.doctor.exceptions, b).then(r => r.data.data),
  removeException: (id: string) => api.delete(ENDPOINTS.doctor.exception(id)).then(r => r.data.data),
};
```

---

## 5. Hooks — `src/features/doctor/hooks/` 🔵

React Query, exact pattern of the existing `useAwards`/`useSetSpecializations` (mutation + `sonner` toast + `getErrorMessage`), keyed by `constants/queryKeys.ts` 🟡.

| Hook | Behavior |
|---|---|
| `useClinics` | `useQuery(['doctor','clinics'])`. |
| `useCreateClinic` / `useUpdateClinic` / `useRemoveClinic` | mutations → invalidate `['doctor','clinics']` **and** `['doctor','onboarding']` (clinics is now a gated step). |
| `useClinicAvailability(id)` | list + `useSetClinicAvailability(id)` (PUT-replace) → invalidate clinics + onboarding. |
| `useOnlineAvailability` | list + `useSetOnlineAvailability` → invalidate `['doctor','onlineAvailability']` + onboarding. |
| `useExceptions` | list + add + remove. |

**Every mutation invalidates `['doctor','onboarding']`** so the wizard progress + Submit button stay truthful — the same discipline the onboarding hooks already follow.

---

## 6. Zod schemas — `src/features/doctor/schemas/clinic.ts` 🔵

Mirror the backend Joi so both sides reject the same shapes:

```ts
export const clinicSchema = z.object({
  name: requiredString("Clinic name").max(150),
  addressLine: requiredString("Address").max(255),
  city: z.string().max(100).optional(), state: z.string().max(100).optional(), pincode: z.string().max(20).optional(),
  lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180),
  phone: z.string().max(20).optional(),
  offlineFee: z.coerce.number().min(0),
});
export const weeklySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime:   z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  slotDurationMinutes: z.coerce.number().int().min(5).max(240).default(15),
}).refine(s => s.endTime > s.startTime, { message: "End must be after start", path: ["endTime"] });
export const availabilitySchema = z.object({ slots: z.array(weeklySlotSchema).max(50) });
```

---

## 7. Components 🔵 (`features/doctor/components/`)

| Component | Role |
|---|---|
| `ClinicLocationPicker(Inner)` 🔵 | Leaflet/OSM search + draggable pin → emits `PickedLocation { addressLine, city, state, pincode, lat, lng }` (§2). No API key. |
| `ClinicForm` 🔵 | `clinicSchema` + `RHFTextField`s + `ClinicLocationPicker` + fee **+ an embedded `WeeklyScheduleEditor`** so a clinic **and its weekly hours are added in one dialog** (see §8.0). |
| `ClinicCard` 🔵 | One clinic in the list: name, address, fee, day chips, edit/delete. |
| `WeeklyScheduleEditor` 🔵 | The reused core: 7-day grid; per active day a start/close/slot-duration row (native `type="time"`). **Two modes** (see below). Drives clinic hours (embedded in the form + the Availability tabs) and online hours. |
| `ExceptionsEditor` 🔵 | Date list of blocked days (optionally per clinic) — lives inside `AvailabilityStep`. |

`WeeklyScheduleEditor` is the workhorse — one component, three mount points (embedded in the clinic dialog, a clinic tab on the Availability page, and the online tab). Two modes:
- **Standalone** — pass `onSave(slots)`: renders its own "Save schedule" button that PUT-replaces the week (used by the Availability-page tabs).
- **Embedded** — pass `onChange(slots)`, omit `onSave`: no button; emits the payload on every edit so the parent form saves it as part of its own submit (used by `ClinicForm`).

---

## 8. Screens

### 8.0 Add-a-clinic dialog = clinic **+ hours** in one place ✅ IMPLEMENTED

`ClinicForm` is the single place a doctor adds a location and its schedule together:
- Identity (name, phone, in-clinic fee) + the **map picker** (search → pin → auto-filled address/city/state/pincode/lat/lng, §2).
- An **embedded `WeeklyScheduleEditor`** ("Weekly consulting hours") — tick the days, set open/close + slot length.
- **Submit chains two writes:** the clinic is saved first (`create`/`update` → returns the row with its id), then — only if the hours were touched — `setClinicAvailability(savedClinic.id, slots)` PUT-replaces that clinic's week. Errors keep the dialog open (the mutation hooks toast). Button shows a single spinner across both writes.
- The dialog is **remounted per open** (`key` on `ClinicsStep`) so the embedded editor + local hours state start fresh each time.

> Because a brand-new clinic has no id until it's created, hours can't be sent in the same request — the two-step chain is deliberate. The separate Availability page (§8.2) still lets a doctor revise any clinic's hours later.

### 8.1 Wizard steps — `app/(dashboard)/dashboard/onboarding/page.tsx` 🟡

The three disabled "coming next" tiles become real steps (the tiles' `disabled` came from `status.steps.* === null`; the backend now sends booleans):

5. **Clinics** — `ClinicsStep` 🔵: `useClinics` list of `ClinicCard`s + "Add clinic" → the `ClinicForm` dialog (which now captures hours too, §8.0). Step complete when ≥1 active clinic (mirrors `steps.clinics`) — and because the form also sets hours, `availability` typically completes in the same action.
6. **Availability** — `AvailabilityStep` 🔵: a `WeeklyScheduleEditor` per clinic (tabbed by clinic) **plus** an "Online / Video" tab + `ExceptionsEditor`. Step complete when any window exists (mirrors `steps.availability`). Use this to add online/video hours or revise a clinic's hours after creation.
7. **Bank** — stays a disabled "coming next" tile (`steps.bank` still `null`; payments plan).

Footer **"Submit for verification"** now enables only at all six required steps (`canSubmit`); backend re-checks on submit.

### 8.2 Dashboard managers — replace placeholders 🟡

- `app/(dashboard)/dashboard/clinics/page.tsx` — the full Clinics manager (same `ClinicsStep` content, flat, not wizard-framed) so an approved doctor edits locations anytime.
- `app/(dashboard)/dashboard/availability/page.tsx` — the full Availability manager (per-clinic + online editors + `ExceptionsEditor`).

Both sit inside the existing `DashboardShell`; the nav entries already exist.

### 8.3 Public profile 🟢 (no change)

`app/doctors/[slug]/page.tsx` + `DoctorProfile.tsx` already render `clinics[]` cards (with map pins) and a "Video Consult" card **conditionally on `onlineConsult`** — they were built against the reserved types and empty data. Once the backend serializer fills `clinics`/`onlineAvailability`, they render real data with **zero component change**. Verify the map pin renders from `clinic.lat/lng` and the "Book" CTAs point at the (future) booking flow.

---

## 9. Guard / redirect — `src/proxy.ts` 🟢

No change. The onboarding nudge is already soft and completeness-driven off `useOnboarding`; adding two required steps just changes how far the progress bar fills. Security stays the backend's job (`authorize('doctor')` + submit guard).

---

## 10. Dependencies

Add the Maps loader (`@vis.gl/react-google-maps`) 🟡. Everything else (`@mui/x-date-pickers`, RHF, zod, react-query, sonner) already in `package.json`.

---

## 11. Build order (frontend)

1. 🟡 `constants/api.ts` + `queryKeys.ts`; 🔵 `types/clinic.ts`.
2. 🔵 `clinic.service` + hooks + zod schemas.
3. 🔵 `WeeklyScheduleEditor` (build + test standalone first — it's reused), `ClinicForm`, `ClinicCard`, `ExceptionsEditor`.
4. 🔵 `ClinicLocationPicker` (manual-fallback first, then Maps §2).
5. 🔵 `ClinicsStep` + `AvailabilityStep`; un-disable the wizard tiles.
6. 🟡 replace the clinics + availability placeholder pages.
7. Verify the public profile renders real clinic/video cards; run `integration-plan.md` flows.

---

## 12. Frontend sanity flows

- **Add clinic → set hours:** wizard step 5 → "Add clinic" → pick address on map → save → clinic card appears → "Set hours" → weekly editor → save → onboarding `clinics` + `availability` flip; Submit enables (assuming steps 1–4 done).
- **Online only:** a doctor adds a clinic but sets **only** online hours → `availability` still completes (≥1 window rule).
- **Public render:** approved doctor → `/doctors/<slug>` shows a clinic card with a map pin + "Book Visit", and a "Video Consult" card iff online hours exist.
- **Maps fallback:** unset `NEXT_PUBLIC_GOOGLE_MAPS_KEY` → picker degrades to lat/lng fields; clinic still saves and renders.
