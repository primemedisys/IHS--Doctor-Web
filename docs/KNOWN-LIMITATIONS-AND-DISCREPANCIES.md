# Known Limitations and Discrepancies

Everything here was found by reading the source (and, for backend facts, the route/file listings). "Old docs" = the legacy folders under `docs/` (see `LEGACY-DOCUMENTATION-MAP.md`).

## 1. Known limitations of the app

### Product / functional
| # | Limitation | Evidence |
|---|---|---|
| 1 | **Bank / payout details** step is a locked "coming soon" item | `OnboardingWizard` `DEFERRED` |
| 2 | **No notifications page**, no real-time push in the web app; bell polls every 60 s | `NotificationBell` comment; no socket client in `src` |
| 3 | **Reconciliation** and per-medicine administration/discontinuation events have no backend data; pages state this | `ReconciliationPage`, `MedicineDashboardPage` headers |
| 4 | Profile **name/phone self-edit** (`SettingsView`) and **change password** are not reachable: the component exists but `/dashboard/settings` renders the portfolio editor; `changePassword` endpoint has no caller | `features/dashboard/components/pages.tsx`, `settings/page.tsx`, `constants/api.ts` |
| 5 | `AdminLoginForm` / `useAdminLogin` exist with no route | `features/auth` |
| 6 | Verification gating hides **menu items only**; operational routes are reachable by URL for an unapproved doctor (backend is the real gate) | `visibleNav`, no page-level check |
| 7 | `/dashboard/analytics/*` pages are reachable only from the Overview "Explore more" links (not in the sidebar) | `nav.ts` |
| 8 | Weekly availability editor seeds **one window per day** (first wins) | `WeeklyScheduleEditor` |
| 9 | Legacy public pages (`/about`, `/doctors/[slug]`) and their `home/`, `cards/`, `data/*.json`, `BookingDialog` (simulated booking), `search.service.ts` remain in the bundle although doctors never see them | `src/app`, `src/data` |
| 10 | Auth brand panel shows **hard-coded marketing figures** ("1,200+ verified doctors", "80k+ consultations", "4.9 avg. rating") that are not data-driven | `(auth)/layout.tsx` |
| 11 | `siteConfig.ogImage` points to `/og.png`, which is not in `public/` | `config/site.ts`, `public/` listing |

### Technical
| # | Limitation | Detail |
|---|---|---|
| 12 | **No automated tests** | see `TESTING-GUIDE.md` |
| 13 | **Tokens in JS-readable cookies** (not HttpOnly) | XSS exposure; mitigated by no `dangerouslySetInnerHTML` |
| 14 | Route guard checks cookie **presence only** | expired/invalid tokens are caught client-side after load |
| 15 | **Duplicated code across apps**: `DoctorProfile.tsx` (this app 3,541 lines vs patient app 3,566) and `HistoryViews.tsx` must be kept in sync by hand; theme is also copied | fixes must be ported |
| 16 | Very large single files (`DoctorProfile`, `AppointmentsBoard`, `RxPad`, `PortfolioSections`, `EntryPanels`) | review/refactor risk |
| 17 | Several declared dependencies show no use in files read (`next-themes`, `@tanstack/react-table`, Leaflet packages, `react-pdf`, markdown packages, `class-variance-authority`, `tailwind-merge`, `react-loading-skeleton`) | run a dependency audit before removing |
| 18 | `NEXT_PUBLIC_ADMIN_URL` and `NEXT_PUBLIC_LIVEKIT_URL` are validated but unused; `NEXT_PUBLIC_USE_MOCK_DOCTORS` is read outside the Zod schema and absent from `.env.example` | `config/env.ts`, `doctor.service.ts` |
| 19 | `dashboard/layout.tsx` comment mentions `src/middleware.ts`; the real file is `src/proxy.ts` | stale comment |
| 20 | `DashboardShell` documents a white sidebar, while `theme/palette.ts` defines a deep-green sidebar surface that overrides it | styling inference, not visually verified |
| 21 | `frontend-doctor/README.md` is the untouched create-next-app boilerplate (says port 3000) - the real port is 3001 | use this docs folder instead |
| 22 | Retries are disabled for POST/PATCH by design, so a network blip on a write surfaces as an error | `services/api.ts` |
| 23 | Large parts of the app are **untracked in git** on the current branch (`features/emr`, `features/analytics`, workbench/analytics routes, `app/template.tsx`) and `pnpm-lock.yaml` is deleted in the working tree | commit together |
| 24 | Two deployment mechanisms (Jenkins standalone + pm2 `server.js`, GitHub Actions `deploy.sh` build-in-place + `pm2 restart`) coexist; reconciliation on the server not verifiable | `DEPLOYMENT-GUIDE.md` |

## 2. Discrepancies: old docs vs current code

Where old docs and code disagree, this documentation follows the code.

