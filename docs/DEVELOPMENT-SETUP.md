# Development Setup

## 1. Prerequisites

| Need | Detail |
|---|---|
| Node.js | 20.x (CI pins `node20`) |
| npm | the repo uses `package-lock.json`; `pnpm-lock.yaml` has been removed from the working tree |
| Backend | a running IHS backend reachable at `NEXT_PUBLIC_API_URL` (see backend docs: `docs-shared/...`) with a migrated database |
| Optional keys | Google OAuth client id (sign-in), Google Maps key (clinic pin), backend LiveKit config (video) |

## 2. First run

```bash
cd frontend-doctor
cp .env.example .env.local
# edit NEXT_PUBLIC_API_URL (must be a valid URL) and any optional values
npm install
npm run dev          # http://localhost:3001
```

Notes:
* `npm run dev` triggers `predev` = `npm install` first, so every dev start re-runs an install. CI deliberately uses `npm ci` and never runs the dev script.
* Port 3001 is fixed in the script. The shared default for `NEXT_PUBLIC_DOCTOR_URL` is `http://doctor.localhost:3001` (a `*.localhost` host resolves to loopback in modern browsers), but plain `http://localhost:3001` works as well; keep `NEXT_PUBLIC_COOKIE_DOMAIN=localhost` for dev so cookies are shared with the patient app on port 3000 (cookies ignore ports).
* Opening `/` redirects to `/login`.
* Create a doctor via `/register`, then complete onboarding. Operational pages (appointments, workbench, earnings...) appear in the menu only after an admin approves the doctor (approve in the admin app or directly in the dev database). The routes themselves can be opened by URL before that, but the backend decides what works.

## 3. Day-to-day commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Type-check | `npx tsc --noEmit` (no script is defined; `tsconfig.json` is strict, `noEmit: true`) |
| Production build | `npm run build` |
| Run the build locally | `npm run start` (`next start -p 3001`); production itself uses `node server.js` from the standalone folder |

## 4. Conventions to follow (observed in the code)

1. **Feature slices**: add UI under `features/<domain>/components`, HTTP in `services`, caching in `hooks`, form schemas in `schemas`. Pages in `src/app` stay thin.
2. **Endpoints** go in `constants/api.ts` first; never hardcode URLs in components. Use `requestData` or `.then(r => r.data.data)` and keep services free of toasts.
3. **Query keys** from `constants/queryKeys.ts`; when a mutation can make another screen stale, invalidate that prefix (e.g. follow-up status changes invalidate appointments).
4. **Dates**: clinical days are IST `YYYY-MM-DD` strings; do not derive "today" from the browser zone (`features/emr/format.ts`, `features/analytics/range.ts`).
5. **Never encode clinical thresholds in the front end**; they come from the backend (`vitalStatus.tsx` header).
6. **Do not store tokens in `localStorage`**; use `utils/auth-token.ts`.
7. **React Compiler is on**: avoid non-null assertions on nullable state inside callbacks; keep render pure (see the `template.tsx` comment on hydration).
8. **Design tokens**: use theme palette/`theme.tokens`; do not hardcode hex values in components (palette header rule).
9. **Duplicated files**: `DoctorProfile.tsx` and `HistoryViews.tsx` have twins in `frontend-patient`; port fixes to both.
10. **Uploads**: send `FormData` through the shared `api`, compress images with `compressImage`, mirror (never replace) server limits.

## 5. Working with the backend locally

* The doctor app never talks to the database; if pages 500 or lists are empty, check the API first.
* Rate limiting on the backend can return 429 in dev; `AuthProvider` keeps you signed in and retries `/auth/me` with backoff, but React Query will not retry a 429.
* Video calls need backend LiveKit configuration and two participants (a patient joining from the patient app).
* Other IHS apps may already use ports 3000-3003 and 5000-5001 on a developer machine; check the port owner before assuming the API is yours.

## 6. Lint / type status

No automated check results are recorded in this documentation; run `npm run lint` and `npx tsc --noEmit` before committing. The ESLint config is `eslint-config-next` (core-web-vitals + typescript) with default ignores (`.next`, `out`, `build`, `next-env.d.ts`).
