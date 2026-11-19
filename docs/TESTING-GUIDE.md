# Testing Guide

## 1. Current state (verified)

| Item | Finding |
|---|---|
| Test runner | none in `package.json` (no Jest, Vitest, Playwright or Cypress dependency) |
| Test files | none (`*.test.*`, `*.spec.*`, `jest.config*`, `vitest*`, `playwright*`, `cypress*` not found under the app) |
| `npm test` | not defined |
| CI gates | `npm run lint` + `npm run build` only (Jenkinsfile "Verify"; the file states "There are no tests in this repo yet") |
| Type-check | implicit in `next build`; no standalone script |

So the app's correctness today relies on lint, TypeScript strict mode, the production build and manual verification. The backend has its own tests; the system docs record end-to-end suites run against a test API there, not through this UI.

## 2. Recommended pre-merge checks

```bash
npm run lint
npx tsc --noEmit
npm run build        # needs NEXT_PUBLIC_API_URL set; catches env + route errors
```

## 3. Manual regression checklist (derived from the features)

| Area | Check |
|---|---|
| Auth | register a doctor; sign in with email, then with 10-digit mobile; wrong-portal toast for a patient account; OTP reset (needs SMS/email configured); sign out clears cookies and cache; `?redirect=` honoured only for same-origin paths |
| Session | delete the access cookie but keep the refresh cookie -> page loads and re-authenticates; clear both -> redirected to `/login?redirect=...`; simulate a 429 on `/auth/me` -> "reconnecting" message, still signed in |
| Onboarding | three required steps turn green; Submit is disabled until all are done; rejected state shows notes and "Update and resubmit" |
| Specialties | 5 specialty cap, 10 sub-specialty cap, "+ Add new sub-specialty" creates and selects the entry; removing a specialty drops its sub-specialties |
| Portfolio | each inline pencil opens the right editor; upload hero images (3 max), awards image, gallery reorder; preview reflects saves |
| Clinics / availability | add a clinic with and without a map pin; windows per day; blocked date; changes visible to a patient booking from the patient app |
| Appointments | status filters and counts; Previous/Today/Future; mark paid (UPI/cash), complete, no-show, reschedule (only free times offered); follow-up "expected" rows |
| Video | join from an appointment; patient presence overlay; open each side panel without dropping the call; drag the PiP; finalize a prescription from the panel returns to full screen |
| Workbench | add each entry kind; retire an entry; ICD search; unsaved input flushed by "Save and Generate Prescription"; second click ignored while running |
| Consent | other doctor's records show the lock + "Request access"; request, cancel; after patient approval data appears |
| Prescriptions | sign; PDF preview matches letterhead; amend creates a new version; letterhead autosave indicator; asset upload/delete |
| Medicines | add/edit/delete; strength picker with "other"; appears in the picker |
| Referrals | send, cancel while pending; incoming inbox; start consultation creates a zero-fee booking |
| Analytics / earnings | period filter; explore pages carry the period via query string; earnings ledger sum equals net for the same range; 30-day uses day buckets |
| Notifications | badge increments after an appointment event; mark one / all read |
| Offline | toggle network off -> persistent bottom banner; safe GETs retry, POSTs do not |
| Responsive | check at 360 px, 768 px, 1280 px: drawer vs rail, tables, dialogs |

## 4. Suggested automated coverage (not present)

* Unit: `normalizeMobile` / `parseLoginIdentifier`, `periodFor`, analytics `range.ts`, IST date helpers, `medicine-line.ts` rules, `normalizeError`.
* Component: `LoginForm` validation, `SpecialtiesStep` caps, `OnboardingWizard` gating (mock `api`).
* E2E: login -> onboarding -> appointment -> workbench -> prescription against a test API instance (never a production database).