| Topic | Old doc says | Code shows |
|---|---|---|
| Consultation queue (`docs-shared/feature-plans/consultation-queue`) | Status "Planned - nothing built" | `WeeklySlot` documented as a consulting window/session with tokens (migration 027 referenced); availability UI copy says "patients book a DAY and take a token" - **built** |
| Follow-up status (`docs-shared/feature-plans/follow-up-status`) | "Planned" | `features/follow-ups` full CRUD, colours, reorder, per-booking assignment - **built** |
| Follow-up reminders (`docs-shared/feature-plans/follow-up-reminders-07-09-2026`) | "Planned" | `FollowUpPanel` reminder with email/WhatsApp channels and per-channel status - **built** (delivery is backend) |
| Record reader (`docs-shared/feature-plans/record-reader`) | "Planned" | `features/records` `RecordReader`/`RecordSheet` mounted in `PatientDescriptionView` - **built** |
| Treatment timeline (`docs-shared/feature-plans/treatment-timeline`) | "Planned - not started" | `features/timeline` (`PatientHistoryView`, `MyPatientsTable`, routes) - **built** |
| Vitals reference ranges (`docs-shared/feature-plans/vitals-reference-ranges`) | "Planned" | `vitalStatus.tsx` renders bands/arrows/legend from backend ranges - **built** |
| Vitals record table (`docs-shared/feature-plans/vitals-record-table`) | "Planned" | `HealthRecordTable` (row per reading, newest-first top-to-bottom, sticky header/date) - **built**. Note the old doc asked for "recent one last (at the bottom)"; the code's comment says newest to oldest top-to-bottom |
| Doctor onboarding (`docs-shared/feature-plans/doctor-onboarding`) | wizard = professional / specialties+langs / portfolio / documents (+ deferred clinics, availability, bank); portfolio tables "not yet migrated" | UI gates submission on **3** steps (professional, specialties, documents); portfolio, clinics, availability are tracked-but-not-gating; bank is locked; the portfolio is built |
| Clinics map (`docs-shared/feature-plans/clinics-availability` section 5) | keyless Leaflet / OpenStreetMap picker | Google Maps (`@vis.gl/react-google-maps`) behind `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; Leaflet packages remain in `package.json` |
| Portfolio v2 (`docs-shared/feature-plans/doctor-portfolio-v2`) | Plan / design | Built (sections incl. affiliations, fellowships, expertise from migration 049) |
| Auth plan (`docs-shared/feature-plans/auth`) | "Plan/design; backend `src/` empty" and separate admin login | auth is built; doctor login is by email **or mobile** with `audience: "doctor"` and OTP reset - not in the original plan; admin login form unrouted here |
| Specialization / sub-specialization (`backend/docs/feature-history/bugfix-05-09-2026/doctor-specialization-sub-specialization.md`) | a dependent dropdown: one specialization, then its sub-specializations; backend caps sub-specializations at 10; changing the specialization clears the sub-selection | UI is multi-select: up to **5 specialties** and **10 sub-specialties** (the 10 cap matches the old doc), plus a **"+ Add new sub-specialty"** row that creates a shared catalog entry (`POST /doctor/catalog/sub-specializations`); the server drops sub-specialties whose parent specialty was removed, so the UI saves specialties first, then sub-specialties |
| Doctor Dashboard 2.0 | "Stack unchanged, no new env" | consistent; the app root is the analytics overview (the older "patient workbench preview on the overview" no longer exists) |
| Prescriptions (`docs-shared/feature-plans/prescriptions`) | doctor writes the prescription in the composer | composer is now **read-only**; the Workbench is the single source of truth and the draft is synced via `sync-workbench` (migration 059) |
| `docs-shared/legacy/IMPLEMENTATION-STATUS.md` | web "Settings -> payment QR" | present as `PaymentQrCard` inside `/dashboard/settings` |
| IHS design system memo (project notes) | blue `#2563EB` primary, white sidebars | this app's palette: deep navy `#102B5C` primary; sidebar surface constants are deep green `#075B4C` |
| Video (`docs-shared/feature-plans/video-consultation`) | history/description open in a new tab | now open in place in iframes beside a draggable picture-in-picture (`embed=1`) |
| Notifications (system status doc) | Socket.IO push to the `user:<id>` room | doctor web app uses polling; the socket client is described for the mobile app only |
| Jenkins doc (`docs-shared/ci/jenkins-setup.md`) | Jenkins deploys | GitHub Actions + `scripts/deploy.sh` is described there as superseding Jenkins, but `Jenkinsfile` and `ecosystem.config.js` remain in the repo |

## 3. Unverified / unclear items

| Item | Why unverified |
|---|---|
| Exact backend validation limits behind client mirrors (10 MB docs/photos, 2 MB QR, cap of 5 specialties) | client constants say they mirror the backend; backend values not re-read (the 10 sub-specialty cap is confirmed by the old bugfix doc) |
| Weight/height are never coloured in vitals | stated in the old design doc; not re-verified in `vitalStatus.tsx` |
| Whether "Reconciliation" or other backend features will be added | none found |
| Sidebar colour at runtime | inferred from CSS rules, not rendered |
| Behaviour of video-token window rules | server-side |
| Which deployment path is authoritative on the VPS | not visible from the repo |
| Usage of listed "present" dependencies | see item 17 |
