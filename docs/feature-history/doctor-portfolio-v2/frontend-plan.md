# Frontend — Doctor Portfolio v2 (`frontend-doctor/`)

**Stack:** Next.js (App Router) + MUI + React Hook Form + Zod + TanStack Query + axios. Two surfaces:
1. **Editor** — the onboarding wizard + dashboard portfolio editor where a doctor fills the sections.
2. **Public page** — the read-only `/doctors/[slug]` profile that goes live after approval.

Read `README.md` + `backend-plan.md` first. **Legend:** 🟢 exists · 🟡 extend · 🔵 new. Everything copies patterns already in the repo — `PortfolioStep.tsx` (repeatable editors), `hooks/index.ts` (`useAwards`), `doctor-profile.service.ts`, and `DoctorProfile.tsx` (public page).

---

## 1. Types 🟡

**`src/types/doctor-portfolio.ts`** (own draft — mirrors `serializeDoctorProfile`): add the section item types + extend `OwnDoctorProfile`.

```ts
export interface DoctorEducation { id: string; degree: string; institution: string; fieldOfStudy?: string | null; yearFrom?: number | null; yearTo?: number | null; displayOrder: number; }
export interface DoctorExperience { id: string; organization: string; roleTitle: string; startYear: number; endYear?: number | null; isCurrent: boolean; description?: string | null; displayOrder: number; }
export interface DoctorService { id: string; name: string; description?: string | null; displayOrder: number; }
export interface DoctorPublication { id: string; title: string; publisher?: string | null; year?: number | null; url?: string | null; displayOrder: number; }
export interface DoctorMembership { id: string; organization: string; roleTitle?: string | null; sinceYear?: number | null; displayOrder: number; }
export interface DoctorGalleryImage { id: string; imageUrl: string; caption?: string | null; displayOrder: number; }
export interface DoctorFaq { id: string; question: string; answer: string; displayOrder: number; }
export interface Insurance { id: number; name: string; }
export type Gender = "male" | "female" | "other";

// extend OwnDoctorProfile:
export interface OwnDoctorProfile {
  /* …existing… */
  headline: string | null;
  gender: Gender | null;
  practicePhilosophy: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  education: DoctorEducation[];
  experience: DoctorExperience[];
  services: DoctorService[];
  publications: DoctorPublication[];
  memberships: DoctorMembership[];
  gallery: DoctorGalleryImage[];
  faqs: DoctorFaq[];
  insurances: Insurance[];
}
```

**`src/types/doctor.ts`** (public — `DoctorDetail`) 🟡: extend so the public page can render the new sections. `EducationEntry` already exists. Add:

```ts
export interface DoctorDetail extends Doctor {
  clinics: Clinic[];
  onlineAvailability: OnlineAvailability;
  reviews: Review[];
  // ── v2 portfolio ──
  headline?: string;
  practicePhilosophy?: string;
  experience?: DoctorExperience[];   // reuse shapes (or a public-lite copy)
  services?: DoctorService[];
  publications?: DoctorPublication[];
  memberships?: DoctorMembership[];
  gallery?: DoctorGalleryImage[];
  faqs?: DoctorFaq[];
  insurances?: string[];             // provider names
  publicPhone?: string | null;
  publicEmail?: string | null;
}
```

> The `gender` field on `Doctor` is currently `"male" | "female"` — widen to include `"other"` (matches the backend enum) or map `"other"→"male"` in the serializer. Recommend widening the type.

---

## 2. Constants 🟡

- **`src/constants/api.ts`** — add endpoint builders for `education`, `experience`, `services`, `publications`, `memberships`, `gallery`, `faqs` (list/create at `/doctor/<key>`, item at `/doctor/<key>/:id`), `/doctor/insurances`, and public `/insurances`. Follow the existing award/link keys.
- **`src/constants/queryKeys.ts`** — add `doctor.education()`, `.experience()`, … and `catalog.insurances()`.

---

## 3. Schemas — `src/features/doctor/schemas/index.ts` 🟡 (Zod)

