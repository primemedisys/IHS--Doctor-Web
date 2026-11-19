# Folder Structure - `frontend-doctor`

Verified from the working tree (excluding `node_modules`, `.next`, `.claude`). `@/` is the TypeScript path alias for `src/` (`tsconfig.json`).

```text
frontend-doctor/
├── .env.example                 # documented template (copy to .env.local); real .env* are git-ignored
├── .gitignore
├── eslint.config.mjs            # eslint-config-next (core-web-vitals + typescript)
├── next.config.ts               # reactCompiler, output: "standalone", turbopack dev cache off
├── next-env.d.ts
├── package.json / package-lock.json
├── tsconfig.json                # strict, paths { "@/*": ["./src/*"] }
├── README.md                    # create-next-app boilerplate (not project docs)
├── public/                      # logo.png, clinic_stock.png, telehealth_stock.png, default next/vercel svgs
└── src/
    ├── proxy.ts                 # Next 16 edge "proxy" (ex-middleware): route gating by cookie presence
    ├── app/                     # App Router (routes only; pages are thin shells)
    │   ├── layout.tsx           # <html>, Plus Jakarta Sans, metadata (noindex), AppProviders
    │   ├── template.tsx         # per-navigation fade-in (framer-motion)
    │   ├── page.tsx             # legacy home (never reached: proxy redirects "/")
    │   ├── error.tsx / loading.tsx / not-found.tsx / icon.svg
    │   ├── (auth)/              # layout.tsx (split-screen brand panel) + login, register,
    │   │                        #   forgot-password, reset-password
    │   ├── (dashboard)/dashboard/
    │   │   ├── layout.tsx       # wraps everything in <DashboardShell>
    │   │   ├── page.tsx         # Overview (Dashboard 2.0)
    │   │   ├── onboarding/  portfolio/  settings/  clinics/  availability/
    │   │   ├── appointments/ (page, [id]/call, [id]/history, [id]/patient, [id]/prescription)
    │   │   ├── workbench/ (page, patients/[patientId]/ + 9 record sub-pages)
    │   │   ├── patients/ (page, [patientId])
    │   │   ├── prescriptions/ (page, [id], templates/, templates/[id])
    │   │   ├── medicines/  referrals/  follow-up-options/  earnings/
    │   │   └── analytics/{patients,appointments,financial,quality,productivity,acquisition}/
    │   ├── about/  doctors/  doctors/[slug]/   # legacy public pages (see ROUTING)
    │   └── contact/ map/        # server redirects to the patient app
    ├── features/                # vertical slices: components + hooks + services per domain
    │   ├── auth/                # forms, hooks, zod schemas
    │   ├── dashboard/           # DashboardShell, overview, earnings, NotificationBell, nav.ts
    │   ├── analytics/           # Dashboard 2.0: KPI cards, charts, explore views, service, hooks
    │   ├── doctor/              # onboarding wizard, portfolio editor/sections, clinics, availability,
    │   │                        #   payment QR, uploads; services: doctor-profile, catalog, clinic, payment-qr
    │   ├── doctors/             # DoctorProfile / DoctorProfileView (public-profile renderer) + legacy discovery
    │   ├── appointments/        # board, detail dialog, patient description page, vitals, clinical notes
    │   ├── consultation/        # LiveKit room + video-token hook/service
    │   ├── emr/                 # workbench, patient workspace, entry panels, records/ pages, emr.service
    │   ├── prescriptions/       # composer, RxPad (letterhead), template editor, picker, services, hooks
    │   ├── medicines/           # medicine master-list manager
    │   ├── timeline/            # My Patients roster + treatment timeline
    │   ├── follow-ups/          # follow-up categories, panel, chip, reminders
    │   ├── referrals/           # refer dialog, incoming inbox, case dialog
    │   ├── records/             # continuous-scroll RecordReader / RecordSheet
    │   ├── home/ about/ contact/# legacy public-site sections (not reached by doctors)
    ├── components/              # shared presentational: feedback/, forms/, dialogs/, common/, ui/, cards/ ...
    ├── config/                  # env.ts (Zod-validated env), site.ts (name, nav)
    ├── constants/               # api.ts (endpoint registry), routes.ts, queryKeys.ts, storage.ts, search-params.ts
    ├── hooks/                   # useAuth, useDebounce, useDisclosure, useOnlineStatus
    ├── layouts/MainLayout.tsx   # public-site layout (legacy pages)
    ├── providers/               # AppProviders, QueryProvider, AuthProvider, query-client
    ├── schemas/common.schema.ts # email / password / phone zod primitives
    ├── services/                # api.ts (Axios), auth.service.ts, search.service.ts (legacy)
    ├── theme/                   # MUI theme: palette, typography, components, shape, shadows, motion ...
    ├── types/                   # shared TS types (appointment, emr, prescription, doctor-portfolio ...)
    ├── utils/                   # error normaliser, formatters, token cookies, jwt, compressImage ...
    ├── data/                    # bundled sample JSON (doctors, specialties, states, symptoms) - legacy
    └── assets/                  # empty (.gitkeep)
```

## Feature-slice convention

Each `features/<domain>/` generally contains:

| Folder / file | Role |
|---|---|
| `components/` | UI for that domain (the page-level components are exported from `index.ts`) |
| `hooks/` | React Query hooks wrapping the service (queries + mutations + cache invalidation) |
| `services/` | HTTP only, via the shared `api` instance; return unwrapped `data.data` |
| `schemas/` | Zod schemas for forms |
| `index.ts` | public surface used by `src/app/**/page.tsx` |

`src/app/**/page.tsx` files only compose a feature component and set `metadata.title`; the few `"use client"` pages read route params with `useParams` and pass them down.

## Size hot-spots (lines)

`doctors/components/DoctorProfile.tsx` 3,541; `appointments/components/AppointmentsBoard.tsx` 1,853; `prescriptions/components/RxPad.tsx` 1,225; `doctor/components/PortfolioSections.tsx` 1,156; `emr/components/EntryPanels.tsx` 1,030; `appointments/components/PatientDescriptionView.tsx` 950; `emr/records/MedicineDashboardPage.tsx` 923. These are the files to read first when changing those areas.

## Working-tree note

At documentation time `git status` shows large parts of this app (e.g. `features/emr`, `features/analytics`, `app/(dashboard)/dashboard/workbench`, `.../analytics`, `app/template.tsx`) as **untracked** on the branch `feat/pharmacy-medicinestore`, and `pnpm-lock.yaml` as deleted. They exist on disk and were documented from disk; they must be committed together for a clean build.
