# API Integration

All endpoint paths are relative to `NEXT_PUBLIC_API_URL` (which already includes `/api` in the example value) and are registered centrally in `src/constants/api.ts` (`API_ENDPOINTS`). Each domain has a `*.service.ts` that does HTTP only; hooks add caching. Methods below were read from those services. The backend counterparts were cross-checked by listing `backend/src/routes/*.js` (read-only) - route files exist for every `/doctor/*` group used here.

## 1. HTTP client (`src/services/api.ts`)

| Feature | Behaviour |
|---|---|
| Instance | `axios.create({ baseURL: env.apiUrl, headers: JSON, timeout: 20 000 })` |
| Auth header | `Authorization: Bearer <ihs_access_token>` from the cookie, on every request |
| FormData | JSON `Content-Type` removed so the browser sets the multipart boundary; timeout raised to 180 000 ms (a 20 s default made healthy phone uploads look like "server unreachable") |
| 401 handling | one refresh per burst (`isRefreshing` + `pendingQueue`), `refreshClient` (bare, 15 s) calls `POST /auth/refresh`, then the original request is replayed once (`_retry`) |
| Transport retry | methods `get, head, options, put, delete`; up to 2 retries; 400 ms * 2^n + <=200 ms jitter; only when `navigator.onLine`; never for POST/PATCH (would double-book / double-charge); never for HTTP 4xx/5xx |
| Helper | `requestData<T>(promise)` unwraps `response.data.data` |

### Envelopes

* Success: `{ success, message, data }` (`ApiResponse<T>` in `types/common.ts`).
* Failure: `{ error: { message, code, details } }`; `normalizeError` also accepts legacy `{ message }` / `{ errors }`. Status 0 maps to one of: offline, "took too long", cancelled, "Cannot reach the server".
* Codes the UI branches on: `WRONG_PORTAL` (login), `SMS_UNAVAILABLE` / `EMAIL_UNAVAILABLE` (OTP, shown verbatim).

## 2. Endpoints consumed

### 2.1 Auth (`services/auth.service.ts`)

| Method | Path | Used by |
|---|---|---|
| POST | `/auth/login` (+ `audience: "doctor"`) | LoginForm |
| POST | `/auth/register` | RegisterForm |
| POST | `/auth/google` | GoogleAuthButton |
| POST | `/auth/admin/login` | `AdminLoginForm` (no route renders it) |
| POST | `/auth/refresh` | Axios interceptor |
| POST | `/auth/logout` | logout |
| GET | `/auth/me` | AuthProvider bootstrap |
| PATCH | `/auth/profile` | `useUpdateProfile` (`SettingsView`, not routed) |
| POST | `/auth/forgot-password` | emailed-link fallback |
| POST | `/auth/forgot-password/otp` | OTP step 1 |
| POST | `/auth/forgot-password/otp/verify` | OTP step 2 -> `{ resetToken }` |
| POST | `/auth/reset-password` | `{ token, password }` |
| - | `/auth/change-password` | defined, never called |

### 2.2 Onboarding, profile, portfolio (`doctor/services/doctor-profile.service.ts`, `catalog.service.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/doctor/onboarding` | completeness checklist, `verificationStatus`, `canSubmit`, `isSubmitted` |
| GET / PATCH | `/doctor/profile` | own profile; update professional + hero/about/contact fields |
| GET | `/doctor/preview` | own profile in the public shape (any status) |
| PUT | `/doctor/specializations` `{ specializationIds }` | set specialties |
| PUT | `/doctor/sub-specializations` `{ subSpecializationIds }` | set sub-specialties |
| POST | `/doctor/catalog/sub-specializations` | "+ Add new sub-specialty" (find-or-create in shared catalog) |
| PUT | `/doctor/languages` `{ languageIds }` | languages |
| PUT | `/doctor/insurances` `{ insuranceIds }` | accepted insurances |
| GET/POST, PATCH/DELETE | `/doctor/awards`, `/doctor/awards/:id` | awards |
| POST / DELETE | `/doctor/awards/:id/image` | award image |
| list/add/update/remove | `/doctor/testimonials[/:id]`, POST/DELETE `/:id/photo`, PUT `/doctor/testimonials/order` | testimonials |
| GET/POST/DELETE | `/doctor/links[/:id]` | social/web links |
| GET/POST/DELETE | `/doctor/keywords[/:id]` | search keywords |
| GET/POST/DELETE | `/doctor/documents[/:id]` (multipart `docType`, `file`) | verification documents |
| POST | `/doctor/photo` | profile photo (returns user) |
| POST / DELETE | `/doctor/showcase-image` | "Why choose" picture |
| POST / DELETE | `/doctor/hero-images`, `/doctor/hero-images/:index` | up to 3 hero images (`slot` replaces one) |
| list/add/update/remove | `/doctor/education`, `/experience`, `/services`, `/publications`, `/memberships`, `/faqs`, `/affiliations`, `/fellowships`, `/expertise` (+ `/:id`) | portfolio v2 sections (generic `sectionApi`) |
| GET/POST/PATCH/DELETE, PUT | `/doctor/gallery[/:id]`, `/doctor/gallery/order` | gallery with metadata, reorder |
| POST | `/doctor/submit` | submit for verification |
| GET | `/specializations`, `/sub-specializations`, `/languages`, `/insurances` | public lookup catalogs |