Mirror the Joi validators. Numeric fields stay STRINGS (RHF/MUI produce strings), validated by refinement, converted in the service — same convention as `awardSchema`/`clinicSchema`.

```ts
export const educationSchema = z.object({
  degree: requiredString("Degree").max(150),
  institution: requiredString("Institution").max(200),
  fieldOfStudy: z.string().max(150).optional().or(z.literal("")),
  yearFrom: optionalIntField("Year", 1950, 2100),
  yearTo: optionalIntField("Year", 1950, 2100),
});
export const experienceSchema = z.object({
  organization: requiredString("Organization").max(200),
  roleTitle: requiredString("Role").max(150),
  startYear: intField("Start year", 1950, 2100),
  endYear: optionalIntField("End year", 1950, 2100),
  isCurrent: z.boolean().optional(),
  description: z.string().max(500).optional().or(z.literal("")),
});
export const serviceSchema     = z.object({ name: requiredString("Service").max(150), description: z.string().max(500).optional().or(z.literal("")) });
export const publicationSchema  = z.object({ title: requiredString("Title").max(300), publisher: z.string().max(200).optional().or(z.literal("")), year: optionalIntField("Year", 1950, 2100), url: z.string().url().max(300).optional().or(z.literal("")) });
export const membershipSchema   = z.object({ organization: requiredString("Organization").max(200), roleTitle: z.string().max(150).optional().or(z.literal("")), sinceYear: optionalIntField("Year", 1950, 2100) });
export const faqSchema          = z.object({ question: requiredString("Question").max(300), answer: requiredString("Answer").max(1000) });

// hero/about/contact — extend the professional form OR a small heroSchema
export const heroSchema = z.object({
  headline: requiredString("Tagline").max(160),
  gender: z.enum(["male", "female", "other"]),
  practicePhilosophy: z.string().max(1000).optional().or(z.literal("")),
  publicPhone: z.string().max(20).optional().or(z.literal("")),
  publicEmail: z.string().email().max(190).optional().or(z.literal("")),
});
export type EducationInput = z.infer<typeof educationSchema>; /* …etc… */
```

---

## 4. Services — `src/features/doctor/services/doctor-profile.service.ts` 🟡

Add methods mirroring the award/link CRUD. Convert numeric strings → numbers before POST (drop empty optionals). Add a `catalogService.getInsurances()` 🟡.

```ts
// generic-ish, one trio per resource
listEducation:   () => api.get(API.doctor.education).then(unwrap),
addEducation:    (input) => api.post(API.doctor.education, toEducationPayload(input)).then(unwrap),
updateEducation: (id, patch) => api.patch(API.doctor.educationItem(id), toEducationPayload(patch)).then(unwrap),
removeEducation: (id) => api.delete(API.doctor.educationItem(id)).then(unwrap),
// …experience / services / publications / memberships / faqs identically…
listGallery:  () => api.get(API.doctor.gallery).then(unwrap),
addGallery:   (file, caption) => { const fd = new FormData(); fd.append("file", file); if (caption) fd.append("caption", caption); return api.post(API.doctor.gallery, fd).then(unwrap); },
removeGallery:(id) => api.delete(API.doctor.galleryItem(id)).then(unwrap),
setInsurances:(ids) => api.put(API.doctor.insurances, { insuranceIds: ids }).then(unwrap),
// hero/about/contact reuse the existing updateProfile(patch) — just more keys
```

