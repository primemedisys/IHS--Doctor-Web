# Troubleshooting

Each entry: symptom -> likely cause (from code) -> action.

## Startup and build

| Symptom | Cause | Action |
|---|---|---|
| Build/start fails with `Invalid environment configuration` and a console list of field errors | `NEXT_PUBLIC_API_URL` missing or not a URL (Zod in `config/env.ts`) | set it in `.env.local` (dev) or the build-time env file (CI) and restart/rebuild |
| Changed an env var in production, nothing changed | `NEXT_PUBLIC_*` are inlined at build time | rebuild and redeploy |
| `npm run dev` is slow to start / reinstalls packages | `predev` runs `npm install` | expected; use `npx next dev -p 3001` directly to skip it |
| A route added or changed while the dev server was down returns 404 | Turbopack dev cache restoring a stale route table (Windows) | already mitigated by `turbopackFileSystemCacheForDev: false`; restart dev; delete `.next` if it persists |
| All `[param]` routes 500 in dev, workers exit with a Jest-worker style error | dead parent dev server left orphan children | stop all `next` processes and restart (restart, not code) |
| Build killed / out of memory | big production build on a small machine | stop other heavy processes; set `NODE_OPTIONS=--max-old-space-size=<MB>`; build one app at a time |
| Type errors after adding a route | stale generated types in `.next` | restart dev / `next build` regenerates |
| Port already in use | another IHS app or another project on 3001 | find the owner of the port; do not kill unrelated projects |

## Authentication

| Symptom | Cause | Action |
|---|---|---|
| Redirected to `/login` repeatedly | no valid cookies; or cookies set for another domain | check `ihs_access_token` / `ihs_refresh_token`; align `NEXT_PUBLIC_COOKIE_DOMAIN` with the host (dev `localhost`) |
| Signed in on the patient site but not here | different cookie domain or `COOKIE_DOMAIN` blank in one app | set the same parent domain in every IHS app |
| "This account is registered as a patient" toast | `WRONG_PORTAL` (patient account on doctor portal) | use the patient site (action button) |
| Mobile number login fails | number must normalise to `[6-9]\d{9}`; mobile only matches doctor accounts | enter 10 digits (+91/0 prefixes accepted) or use email |
| OTP step shows `SMS_UNAVAILABLE` / `EMAIL_UNAVAILABLE` | backend channel not configured | configure backend SMS/SMTP, or use "Email me a reset link instead" |
| Dashboard shows "The server is busy - reconnecting, you're still signed in" | `/auth/me` got 429/5xx/network error; app retries with backoff (2 s doubling to 30 s) | wait; check backend/rate limit; session is not lost |
| Logged out unexpectedly | refresh call returned 401/403 (token revoked/expired, or another login revoked sessions after a password reset) | sign in again |
| Google button looks fake / says client id needed | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` blank | set it (and backend `GOOGLE_CLIENT_ID`) and rebuild |

## Data and UI

| Symptom | Cause | Action |
|---|---|---|
| Menu lacks Appointments/Patient Portal/Earnings... | doctor not `approved` yet | finish onboarding and wait for admin approval |
| Lists empty / 404 or 403 toasts everywhere | wrong `NEXT_PUBLIC_API_URL` (missing `/api`, wrong port, patient app port) or CORS | open Network tab; fix URL; check backend CORS origin list |
| "Cannot reach the server" | status 0 not offline/timeout: backend down, TLS or CORS failure | check API reachability first |
| "That took too long" on upload | upload exceeded 180 s on a slow uplink | retry on better network; images are already compressed above 1 MB; PDFs are not |
| File rejected immediately | client limit: 10 MB for documents/photos (PNG/JPEG, documents also PDF), 2 MB for UPI QR | use a smaller file |
| Map shows a placeholder / address search suggests nothing | no Maps key, or the Google project lacks billing for Places | add key; enable Maps JavaScript + Places + Geocoding with billing; type the address manually meanwhile |
| Video: "waiting for the other party" forever | patient has not joined; or LiveKit not configured on the backend | confirm the patient joined from their app; check backend `LIVEKIT_*` |
| Video error before joining | `POST /doctor/bookings/:id/video-token` rejected by the backend (the token is described in code as short-lived and window-bound; the exact conditions are enforced server-side and were not verified here) - the message shown is the backend's | read the toast; retry with the page's retry button |
| Prescription "Finalize" disabled | no saved medication order / incomplete medicine lines / refreshing from Workbench | complete the Workbench Medication Order or tick "Medication not needed" |
| Prescription PDF preview differs from the pad preview | `RxPreview` is an approximation; the server PDF is authoritative | trust the PDF |
| Another doctor's records show a lock | patient has not granted that consent category | use "Request access" |
| Reconciliation page empty | backend has no reconciliation model | expected |
| Stale data after an action in another browser | 30 s stale window | switch tabs (refetch on focus) or wait |
| Analytics section shows an error card but others load | each section loads independently by design | retry that section; check the specific endpoint |
| 429 errors in development | backend global rate limit | wait; use a separate backend instance for automated runs |
| Hydration warning around dates | board/date inputs must not use browser "today" on the server | use the existing `useSyncExternalStore` clock / IST helpers |

## Useful diagnostics

* Browser Network tab: filter by `/doctor/` and look at the response envelope `error.code`.
* React Query devtools (bottom corner) appear in development only.
* Cookies: confirm names and domain in Application > Cookies.
* `GET /auth/me` returning 403 after a role change will clear tokens on next load.
