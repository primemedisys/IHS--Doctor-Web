# Frontend Plan — Multi-Doctor Referrals & Care Journey

**Apps:** `frontend-doctor/` (the *refer* action) · `frontend-patient/` (the *care journey* view). **Legend:** 🟢 existed · 🟡 extended · 🔵 new.

Both apps are Next.js + MUI + React Query, and both already have the feature-folder shape (`features/<name>/{components,hooks,services}` + `types` + `constants/{api,queryKeys,routes}`). This plan follows it exactly — no new patterns.

---

# Part A — Doctor app: "Refer to another doctor"

The doctor already opens a patient's full **Description page** (`appointments/[id]/patient/page.tsx` → `PatientDescriptionView.tsx`) where they write clinical notes and reach the prescription. The **Refer** action lives right there, next to those, because a referral is made *in the same breath* as finishing the reports + Rx.

## A1. Types — `types/referral.ts` (🔵)

```ts
export type ReferralStatus = "pending" | "booked" | "completed" | "cancelled" | "declined";

export interface ReferralTarget {           // one autocomplete suggestion
  id: string; name: string; photo: string | null;
  specializations: string[]; clinicName: string | null; sameClinic: boolean;
}
export interface Referral {
  id: string; journeyId: string; status: ReferralStatus; reason: string; note: string | null;
  fromDoctor: { id: string; name: string };
  toDoctor: { id: string; name: string; slug: string; specialization: string | null; photo: string | null };
  sourceBookingId: string; targetBookingId: string | null; createdAt: string;
}
export interface CreateReferralInput { toDoctorId: string; reason: string; note?: string }
```

## A2. Wiring — `constants/api.ts` · `constants/queryKeys.ts` (🟡)

```ts
// api.ts
doctor.referralTargets: (q, clinicId?) => `/doctor/referral-targets?q=${...}${clinicId ? `&clinicId=${clinicId}` : ""}`,
doctor.bookingReferrals: (id) => `/doctor/bookings/${id}/referrals`,
doctor.referral:        (id) => `/doctor/referrals/${id}`,
// queryKeys.ts
referrals.targets: (q, clinicId) => ["referrals","targets",q,clinicId] as const,
referrals.forBooking: (bookingId) => ["referrals","booking",bookingId] as const,
```

## A3. Service — `features/referrals/services/referral.service.ts` (🔵)

`listTargets(q, clinicId?) → ReferralTarget[]`, `createReferral(bookingId, input) → Referral`, `listBookingReferrals(bookingId) → Referral[]`, `cancelReferral(id) → Referral`. Thin `api` wrappers over §A2, unwrapping the `{ data }` envelope like every other service.

## A4. Hooks — `features/referrals/hooks/*` (🔵)

- **`useReferralTargets(q, clinicId)`** — `useQuery` keyed on the **debounced** `q` (250 ms), `enabled: q.trim().length >= 1`, `keepPreviousData: true` so the list doesn't flicker while typing. This is the *"type a first name → suggestions"* engine.
- **`useCreateReferral(bookingId)`** — `useMutation`; on success `invalidate(referrals.forBooking(bookingId))` and toast *"Referral sent to Dr. X"*.
- **`useBookingReferrals(bookingId)`** — `useQuery` for the already-made referrals list.

## A5. `ReferDoctorDialog.tsx` (🔵) — the name autocomplete

An MUI **`Autocomplete`** in async mode — the crux of the request. Sketch:

```
┌ Refer to another doctor ─────────────────────────────┐
│  Doctor        [ Pus|                    ]  🔍        │  ← type a name → live suggestions
│                ┌──────────────────────────────────┐  │
│                │ 🩺 Dr. Puspak Samal               │  │
│                │    Orthopedics · City Clinic  ●same│  │  ← "same clinic" badge (Decision 9.2b)
│                │ 🩺 Dr. Puja Nayak                 │  │
│                │    Neurology · Metro Clinic       │  │
│                └──────────────────────────────────┘  │
│  Reason *      [ MRI + neuro opinion for … ]          │  ← required, ≥3 chars
│  Note (opt.)   [ … extra context for the doctor  ]    │
│                              [ Cancel ]  [ Send ✓ ]   │
└───────────────────────────────────────────────────────┘
```

