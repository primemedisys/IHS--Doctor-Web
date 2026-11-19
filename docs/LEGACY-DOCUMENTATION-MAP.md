# Legacy Documentation Map

> **Historical note (documentation restructuring).** The pre-existing centralized `docs/` tree this map describes has been dissolved: every application now owns its documentation in `<app>/docs/`, and system-wide material lives in `docs-shared/`. Where a row still names an old `docs/<folder>` path, that centralized location no longer exists; in the shared map the "Legacy file" column already shows each document's new location. The authoritative old-to-new file mapping is `docs-shared/DOCUMENTATION-MIGRATION-REPORT.md`.

The monorepo `docs/` folder (158 files at documentation time) holds feature-by-feature plans and as-built notes written while the doctor portal was being built. They are **historical**: several describe features as "Planned" that are now built (see `KNOWN-LIMITATIONS-AND-DISCREPANCIES.md`). Use this folder (`frontend-doctor/docs/`) as the current reference for the doctor web app. Paths below are plain text pointers into the shared monorepo docs.

Review depth key: **Deep** = read in substantial part; **Skim** = headings/status/summary read and compared with code; **Index** = located by search for `frontend-doctor` / relevance, not read in full.

## 1. Folders relevant to this app

| Legacy folder / file | Topic | Relevance to `frontend-doctor` | Review | Where it is now covered here (section numbers refer to `FEATURES-AND-MODULES.md` unless a file is named) |
|---|---|---|---|---|
| `docs-shared/feature-plans/doctor-onboarding/` (README, backend/frontend/integration plans) | registration, onboarding state machine, verification lifecycle | high | Deep (README), Skim | `FEATURES-AND-MODULES.md` s2, `APPLICATION-OVERVIEW.md` |
| `docs-shared/feature-plans/doctor-portfolio-v2/` | 14-section public portfolio | high | Skim | s3 |
| `backend/docs/feature-history/bugfix-05-09-2026/doctor-specialization-sub-specialization.md` | specialty / sub-specialty | high | Skim | s2.2 |
| `docs-shared/feature-plans/clinics-availability/` | clinics, weekly availability, exceptions | high | Skim | s4, s5 |
| `docs-shared/feature-plans/consultation-queue/` | session windows and tokens instead of slots | high | Skim | s5 |
| `docs-shared/feature-plans/multi-clinic-booking/` | multi-clinic bookings | medium | Index | s4-s6 |
| `docs-shared/feature-plans/booking-payments/` | bookings, payments, mark-paid | high | Index | s6 |
| `docs-shared/feature-plans/dashboards-earnings/` | dashboard summary, earnings money model | high | Skim | s13.4 |
| `frontend-doctor/docs/feature-history/doctor-dashboard-2-31-10-2026/` (README, api.md) | Dashboard 2.0 analytics KPIs | high | Deep (README) | s13 |
| `docs-shared/feature-plans/clinical-notes/`, `docs-shared/feature-plans/patient-health-records/` | clinical notes, vitals table, patient record page | high | Skim | s6.4 |
| `docs-shared/feature-plans/vitals-record-table/`, `docs-shared/feature-plans/vitals-reference-ranges/` | vitals table, colour bands | medium | Skim | s6.4, s6.5 |
| `frontend-doctor/docs/feature-history/patient-record-page.md` | patient record page design | medium | Index | s6.4 |
| `docs-shared/feature-plans/record-reader/` | continuous-scroll record viewer | medium | Skim | s6.4, COMPONENTS |
| `docs-shared/feature-plans/treatment-timeline/` | timeline + My Patients | high | Skim | s8.5 |
| `docs-shared/feature-plans/prescriptions/` | prescriptions and configurable letterhead | high | Skim | s9 |
| `docs-shared/feature-plans/medicine-management-31-10-2026/` | medicine master list and reminders | medium | Skim | s10 |
| `docs-shared/feature-plans/follow-up-status/`, `docs-shared/feature-plans/follow-up-reminders-07-09-2026/` | follow-up categories and reminders | medium | Skim | s12 |
| `docs-shared/feature-plans/multi-doctor-referrals/` | referrals and care journey | high | Skim | s11 |
| `docs-shared/feature-plans/video-consultation/` | LiveKit calls | high | Skim | s7 |
| `docs-shared/feature-plans/auth/` | authentication plan | high | Skim | `AUTHENTICATION-AND-PERMISSIONS.md` |
| `docs-shared/ci/jenkins-setup.md`, `Jenkinsfile`, `ecosystem.config.js`, `.github/workflows/deploy.yml`, `scripts/deploy.sh` | CI/CD | high | Skim (setup doc via search), Deep (Jenkinsfile, ecosystem, deploy.sh, workflow) | `DEPLOYMENT-GUIDE.md` |
| `docs-shared/legacy/IMPLEMENTATION-STATUS.md`, `docs-shared/legacy/PRODUCTION-READINESS-AUDIT.md` | status and audit notes | medium | Deep | discrepancies, limitations |
| `docs/dbstruct.md`, `docs-shared/legacy/indiahealthsystem.md` | database / system overview | background | Index | referred to by plain text only |
| `docs-shared/feature-plans/doctor-listing-map-api/`, `docs-shared/feature-plans/patient-booking-flow/`, `docs-shared/feature-plans/contact-and-booking-cta/` | patient-facing discovery/booking | low (legacy public pages only) | Index | s3 note on legacy pages |
| `docs-shared/feature-plans/admin-portal/`, `docs-shared/feature-plans/admin-panel-enhancements/` | admin approval of doctors | low (other app) | Index | `APPLICATION-OVERVIEW.md` journey |
| `docs-shared/feature-plans/clinic-account/` | clinic portal (can book on a patient's behalf -> `bookedBy`) | low | Index | s6.1 |
| `docs-shared/feature-plans/bugfix-18-07-2026/`, `bugfix-31-07-2026/`, `bugfix-08-09-2026/`, `bugfix-15-09-2026/` | assorted fixes | low | Index | none specific |
| `backend/docs/feature-history/logger.md`, `backend/docs/CLOUDINARY_SETUP.md` | backend logging / file storage | background | Index | none |

## 2. Folders not related to this app

`ambulance/`, `blood-bank/`, `diagnostic-lab-26-09-2026/`, `medicine-store-platform-22-09-2026/`, `pharmacy-management-09-10-2026/`, `medicine-category-422-fix-22-09-2026/`, `medicine-login-dashboard-fix-22-09-2026/`, `prescription-request-schema-fix-22-09-2026/`, `mr-frontend-design-standardization-21-09-2026/`, `admin-filter-updates-21-09-2026/`, `admin-frontend-cleanup-17-09-2026/`, `MOBILE_APPS.md` and the mobile `.docx` files. Not read for this documentation beyond name-level triage.

## 3. How to use legacy docs safely

1. Prefer these new docs for current behaviour; treat old "Status: Planned" lines as stale unless this folder says otherwise.
2. Old docs remain valuable for **rationale** (why tokens instead of slots, why consent categories, KPI formulas, money model, letterhead scoping).
3. Backend contracts (endpoint payloads, migrations, serializers) are documented in the backend's own docs and the legacy `*-plan.md` files; this folder documents the **client** side and the endpoints it actually calls.
4. When code and an old doc disagree, update the old doc or add a row to `KNOWN-LIMITATIONS-AND-DISCREPANCIES.md`.

## 4. Review count

158 legacy documents exist under `docs/`. For this app 72 contain the string `frontend-doctor` (including docs written by sibling documentation agents). Read with real depth: about 6 (IMPLEMENTATION-STATUS, PRODUCTION-READINESS-AUDIT, doctor-dashboard-2 README, doctor-onboarding README, the specialization bugfix, plus CI files); skimmed by headings/status: about 20 READMEs; the rest located by search only.
