# Frontend — Doctor Registration & Portfolio

**App:** `frontend-doctor/` — Next.js 16 (App Router) + MUI + React Query + Axios + Zod + React Hook Form. TypeScript.

The auth scaffold is **done and wired to the real backend** (`services/api.ts` with refresh-on-401, `authService`, `useAuth`, `tokenStorage` at `utils/auth-token`, `proxy.ts` route guard, `features/auth/*`). Signup already collects only account basics and tells the doctor they'll "add specialty, registration number and clinics from your dashboard" (`RegisterForm.tsx`). **This plan builds exactly that dashboard flow** and swaps the public portfolio page off mock data.

**Legend:** 🟢 exists (reuse) · 🟡 exists (extend) · 🔵 new.

---

## 1. What already exists (reuse)

| Thing | File | Use |
|---|---|---|
| Axios + refresh-on-401 | `src/services/api.ts` 🟢 | All new requests ride the same instance/interceptor. |
| Token storage | `src/utils/auth-token.ts` 🟢 | Untouched. |
| Auth/session | `src/hooks/useAuth.ts`, `features/auth` 🟢 | `useAuth().user` gives role + id for the dashboard. |
| Route guard | `src/proxy.ts` 🟢 (Next 16 convention) | Gates `/dashboard/*`. Extend for onboarding nudge (§7). |
| Form primitives | `components/forms/{FormContainer,RHFTextField}.tsx` 🟢 | Every step form uses these. |
| Dashboard shell | `features/dashboard/components/DashboardShell.tsx`, `nav.ts` 🟢 | Wizard + editor live inside it. |
| Placeholders to replace | `app/(dashboard)/dashboard/{clinics,availability,settings}/page.tsx` 🟡 | `settings` becomes the portfolio editor; clinics/availability wait for the next plan. |
| Public portfolio (mock) | `app/doctors/[slug]/page.tsx`, `features/doctors/*`, `features/doctors/services/doctor.service.ts` 🟡 | Swap mock → API (§5). |
| Types | `types/doctor.ts` 🟢 (`Doctor`, `DoctorDetail`, `Clinic`, `Review`…) | Backend `serializePublicDoctor` targets these — reuse as-is. |
| Uploads / dates | `react-dropzone`, `@mui/x-date-pickers`, `react-pdf` 🟢 (already in `package.json`) | Document dropzone + previews. |

---

## 2. Constants, routes, types

**🟡 `src/constants/api.ts`** — add a `doctor` + `catalog` block (mirrors backend `README §4`):

```ts
doctor: {
  onboarding: "/doctor/onboarding",
  profile: "/doctor/profile",
  specializations: "/doctor/specializations",
  languages: "/doctor/languages",
  awards: "/doctor/awards",
  links: "/doctor/links",
  keywords: "/doctor/keywords",
  documents: "/doctor/documents",
  document: (id: string) => `/doctor/documents/${id}`,
  photo: "/doctor/photo",
  submit: "/doctor/submit",
},
catalog: { specializations: "/specializations", languages: "/languages" },
// doctors.byId already exists for the public page
```

**🟡 `src/constants/routes.ts`** — add the wizard route under the dashboard:
```ts
dashboard: { ...existing, onboarding: "/dashboard/onboarding", profile: "/dashboard/settings" }
```

**🔵 `src/types/doctor-portfolio.ts`** — the doctor's *own* editable shapes (distinct from the public `Doctor`):
```ts
export interface OnboardingStatus {
  steps: { professional: boolean; specialties: boolean; portfolio: boolean; documents: boolean;
           clinics: boolean | null; availability: boolean | null; bank: boolean | null };
  canSubmit: boolean; isSubmitted: boolean;
  verificationStatus: "pending" | "approved" | "rejected"; verificationNotes: string | null;
}
export interface DoctorAward { id: string; title: string; description?: string; awardYear?: number }
export interface DoctorLink  { id: string; linkType: "website"|"linkedin"|"instagram"|"youtube"|"other"; url: string }
export interface DoctorKeyword { id: string; keyword: string; weight: number }
export interface DoctorDocument { id: string; docType: "degree_certificate"|"id_proof"|"council_registration"|"other"; fileUrl: string; uploadedAt: string }
export interface OwnDoctorProfile { /* full draft: profile fields + specializations[], languages[], awards[], links[], documents[], keywords[] */ }
export interface Specialization { id: number; name: string; slug: string }
export interface Language { id: number; name: string }
```

---

## 3. Services — `src/features/doctor/services/doctor-profile.service.ts` 🔵

Talk HTTP only, off the shared `api` instance. Mirror the `authService` style.