- `inputValue` drives `useReferralTargets(inputValue, sourceClinicId)`; `options = targets`; `getOptionLabel = (t) => t.name`; a custom `renderOption` shows photo + name + `specializations.join(", ")` + clinic, with a small **"same clinic"** chip when `sameClinic`.
- On select → `setToDoctorId(option.id)`. **Send** is disabled until a doctor is chosen and `reason.length >= 3`; it calls `useCreateReferral(bookingId).mutate({ toDoctorId, reason, note })`, closes on success.
- Errors map through `getErrorMessage` (e.g. `REFERRAL_TARGET_INVALID` → *"You can't refer to this doctor"*).

`sourceClinicId` comes from the booking already loaded on the description page (`booking.clinic?.id`), passed as a prop.

## A6. `ReferralsList.tsx` (🔵)

Reads `useBookingReferrals(bookingId)`; renders each referral as a compact row: *"→ Dr. X (Neurology) · reason · "* + a status chip (`pending`/`booked`/…). A `pending` one shows a **"Cancel"** button (`cancelReferral`). Empty state: *"No referrals from this consultation yet."*

## A7. Mount points (🟡)

- **`PatientDescriptionView.tsx`** — primary home. Add a **"Refer to another doctor"** button in the same action cluster as the prescription button + `ClinicalNotesSection`, opening `ReferDoctorDialog`; render `ReferralsList` beneath. Gated on the booking being `confirmed`/`completed` (same condition the notes/Rx use).
- **`AppointmentDetailDialog.tsx`** — *optional* convenience: the same **Refer** button as a quick action beside "Write prescription". The dialog already `router.push`es to the description page, so this is a shortcut, not a second implementation.

---

# Part B — Patient app: the Care Journey

Two surfaces: a **referral inbox** ("you've been referred — book Dr. B") and the **journey timeline** ("the whole flow"). Both read from `/patient/journeys`.

> **Read the `dataviz` skill before building the timeline** (per its trigger — this is a dashboard/flow visualization). Use its palette + one-system guidance so the journey reads cleanly in light **and** dark. The timeline is the "good and proper graphical representation" the request asks for.

## B1. Types — `types/journey.ts` (🔵)

```ts
export interface JourneySummary {
  id: string; title: string | null; status: "open" | "closed";
  doctorCount: number; consultationCount: number; lastActivityAt: string; createdAt: string;
}
export interface JourneyConsultation {
  bookingId: string; date: string; status: BookingStatus;
  doctor: { id: string; name: string; slug: string; photo: string | null; specialization: string | null };
  clinic: { id: string; name: string } | null;
  reports: ClinicalNote[];                 // reuse the existing patient ClinicalNote type
  prescription: { id: string; rxNumber: string; pdfUrl: string | null } | null;
}
export interface JourneyEdge {
  referralId: string; fromBookingId: string; toBookingId: string | null;
  reason: string; status: ReferralStatus;
}
export interface JourneyDetail extends JourneySummary {
  consultations: JourneyConsultation[]; edges: JourneyEdge[];
}
export interface PendingReferral {         // the inbox item
  id: string; reason: string;
  fromDoctor: { name: string }; toDoctor: { name: string; slug: string; specialization: string | null; photo: string | null };
}
```

## B2. Wiring — `constants/{routes,api,queryKeys}.ts` (🟡)

```ts
// routes.ts
dashboard.journeys: "/dashboard/journeys",
dashboard.journey: (id) => `/dashboard/journeys/${id}`,
// api.ts
patient.journeys: "/patient/journeys",
patient.journey: (id) => `/patient/journeys/${id}`,
// queryKeys.ts
journeys.all: ["journeys"], journeys.detail: (id) => ["journeys", id],
```

## B3. Service + hooks (🔵)

`journey.service.ts`: `listJourneys() → { journeys, pendingReferrals }`, `getJourney(id) → JourneyDetail`. Hooks: `useJourneys()`, `useJourney(id)`.

## B4. `JourneyFlowStrip.tsx` (🔵) — the compact flow header

The at-a-glance "whole flow" — a horizontal chain of doctor avatars connected by arrows, plus a summary strip:

```
   👤 Dr. A ──▶ 👤 Dr. B ──▶ 👤 Dr. C          [ 3 doctors · 5 reports · 3 prescriptions ]
   Ortho        Neuro        Physio
```

Avatars are `doctor.photo` (fallback initials); the counts come from the summary. It scrolls horizontally inside its own `overflow-x:auto` container when the chain is long (per the responsive rule). Branches (a fan-out referral, Decision §9.7) render as a small split.

## B5. `CareJourneyTimeline.tsx` (🔵) — the main graphical view

A **vertical timeline** (MUI-styled, not necessarily `@mui/lab`) — one node per consultation, connected by an edge that carries the referral reason:

```
  ●  Dr. A · Orthopedics · City Clinic · 02 Jul 2026        [completed]
  │     ▸ Reports (2)     ← expandable: the ClinicalNote cards (reuse the notes view)
  │     ▸ Prescription    ← OSC-2026-000123  [ View PDF ]
  │
  ├─▶ referred to Dr. B — "MRI + neuro opinion"             ← the edge (JourneyEdge.reason)
  │
  ●  Dr. B · Neurology · City Clinic · 05 Jul 2026          [completed]
  │     ▸ Reports (1)     ▸ Prescription  NEU-2026-000045
  │
  ├─▶ referred to Dr. C — "physio + rehab plan"
  │
  ●  Dr. C · Physiotherapy · … · 09 Jul 2026                [confirmed]
        ▸ Reports (0)     ▸ Prescription (none yet)
```

Each node is a **`ConsultationCard`**; the connector between node *i* and *i+1* is labelled with the matching `edge.reason` (join `edges` on `fromBookingId → toBookingId`). Node status uses the existing booking status colours so it reads consistently with `MyBookingsView`.

## B6. `ConsultationCard.tsx` (🔵)

One doctor's node. **Reuses existing components** so there's no re-implementation:
- **Reports** — the same read-only `ClinicalNote` card list `MyBookingsView` already renders (extract its note-card into a shared `ConsultationNotes` presentational component, or duplicate the small renderer).
- **Prescription** — the existing `PrescriptionPdfDialog` + `useDownloadPrescription` from `@/features/prescriptions`; the card shows the rx number and a **View PDF** button when `prescription` is present, else *"No prescription for this visit."*
- Header: doctor avatar + name + specialization (links to `/doctors/[slug]`), clinic, date, status chip.

## B7. `ReferralInboxCard.tsx` (🔵) — "you've been referred"

For each `pendingReferral`: *"Dr. A referred you to **Dr. B** (Neurology) — reason: MRI + neuro opinion"* with a primary **[Book Dr. B]** button linking to `ROUTES.book(toDoctor.slug) + "?referralId=" + id` (see B9). Shown at the top of the journeys page and as a dashboard nudge.

## B8. Pages + dashboard (🔵🟡)

- `app/(dashboard)/dashboard/journeys/page.tsx` (🔵) — the pending-referral inbox + a list of `JourneyFlowStrip` cards linking to each detail.
- `app/(dashboard)/dashboard/journeys/[id]/page.tsx` (🔵) — `JourneyFlowStrip` header + the full `CareJourneyTimeline`.
- `features/dashboard/components/overviews.tsx` (🟡) — a **"Your care journeys"** card on `DashboardHome` (latest journey's flow strip + a pending-referral badge) linking to `/dashboard/journeys`. *(This is the file currently open in the IDE — the natural mount point.)*

## B9. Threading `referralId` through the booking flow (🟡)

The referral CTA deep-links to `/book/[slug]?referralId=<id>`. In `features/booking` (the `/book` flow that ends in `POST /patient/bookings`):
- Read `referralId` from the query string (alongside the existing `mode`/`clinic` params).
- Pass it into the booking-create payload (`{ ..., referralId }`). The backend links the new booking to the referral + journey (`backend-plan.md §7 linkBooking`).
- Optional nicety: show a *"Booking a referral from Dr. A"* banner atop the flow so the patient has context. No other booking-flow change — slot pick, payment, and confirmation are untouched.

---

## C. Build order (frontend)

1. **Doctor:** `types/referral` → api/keys → service → hooks (`useReferralTargets` debounced) → `ReferDoctorDialog` → `ReferralsList` → mount on `PatientDescriptionView`.
2. **Patient:** `types/journey` → api/keys/routes → service → hooks → `ConsultationCard` (reusing notes + Rx) → `CareJourneyTimeline` + `JourneyFlowStrip` → `ReferralInboxCard` → the two pages + dashboard card.
3. **Booking link:** thread `referralId` through `/book`.
4. **Typecheck:** `tsc --noEmit` + ESLint clean in both apps on touched files.

## D. Verification (frontend)

- **Doctor:** on a confirmed/completed appointment, "Refer to another doctor" opens the dialog; typing a name streams suggestions; "same clinic" badges show; sending creates a referral that appears in `ReferralsList` as `pending`; cancel flips it away.
- **Patient:** the inbox shows the pending referral with a working **[Book Dr. B]** link; after booking, the journey detail shows both consultations chained by the reason edge, each with its reports + prescription PDF; the flow strip counts doctors/reports/prescriptions correctly; the timeline renders correctly in **light and dark**, and scrolls (not the page body) when the chain is long.
