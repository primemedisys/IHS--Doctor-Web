# Environment Configuration

## 1. How configuration is loaded

* Only variables prefixed `NEXT_PUBLIC_` are read, and only in `src/config/env.ts`, which validates them with a Zod schema **at module load**. A missing/invalid `NEXT_PUBLIC_API_URL` throws `Invalid environment configuration` (after logging the field errors), failing the build/startup loudly.
* `NEXT_PUBLIC_*` values are **inlined at build time** into the browser bundle. Changing them on a running production server has no effect; rebuild. (This is why the Jenkins pipeline installs the build-time env file as `.env.production` before `next build`.)
* There are **no server-only secrets** in this app. Nothing here should ever hold a JWT secret, API secret or LiveKit secret.
* Local files: copy `.env.example` to `.env.local` (Next loads `.env.local` in dev). `.gitignore` ignores every `.env*` except `.env.example`. Do not commit real env files.

## 2. Variables

Verified from `src/config/env.ts`, `src/features/doctors/services/doctor.service.ts` and `.env.example`.

| Variable | Zod rule | Default | Consumed by | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `string().url()` required | none | `services/api.ts` (`baseURL`) | include the `/api` suffix if the backend mounts routes under it (example: `http://localhost:5000/api`) |
| `NEXT_PUBLIC_APP_NAME` | string | `Indian Health System` | `config/site.ts` -> metadata/title | |
| `NEXT_PUBLIC_ENV` | enum development/staging/production | `development` | `env.isProduction/isDevelopment` | informational |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | string optional | `""` | `AppProviders` (`GoogleOAuthProvider`), `GoogleAuthButton` | blank hides the real Google button (placeholder shown); must equal backend `GOOGLE_CLIENT_ID` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string optional | `""` | `ClinicLocationPickerInner`, `LocationAutocompleteInner`, `DoctorsMapInner` | enable Maps JavaScript + Places + Geocoding; restrict by HTTP referrer; blank = fallback UI. Billing must be enabled on the Google project or Places fails |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | string optional | `""` | `utils/auth-token.ts` | dev `localhost`; prod `.yourdomain.com`; blank = host-only cookie (no cross-app SSO) |
| `NEXT_PUBLIC_PATIENT_URL` | url | `http://localhost:3000` | redirects, wrong-portal action, "IHS home" links | |
| `NEXT_PUBLIC_DOCTOR_URL` | url | `http://doctor.localhost:3001` | `siteConfig.url` -> `metadataBase` | |
| `NEXT_PUBLIC_ADMIN_URL` | url | `http://admin.localhost:3002` | validated only | no consumer found |
| `NEXT_PUBLIC_LIVEKIT_URL` | string optional | `""` | validated only (`env.livekitUrl`, `env.isVideoEnabled`) | the actual join URL comes from the backend token response; keep equal to backend `LIVEKIT_URL` for consistency |
| `NEXT_PUBLIC_USE_MOCK_DOCTORS` | not in schema | unset | `doctor.service.ts` (`process.env` read directly) | `"true"` serves the legacy `/doctors/[slug]` page from bundled sample data |
| `NODE_ENV` | Next-provided | | `QueryProvider` (devtools only in development) | |

Build-time-only helpers set by the Jenkinsfile (not app config): `NEXT_TELEMETRY_DISABLED=1`, `NODE_OPTIONS=--max-old-space-size=<NODE_HEAP_MB>` (default 2048), `CI=true`. At runtime pm2 sets `NODE_ENV=production`, `PORT`, `HOSTNAME=127.0.0.1` (Next standalone reads `PORT`/`HOSTNAME`, not `-p`).

## 3. Example files (placeholders only)

Local development, backend on 5000, patient app on 3000:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=Indian Health System
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_COOKIE_DOMAIN=localhost
NEXT_PUBLIC_PATIENT_URL=http://localhost:3000
NEXT_PUBLIC_DOCTOR_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_URL=http://localhost:3002
NEXT_PUBLIC_LIVEKIT_URL=
```

Production (build-time env file, placeholders):

```env
NEXT_PUBLIC_API_URL=https://api.<your-domain>/api
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_COOKIE_DOMAIN=.<your-domain>
NEXT_PUBLIC_PATIENT_URL=https://<your-domain>
NEXT_PUBLIC_DOCTOR_URL=https://doctor.<your-domain>
NEXT_PUBLIC_ADMIN_URL=https://admin.<your-domain>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<referrer-restricted-key>
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
```

## 4. Backend settings this app depends on (not configured here)

* CORS: the backend must allow this app's origin (`CLIENT_URL` list in the system CI doc covers the doctor subdomain).
* Cookie SSO needs all IHS apps under one parent domain.
* Video: backend `LIVEKIT_*` variables must be set, otherwise the call page shows the backend's "isn't configured" error.
* OTP reset: backend SMS/email providers must be configured or the OTP step shows `SMS_UNAVAILABLE` / `EMAIL_UNAVAILABLE`.
* Rate limits: the backend's global rate limiter can return 429 during heavy use; this app deliberately does not retry on 429.