```ts
export const doctorProfileService = {
  getOnboarding: () => api.get<ApiResponse<OnboardingStatus>>(ENDPOINTS.doctor.onboarding).then(r => r.data.data),
  getProfile:    () => api.get<ApiResponse<OwnDoctorProfile>>(ENDPOINTS.doctor.profile).then(r => r.data.data),
  updateProfile: (p: ProfessionalInput) => api.patch(...).then(r => r.data.data),
  setSpecializations: (specializationIds: number[]) => api.put(ENDPOINTS.doctor.specializations, { specializationIds })...,
  setLanguages:       (languageIds: number[]) => api.put(...)...,
  addAward / removeAward, addLink / removeLink, addKeyword / removeKeyword,
  listDocuments, uploadDocument: (docType, file) => { const fd = new FormData(); fd.append("docType", docType); fd.append("file", file);
      return api.post(ENDPOINTS.doctor.documents, fd).then(r => r.data.data); },
  removeDocument, uploadPhoto: (file) => { const fd = new FormData(); fd.append("file", file); return api.post(ENDPOINTS.doctor.photo, fd)...; },
  submit: () => api.post(ENDPOINTS.doctor.submit).then(r => r.data.data),
};
// catalog.service.ts 🔵: getSpecializations(), getLanguages() off /specializations, /languages
```

> Multipart: pass the `FormData` straight to axios and **do not** set `Content-Type` manually — the browser adds the boundary. The interceptor's auth header still attaches.

---

## 4. Hooks — `src/features/doctor/hooks/` 🔵

React Query, following the exact pattern of `features/auth/hooks/useLogin.ts` (`useMutation` + `sonner` toast + `getErrorMessage`), keyed by `constants/queryKeys.ts` 🟡.

| Hook | Behavior |
|---|---|
| `useOnboarding` | `useQuery(['doctor','onboarding'])` — drives the wizard + the dashboard nudge. |
| `useOwnProfile` | `useQuery(['doctor','profile'])`. |
| `useUpdateProfessional` | mutation → on success invalidate `['doctor','profile']` + `['doctor','onboarding']`. |
| `useSetSpecializations` / `useSetLanguages` | same invalidation. |
| `useAwards` / `useLinks` / `useKeywords` | list + add + remove mutations, optimistic where cheap. |
| `useDocuments` | list + `useUploadDocument` + `useRemoveDocument`. |
| `useUploadPhoto` | on success also `setUser({...user, avatarUrl})` so the navbar avatar updates live. |
| `useSubmitForVerification` | on success invalidate onboarding + toast "Submitted for review"; on `422 ONBOARDING_INCOMPLETE` surface which steps. |
| `useCatalog` | `useQuery(['catalog','specializations'|'languages'])`, `staleTime: Infinity` (rarely changes). |

Every mutation invalidates `['doctor','onboarding']` so the completeness UI stays truthful.

---

## 5. Zod schemas — `src/features/doctor/schemas/index.ts` 🔵

One schema per step form, matching the backend Joi validators (so both sides reject the same shapes):

```ts
export const professionalSchema = z.object({
  qualification: requiredString("Qualification").max(255),
  registrationNumber: requiredString("Registration number").max(100),
  experienceYears: z.coerce.number().int().min(0).max(80),
  bio: z.string().max(5000).optional().or(z.literal("")),
  onlineFee: z.coerce.number().min(0).optional(),
});
export const awardSchema   = z.object({ title: requiredString("Title").max(255), description: z.string().max(500).optional(), awardYear: z.coerce.number().int().min(1950).max(2100).optional() });
export const linkSchema     = z.object({ linkType: z.enum(["website","linkedin","instagram","youtube","other"]), url: z.string().url() });
export const keywordSchema  = z.object({ keyword: requiredString("Keyword").max(150), weight: z.coerce.number().int().min(1).max(5).default(1) });
```

Specialties/languages are id-array selects (validated by "≥1 selected" in the component), not a text schema.

---

## 6. Screens

### 6.1 Onboarding wizard — `app/(dashboard)/dashboard/onboarding/page.tsx` 🔵

A **completeness-driven stepper** (MUI `Stepper`), NOT a stored cursor. Reads `useOnboarding()`, renders a left rail of steps with a check/incomplete state per `status.steps`, and opens the first incomplete step. Steps in scope:

1. **Professional details** — `ProfessionalStep` 🔵 (`professionalSchema` + `RHFTextField`s).
2. **Specialties & languages** — `SpecialtiesStep` 🔵 (MUI `Autocomplete` multi-select fed by `useCatalog`; PUT-replace on save).
3. **Portfolio** — `PortfolioStep` 🔵 (bio + `PhotoUpload` + repeatable **Awards**/**Links**/**Keywords** list editors).
4. **Documents** — `DocumentsStep` 🔵 (three labelled `react-dropzone` dropzones: degree / ID / council; show uploaded file chips with `react-pdf`/image thumbnail + remove).
5–7. **Clinics / Availability / Bank** — render a disabled "Coming next" tile linking to the deferred pages (their step screens ship in `docs-shared/feature-plans/clinics-availability/`).

Footer: a **"Submit for verification"** button, enabled only when `status.canSubmit`, calling `useSubmitForVerification`. If the backend 422s with incomplete steps, scroll to the first offending step.

Reusable pieces in `features/doctor/components/` 🔵: `StepShell`, `PhotoUpload`, `DocumentDropzone`, `RepeatableList` (drives awards/links/keywords), `VerificationBanner`.

### 6.2 Portfolio editor — `app/(dashboard)/dashboard/settings/page.tsx` 🟡 (replace placeholder)

Same step components, but flat (tabs/sections instead of a wizard) so an approved doctor can edit any part anytime. Add a **`VerificationBanner`** at the top:
- `pending` + `!isSubmitted` → "Finish onboarding" CTA → `/dashboard/onboarding`.
- `pending` + `isSubmitted` → "Under review".
- `rejected` → show `verificationNotes` + "Update & resubmit".
- `approved` → "Live" + link to public profile (`/doctors/<slug>`).

### 6.3 Dashboard home nudge — `app/(dashboard)/dashboard/page.tsx` 🟡

If `useOnboarding().status` is incomplete, show a progress card (`n/4 steps`) linking to the wizard. This is the doctor's landing after signup.

---

## 7. Guard / redirect — `src/proxy.ts` 🟡

Current guard gates `/dashboard/*` by session. Extend: a freshly-signed-up doctor who hasn't submitted should be nudged (not hard-locked) toward `/dashboard/onboarding`. Keep it soft — a query-driven client redirect in the dashboard layout is friendlier than a middleware wall (they may want to browse first). **Security is the backend's job** (`authorize('doctor')` + the submit guard); this is pure UX. Do not gate on completeness in `proxy.ts`.

---

## 8. Public portfolio — swap mock → API (🟡 `features/doctors/services/doctor.service.ts`)

Today `getDoctorDetail(slug)` reads `data/doctors.json` + `buildDoctorDetail`. Swap the body to `api.get(ENDPOINTS.doctors.byId(slug))` → `serializePublicDoctor` shape (backend already targets the `DoctorDetail` type, §1). Keep the signature identical so `app/doctors/[slug]/page.tsx` and `DoctorProfile.tsx` need **no change**. Clinics/availability arrays arrive `[]` until the next plan — `DoctorProfile.tsx` already renders those sections conditionally, so an empty array degrades gracefully. Feed the discovery filters' specialty list from `useCatalog` instead of the static JSON.

> Keep the mock dataset importable behind an env flag during the transition so the public pages don't go blank before the backend read path is deployed.

---

## 9. Dependencies

Everything needed is already in `package.json` (`react-dropzone`, `@mui/x-date-pickers`, `react-pdf`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `sonner`). **Nothing to add.**

---

## 10. Build order (frontend)

1. 🟡 `constants/api.ts` + `routes.ts` + `queryKeys.ts`; 🔵 `types/doctor-portfolio.ts`.
2. 🔵 `catalog.service` + `doctor-profile.service`; 🔵 hooks; 🔵 schemas.
3. 🔵 reusable components (`StepShell`, `PhotoUpload`, `DocumentDropzone`, `RepeatableList`, `VerificationBanner`).
4. 🔵 the four in-scope step screens.
5. 🔵 onboarding wizard page + 🟡 dashboard-home nudge.
6. 🟡 settings → portfolio editor with the verification banner.
7. 🟡 swap public `doctor.service.ts` mock → API; feed discovery specialties from `/specializations`.
8. Manual pass against `integration-plan.md` end-to-end flows.

---

## 11. Frontend sanity flows

- **Complete onboarding:** signup (role=doctor) → dashboard nudge → wizard: professional → specialties/languages → bio+photo+awards → 3 documents → "Submit" enables → submit → banner "Under review".
- **Rejected → resubmit:** admin rejects with notes → banner shows notes → doctor edits → resubmit.
- **Approved → live:** admin approves → banner "Live" → `/doctors/<slug>` renders the real profile (specialties, languages, awards, links, reviews; clinics/availability empty for now).
- **Live avatar:** upload photo → navbar avatar updates immediately (via `setUser`).