### 2.3 Clinics and availability (`clinic.service.ts`)

| Method | Path |
|---|---|
| GET / POST | `/doctor/clinics` |
| PATCH / DELETE | `/doctor/clinics/:id` |
| GET / PUT | `/doctor/clinics/:id/availability` `{ slots }` (replace the whole weekly set) |
| GET / PUT | `/doctor/online-availability` `{ slots }` |
| GET / POST | `/doctor/exceptions` `{ clinicId \| null, exceptionDate, reason? }` |
| DELETE | `/doctor/exceptions/:id` |
| GET / PUT / DELETE | `/doctor/payment-qr`; POST `/doctor/payment-qr/image` |

### 2.4 Appointments and video (`appointment.service.ts`, `consultation.service.ts`)

| Method | Path | Notes |
|---|---|---|
| GET | `/doctor/bookings` | filters passed as query params (blank ones dropped) |
| GET | `/doctor/bookings/:id` | detail + patient snapshot |
| POST | `/doctor/bookings/:id/mark-paid` | confirm cash/UPI received |
| POST | `/doctor/bookings/:id/complete` `{ noShow }` | complete or no-show |
| POST | `/doctor/bookings/:id/reschedule` | new date/time |
| GET | `/doctors/:doctorId/slots?mode=online\|clinic&date=&clinicId=` | free slots (same endpoint patients use) |
| GET / POST | `/doctor/bookings/:id/clinical-notes` | patient-wide clinical notes (append-only) |
| GET / POST | `/doctor/bookings/:id/patient-vitals` | patient's vitals matrix / add doctor reading |
| PATCH | `/doctor/bookings/:id/patient-records/:recordId` | correct the date a document speaks for |
| POST | `/doctor/bookings/:id/video-token` | LiveKit `{ url, token, roomName, session }` |

### 2.5 Dashboard, earnings, analytics (`dashboard.service.ts`, `analytics.service.ts`)

| Method | Path |
|---|---|
| GET | `/doctor/dashboard/summary`, `/doctor/dashboard/today` |
| GET | `/doctor/earnings/summary`, `/doctor/earnings/series`, `/doctor/earnings/transactions` |
| GET | `/doctor/analytics/overview`, `/trends`, `/patients`, `/appointments`, `/financial`, `/quality`, `/productivity`, `/acquisition` |

Analytics query params are cleaned (`null`/`""` dropped) so the backend's Joi defaults apply; the doctor id is never sent (pinned server-side).

### 2.6 EMR workbench (`emr/services/emr.service.ts`)