> `updateProfile` already exists and PATCHes `/doctor/profile`; the hero/about/contact fields ride it unchanged (they're new keys on the same body).

---

## 5. Hooks — `src/features/doctor/hooks/index.ts` 🟡

One hook per resource, a straight copy of `useAwards` (list query + add/remove/update mutations, each calling `useProfileInvalidation()` so the onboarding checklist + completeness % refresh). Because **education/services/experience now gate submit**, their mutations MUST invalidate `['doctor','onboarding']` (the shared `useProfileInvalidation` already does).

```ts
export function useEducation() {
  const invalidate = useProfileInvalidation();
  const list = useQuery({ queryKey: queryKeys.doctor.education(), queryFn: () => doctorProfileService.listEducation() });
  const add    = useMutation({ mutationFn: (i: EducationInput) => doctorProfileService.addEducation(i), onSuccess: () => { invalidate(); list.refetch(); toast.success("Education added"); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const update = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<EducationInput> }) => doctorProfileService.updateEducation(id, patch), onSuccess: () => { invalidate(); list.refetch(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const remove = useMutation({ mutationFn: (id: string) => doctorProfileService.removeEducation(id), onSuccess: () => { invalidate(); list.refetch(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  return { list, add, update, remove };
}
// useExperience, useServices, usePublications, useMemberships, useFaqs — identical.
// useGallery (upload/remove), useInsurances (list catalog + set), useHero (reuses useUpdateProfessional-style mutation).
```

---

## 6. Editor UI

### 6.1 A reusable `RepeatableSection` 🔵 — `src/features/doctor/components/RepeatableSection.tsx`

The 6 simple sections are the same UI: a titled list of rows with a delete (and optional edit), plus an inline add-form. Extract ONE generic component instead of six copies (the current `PortfolioStep` has three hand-rolled copies — this replaces that duplication).

```tsx
type RepeatableSectionProps<T, I> = {
  title: string;
  hint?: string;
  required?: boolean;                 // shows a "required" chip when the list is empty
  items: T[];
  renderRow: (item: T) => React.ReactNode;   // the read display (+ its own delete button)
  form: UseFormReturn<I>;             // RHF methods
  onAdd: (values: I) => void;
  addLabel: string;
  children: React.ReactNode;          // the RHFTextField grid for the add-form
};
```

It renders: heading (+ required chip if empty), the mapped rows, then a `FormContainer` wrapping `children` and an "Add" button — exactly the `AwardsEditor` shape, parameterized.

### 6.2 Section managers 🔵

Thin wrappers binding a hook + schema + fields to `RepeatableSection`:

| Component | Hook | Schema | Fields in the add-form |
|---|---|---|---|
| `EducationEditor` | `useEducation` | `educationSchema` | degree, institution, fieldOfStudy, yearFrom, yearTo |
| `ExperienceEditor` | `useExperience` | `experienceSchema` | organization, roleTitle, startYear, endYear, isCurrent (switch), description |
| `ServicesEditor` | `useServices` | `serviceSchema` | name, description |
| `PublicationsEditor` | `usePublications` | `publicationSchema` | title, publisher, year, url |
| `MembershipsEditor` | `useMemberships` | `membershipSchema` | organization, roleTitle, sinceYear |
| `FaqEditor` | `useFaqs` | `faqSchema` | question, answer (multiline) |
| `GalleryEditor` 🔵 | `useGallery` | — | dropzone (reuse `DocumentDropzone` pattern) + caption; renders a thumbnail grid |
| `InsuranceEditor` 🔵 | `useInsurances` | — | MUI multi-select `Autocomplete` off `catalog.insurances`, calls `setInsurances(ids)` |

### 6.3 Wire into the wizard/editor 🟡

- **`steps/PortfolioStep.tsx`** — add the new editors after the existing photo/awards/links/keywords, grouped with dividers:
  `PhotoUpload → EducationEditor(required) → ExperienceEditor(required) → ServicesEditor(required) → PublicationsEditor → MembershipsEditor → GalleryEditor → FaqEditor → InsuranceEditor → AwardsEditor → LinksEditor → KeywordsEditor`.
- **`steps/ProfessionalStep.tsx`** 🟡 — add the **hero/about/contact** fields (`headline`, `gender` select, `practicePhilosophy`, `publicPhone`, `publicEmail`) to the existing professional form (they PATCH the same `/doctor/profile`). These + bio + photo + the three required lists are what flips `portfolio: true`.
- **`PortfolioEditor.tsx`** 🟢 — no structural change; it already renders `<PortfolioStep>` inside a `StepShell` whose `complete` comes from `status.steps.portfolio`, which now reflects the richer predicate automatically.
- Register all new components in `features/doctor/components/index.ts` 🟡.

### 6.4 Completeness affordance 🟡 (nice-to-have)

Since optional sections count toward a "profile completeness %", `OnboardingNudge`/`VerificationBanner` can show e.g. "8/12 sections filled". Compute client-side from `OwnDoctorProfile` array lengths; purely cosmetic (the gate stays server-authoritative).

---

## 7. Public portfolio page — `src/features/doctors/components/DoctorProfile.tsx` 🟡

This is the headline deliverable: the page an **approved** doctor's patients see. It already renders header/about/education/reviews/clinics off `DoctorDetail`. Extend it to a full portfolio. Keep the two-column layout (main + sticky booking sidebar); add sections in the main column, gated by presence so a sparse profile still looks clean.

**Main column order (each section renders only if it has data):**
1. `ProfileHeader` 🟡 — add the **headline/tagline** under the specialty; show `gender`-aware avatar; keep meta chips (exp · city · languages).
2. **Book a consultation** 🟢 (video + clinic cards) — unchanged.
3. **About** 🟡 — `about` + a "Philosophy of care" paragraph from `practicePhilosophy`.
4. **Services & procedures** 🔵 — chip/grid of `services` (name + optional description tooltip).
5. **Experience** 🔵 — a career timeline (reuse the `EducationTimeline` visual): `roleTitle @ organization · startYear–(endYear|"Present")`.
6. **Education & credentials** 🟡 — the existing timeline, now fed by real structured `education`.
7. **Publications & research** 🔵 — list with external-link icons (`url`).
8. **Awards & memberships** 🔵 — two-column list (awards 🟢 + memberships 🔵).
9. **Gallery** 🔵 — responsive image grid (MUI `ImageList`), lightbox optional.
10. **Insurance accepted** 🔵 — chips of provider names.
11. **FAQ** 🔵 — MUI `Accordion` of `faqs`.
12. **Contact** 🔵 — a card with `publicPhone`/`publicEmail` (if present) + the social `links`.
13. **Location** 🟢 (`ClinicLocations` map) + **Reviews** 🟢 — unchanged.

**Sidebar** 🟢 — fee + rating + booking buttons + "Reg. no. … · verified". Optionally add a compact "Insurance" or "Languages" summary.

Each new section is a small local component (like the existing `EducationTimeline`, `ReviewsSection`), reading from `doctor.*`. Guard with `doctor.services?.length` etc. Use the existing `Paper variant="outlined"` cards, `Typography variant="h5"` headings, and theme tokens for visual consistency — do not introduce a new design language.

> **Data source:** the page already flows through `useDoctorDetail(slug)` → the public API → `serializePublicDoctor`. Once the serializer (backend §7) emits the new fields, the only frontend work is rendering them. No mock data — the doctor app's public read is already wired to the API in the doctor-onboarding plan.

---

## 8. Build order (frontend)

1. 🟡 types (both files) → 🟡 api.ts + queryKeys.
2. 🟡 schemas → 🟡 service methods + catalog insurances.
3. 🟡 hooks (one per resource).
4. 🔵 `RepeatableSection` → 🔵 the 8 editors → 🟡 wire into `PortfolioStep` + `ProfessionalStep`.
5. 🟡 the public `DoctorProfile.tsx` sections.
6. Manual pass: fill every section as a doctor → submit unlocks only when the core is complete → (admin approve) → view the public page showing everything.

---

## 9. Testing checklist (frontend)

- [ ] Each editor: add → row appears; delete → gone; both refetch the list and re-fetch onboarding (the completeness chip updates live).
- [ ] Leaving education/services/experience empty keeps **Submit** disabled; filling one of each + hero/contact enables it (mirrors the server gate).
- [ ] Gallery: drag an image → thumbnail appears; oversize/wrong-type rejected client-side; delete removes it.
- [ ] Insurance multi-select saves and reloads the selected set.
- [ ] Number fields accept only valid ranges (zod refinements); optional years can be blank.
- [ ] Public page: an approved doctor with all sections renders each block; a doctor with only the required core renders cleanly (optional blocks hidden, no empty headings).
- [ ] `gender: "other"` renders without a type error; headline shows in the hero.
- [ ] No layout shift/overflow on mobile; sticky sidebar behaves as before.
