# State Management and Data Fetching

There is no global client store (no Redux/Zustand). State is split into four kinds:

| Kind | Tool | Where |
|---|---|---|
| Server state (everything from the API) | TanStack Query v5 | `features/*/hooks`, `constants/queryKeys.ts`, `providers/query-client.ts` |
| Session / current user | React Context (`AuthContext`) | `providers/AuthProvider.tsx`, `hooks/useAuth.ts` |
| Form state | React Hook Form + Zod | `features/*/schemas`, `components/forms` |
| UI-local state | `useState` / `useReducer` / `useSyncExternalStore` | components; URL search params for deep links |

## 1. React Query configuration (`providers/query-client.ts`)

| Option | Value | Reason (from code comments) |
|---|---|---|
| `staleTime` | 30 s | the other side of a consultation is a different browser (patient books, doctor prescribes); short window keeps tab switches honest |
| `gcTime` | 5 min | |
| `refetchOnWindowFocus` | true | previously `false`, which forced hard reloads to see new bookings/prescriptions |
| `refetchOnReconnect` | true | |
| `retry` | none on 401/403/404/429; otherwise up to 2 | 429 retries only refill the rate-limit bucket |
| mutations `retry` | false | |

`getQueryClient()` returns a fresh client per server request and a singleton in the browser. Devtools render only when `NODE_ENV === "development"`.

Overrides: analytics hooks use `staleTime` 30 s for money-related and 60 s for others; EMR catalog 1 hour; `NotificationBell` unread count `refetchInterval: 60_000` (not in background) with `staleTime` 30 s, latest list fetched only when the dropdown opens (`enabled: !!anchor`, `staleTime` 15 s).

## 2. Query keys (`constants/queryKeys.ts`)

Hierarchical factories so a mutation can invalidate a whole prefix. Groups present: `doctors`, `specialties`, `symptoms`, `states`, `doctor` (profile, onboarding, preview, awards, testimonials, links, keywords, documents, education ..., gallery, clinics, onlineAvailability, exceptions, paymentQr), `followUps`, `appointments`, `video`, `dashboard`, `earnings`, `prescriptionTemplates`, `prescriptions`, `medicines`, `referrals`, `catalog`, `search`. EMR hooks use their own local `emrKeys`. Some keys are inline arrays (`["doctor", "slots", ...]`, `["doctor", "timeline"]`, `["doctor", "my-patients"]`, `["doctor", "notifications", ...]`).

### Invalidation examples (verified in hooks)

| Mutation | Invalidates |
|---|---|
| `useMarkPaid` | appointments (all + detail), dashboard, earnings |
| `useRescheduleAppointment` | appointments (all + detail), `["doctor","slots"]`, dashboard |
| `useCompleteAppointment` | appointments, dashboard, earnings, `["doctor","timeline"]`, `["doctor","my-patients"]` |
| follow-up status mutations | `followUps` and `appointments.all()` (a recoloured status must not stay stale on the board) |
| `useSaveSpecialties` | sets profile cache from response, then invalidates profile/preview on settle |
| EMR add/update/retire | patient-scoped EMR keys (see `emr/hooks/index.ts`) |

## 3. Auth context

`AuthProvider` value: `{ user, isAuthenticated, isLoading, isReconnecting, setUser, logout }`. Bootstrap and reconnect logic are described in `AUTHENTICATION-AND-PERMISSIONS.md`. `logout` clears the Query cache so no data of the previous doctor survives in memory.

## 4. Forms

* **Pattern**: `useForm({ resolver: zodResolver(schema) })` + `FormContainer` (RHF `FormProvider` wrapper) + `RHFTextField` (generic MUI TextField bound to RHF). Zod 4 schemas are the source of truth; numeric inputs stay as strings and the service converts.
* **Schemas**: `features/auth/schemas` (login, register, OTP steps, reset, profile), `features/doctor/schemas` (professional, education, experience, affiliations, fellowships, expertise, services, publications, memberships, FAQ, awards, links, testimonials, gallery meta, clinic, availability, etc.), `schemas/common.schema.ts` (email/password/phone/required/list params).
* **Cross-field rules** use `superRefine` (year ordering: "End year can't be before the start year").
* **Autosave**: the letterhead `TemplateEditor` merges changes into a pending patch and flushes 800 ms after the last keystroke; `FollowUpPanel` debounces a typed date before saving.
* **Unsaved work registry** (`features/emr/components/UnsavedWork.tsx`): each workbench section reports typed-but-unsaved input with a `flush()`; "Save & Generate Prescription" flushes them all first, stops on the first failure and keeps the input on screen.

## 5. UI-local and URL state

| State | Mechanism |
|---|---|
| Sidebar pin | `localStorage` key `ihs.doctor.sidebarPinned` |
| Appointments board filters (range preset, mode, status, dates, search) | component state; `?appointment=<id>` opens a dialog |
| Analytics period | `useRangeState`; passed between pages via `?range=&from=&to=` |
| Workbench visit | `?bookingId=` on the patient page |
| My Patients view | `?view=timeline` |
| Wall clock on the board | `useSyncExternalStore` with a 30 s tick; server snapshot `0` to avoid hydration/time-zone mismatch |
| Onboarding/Editor step | `useState` seeded once to the first incomplete step ("adjust state while rendering" pattern, not an effect) |

## 6. Rules of thumb used in this codebase

1. Services never touch tokens or retry logic; the Axios instance does.
2. Hooks own toasts for mutation success/failure (`getErrorMessage`).
3. A mount-effect `mutate()` callback may not fire under React Strict Mode dev; the call page requests its video token through a mutation guarded by a `useRef` flag.
4. With React Compiler enabled, avoid non-null assertions on nullable state inside callbacks (the compiler reads them at render).