| Method | Path |
|---|---|
| GET | `/doctor/emr/catalog` |
| GET | `/doctor/emr/workbench?date=&view=pending\|completed&q=` |
| GET | `/doctor/emr/patients/:id?bookingId=` (workspace) |
| GET | `/doctor/emr/patients/:id/vitals?from=&to=` |
| POST | `/doctor/emr/bookings/:bookingId/vitals` |
| GET | `/doctor/emr/patients/:id/entries?kind=&bookingId=&includeRetired=` |
| POST | `/doctor/emr/bookings/:bookingId/entries` |
| PATCH | `/doctor/emr/entries/:id` |
| POST | `/doctor/emr/entries/:id/retire` `{ reason }` |
| GET | `/doctor/emr/patients/:id/visits/:bookingId` |
| GET | `/doctor/emr/patients/:id/history` |
| GET | `/doctor/emr/patients/:id/timeline` (server-filtered, paginated) |
| GET | `/doctor/emr/patients/:id/documents` |
| GET (blob) | `/doctor/access-requests/:requestId/records/:recordId/file` |
| GET | `/doctor/emr/patients/:id/audit` |
| GET | `/doctor/emr/patients/:id/access` |
| POST | `/doctor/emr/patients/:id/access-requests` `{ categories, purpose? }` |
| POST | `/doctor/access-requests/:id/cancel` |
| GET | `/doctor/emr/search/medicines`, `/investigations`, `/diagnoses`, `/icd` (`?q=`) |

### 2.7 Prescriptions and letterheads

| Method | Path |
|---|---|
| GET / POST | `/doctor/prescriptions` |
| GET / PATCH / DELETE | `/doctor/prescriptions/:id` |
| GET | `/doctor/bookings/:bookingId/prescription` (404 = "none yet", not an error) |
| POST | `/doctor/prescriptions/:id/finalize` `{ emailPatient }` |
| POST | `/doctor/prescriptions/:id/amend` `{ reason }` |
| POST | `/doctor/prescriptions/:id/sync-workbench` |
| GET (blob) | `/doctor/prescriptions/:id/pdf` |
| GET / POST | `/doctor/prescription-templates` |
| GET / PATCH / DELETE | `/doctor/prescription-templates/:id` |
| POST | `/doctor/prescription-templates/:id/default`, `/duplicate`, `/assets` (multipart) |
| DELETE | `/doctor/prescription-templates/:id/assets/:kind` (`logo` / `watermark` / `signature`) |
| GET (blob) | `/doctor/prescription-templates/:id/preview.pdf` |

### 2.8 Medicines, referrals, timeline, follow-ups, notifications

| Method | Path |
|---|---|
| GET | `/doctor/medicines`, `/doctor/medicines/all` |
| GET / PATCH / DELETE | `/doctor/medicines/:id`; POST `/doctor/medicines` |
| GET | `/doctor/referral-targets?q=&clinicId=` |
| GET / POST | `/doctor/bookings/:id/referrals` |
| PATCH | `/doctor/referrals/:id` `{ status: "cancelled" }` |
| GET | `/doctor/referrals/incoming[?status=]`, `/doctor/referrals/:id/case` |
| GET (blob) | `/doctor/referrals/:id/case/prescription.pdf` |
| POST | `/doctor/referrals/:id/consultation` (creates the target doctor's walk-in booking) |
| GET | `/doctor/bookings/:id/patient-timeline`, `/doctor/patients/:id/timeline`, `/doctor/patients` |
| PATCH | `/doctor/patients/:id/status` `{ status }` |
| GET/POST/PATCH/DELETE, PUT | `/doctor/follow-up-statuses[/:id]`, PUT `/doctor/follow-up-statuses/reorder` `{ ids }` |
| GET / PUT / DELETE | `/doctor/bookings/:id/follow-up` |
| GET / PUT / DELETE | `/doctor/bookings/:id/reminder` |
| GET | `/medicine/notifications?limit=8&page=1`, `/medicine/notifications/unread-count` |
| PUT | `/medicine/notifications/:id/read`, `/medicine/notifications/read-all` |

### 2.9 Legacy / non-doctor

| Path | Note |
|---|---|
| GET `/doctors/:slug` | legacy `/doctors/[slug]` page (and the DoctorProfile component); `/doctors` list and `/specialties`, `/symptoms`, `/states`, `/contact` are defined in `API_ENDPOINTS` but not called - the legacy discovery code reads bundled JSON in `src/data` |

## 3. Request-body conventions

* Numeric form fields are strings in Zod schemas and converted to numbers in the service before sending (e.g. `experienceYears`, `onlineFee`).
* Optional text cleared by sending `null` (e.g. `bio: patch.bio || null`).
* "Replace the set" endpoints (specialties, languages, availability slots, prescription `items`, reorder ids) send the full list.
* Blobs: PDFs are requested with `responseType: "blob"` and shown in an `<iframe>` from an object URL.
* Uploads use `FormData` field `file` (plus `docType`, `slot`, consent flags where applicable) after `compressImage` for images.
