# Treatment Timeline — Frontend Plan

**Read `README.md` first.** Legend: 🟢 exists · 🟡 extend · 🔵 new.

---

## 1. Patient app (`frontend-patient`, :3000)

### 1.1 Sidebar entry 🟡

`features/dashboard/nav.ts` — one item in the **Medical** group, above *Records* (it is the most-reached-for of the three):

```ts
{ label: "Treatment timeline", href: ROUTES.dashboard.timeline, icon: "FiActivity" },
```

`constants/routes.ts` 🟡 → `timeline: "/dashboard/timeline"`.
`constants/api.ts` 🟡 → `patient: { timeline: "/patient/timeline" }`.

The shell already highlights the active route off `flatDashboardNav()`, so no shell change.

### 1.2 Route shell 🔵 `app/(dashboard)/dashboard/timeline/page.tsx`

Thin, matching the sibling pages: render `<TreatmentTimelinePage />`.

### 1.3 The page 🔵 `features/timeline/components/TreatmentTimelinePage.tsx`

```
┌─────────────────────────────────────────────────────────────────────┐
│  Treatment timeline                                                  │
│  Every consultation you've had, newest first.                        │
│                                                                      │
│  ┌ Year ▾ ┐ ┌ Month ▾ ┐ ┌ Newest first ▾ ┐        24 consultations  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Date      │ Location      │ Doctor     │ Issue    │ Prescription│ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ …                                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

States: `Loading` while fetching · `ErrorState` with retry · `EmptyState` (icon `FiActivity`, "No consultations yet", CTA → *Find a doctor*) when the patient has none · a distinct "No consultations in <filter>" empty state when filters exclude everything, with a **Clear filters** action. Those two are different messages — conflating them makes an over-filtered view look like an empty record.

### 1.4 Toolbar 🔵 `TimelineToolbar.tsx`

Three MUI `Select`s: **Year** (options from the response's `years` + "All years"), **Month** (Jan–Dec + "All months"), **Sort** (Newest / Oldest first).

Filter state lives in the **URL query string** (`?year=2026&month=7`), not component state — so a filtered view is shareable, survives refresh, and the browser Back button steps through filters. `useSearchParams` + `router.replace`.

Each change refetches (the query key includes the filters); server-side filtering per README §7-C.

### 1.5 The table 🔵 `TreatmentTimelineTable.tsx`

MUI `Table`, `size="small"`, inside `<Box sx={{ overflowX: "auto" }}>` — five columns is wide on mobile, and the **page body must never scroll horizontally**.

| Column | Rendering |
|---|---|
| **Date** | `02 Jul 2026` bold, `10:30 AM` beneath in `caption` |
| **Location** | Clinic name + city in `caption`. `mode === "video"` → a `<Chip size="small" icon={<FiVideo/>} label="Video consultation" />` |
| **Doctor** | Name + specialization in `caption` |
| **Issue** | Text, `maxWidth: 280`, 2-line clamp, full text in a `Tooltip` |
| **Prescription** | `rxNumber` + a **View PDF** `Button` (`startIcon={<FiFileText/>}`); `null` → muted `—` |

Mobile (`xs`): below `sm` the table collapses to a stacked card list — five columns cannot be read on a phone, and horizontal scrolling a medical history is hostile.

### 1.6 View PDF — reuse, don't rebuild 🟢

`features/prescriptions/components/PrescriptionPdfDialog.tsx` already takes a `Prescription`, fetches the blob via `usePrescriptionPdf`, renders the `<iframe>`, and offers Download. The timeline holds `selectedRx` state and mounts that dialog.

Its prop type is the full `Prescription`; the timeline row carries only `{ id, rxNumber }`. Widen the dialog's prop to the minimum it actually reads (`id`, `rxNumber`, `diagnosis?`) rather than fabricating a fake `Prescription` — the dialog only uses those three for the title and the fetch.

---

## 2. Doctor app — the patient page (`frontend-doctor`, :3001)

### 2.1 Where it goes 🟡

`features/appointments/components/PatientDescriptionView.tsx` — the page the doctor already opens to read this patient. Add a **"Treatment history"** section after the vitals record table and before uploaded reports, so the reading order is *who they are → current numbers → past care → their documents*.

Collapsed by default behind an `Accordion` showing `"Treatment history (12 consultations)"`. The doctor came here for *this* consult; prior history is reference, and an always-expanded 12-row table buries the rest of the page.

**No new route. No new sidebar entry.**

### 2.2 The table 🔵

Same five columns. Two deliberate differences:

1. **Rows from other doctors are visually marked** — the current doctor's own rows get no chip; other doctors' rows get a subtle `variant="outlined"` chip. A doctor must be able to tell at a glance which care was theirs.
2. **The Prescription cell obeys README §7-A.** Under the recommended **(b) metadata-only**, it renders `rxNumber` as plain text with a `Tooltip`: *"Prescription on file — viewable by the patient."* No button, and the backend does not send an id to call with.

If **(a) full access** is chosen instead, wire `RxPdfPreviewDialog.tsx` 🟢 exactly as the patient app wires its dialog.

### 2.3 Data 🔵

`features/timeline/hooks/useTreatmentTimeline.ts` → `GET /doctor/patients/:patientId/timeline`.
Query key `["doctor", "timeline", patientId, filters]`.
`patientId` comes from the booking already loaded on the page — no extra lookup.

---

## 3. Doctor app — during a live video consultation 🟡

**Read README §5.3.** Decided: **new tab**. The video call keeps running untouched in its own tab; **History** opens the patient's timeline in a second tab.

### 3.1 Why this is the safe shape

`app/(dashboard)/dashboard/appointments/[id]/call/page.tsx` renders `<ConsultationRoom>`, which owns the `<LiveKitRoom>` connection. **Unmounting it disconnects the call**, and `onDisconnected={onLeave}` then navigates the doctor off the consult entirely.

That is exactly why the existing **Description** and **Prescription** buttons call `window.open(..., "_blank")` instead of `router.push` — the comment above the call page's `openInNewTab` says so outright.

Following that pattern means the call page changes by **one button and nothing else**. No new state, no portal, no conditional rendering around the room, no remount risk. The safest change to a live-call surface is the one that doesn't touch its render tree.

**The only rule:** the History button must go through `openInNewTab`, never `router.push` and never a `<Link>` without `target="_blank"`. A same-tab navigation here drops a real doctor–patient consultation.

### 3.2 The button 🟡

One more entry in the existing top action bar, first in the group (it is the one reached for mid-sentence):

```tsx
<Button
  variant="outlined"
  startIcon={<FiClock />}
  onClick={() => openInNewTab(ROUTES.dashboard.patientHistory(bookingId))}
  sx={{ textTransform: "none", fontWeight: 700 }}
>
  History
</Button>
```

`constants/routes.ts` 🟡 → `patientHistory: (id) => \`/dashboard/appointments/${id}/history\`` — sitting alongside the existing `patientDescription` and `writePrescription` helpers.

### 3.3 The history page 🔵 `app/(dashboard)/dashboard/appointments/[id]/history/page.tsx`

A full-width page, **not** a cramped panel — this is the whole benefit of the new-tab decision:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to appointment                                              │
│  Treatment history · Ramananda Pattnaik                             │
│  Previous consultations across all doctors.                         │
│                                                                     │
│  ┌ Year ▾ ┐ ┌ Month ▾ ┐ ┌ Newest first ▾ ┐         12 consultations │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Date   │ Location   │ Doctor   │ Issue    │ Prescription      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

- Renders the **same `TreatmentTimelineTable`** as §2.2 — all five columns, plus the year/month toolbar, which the doctor now has room for.
- Subtitle **"Previous consultations across all doctors"** — per README §7-H the in-progress booking is excluded, and the page should say so rather than leave the doctor wondering where today's row went.
- **View PDF works normally here** (subject to README §7-A). The call is in another tab, so `RxPdfPreviewDialog` 🟢 mounts with nothing to disturb.
- Opened cold in a fresh tab, so it loads its own data — it cannot rely on the other tab's React Query cache.
- The page must stand alone: it reads `bookingId` from the URL and resolves the patient itself, since the doctor may land here directly from a bookmark or a reload.

### 3.4 Reuse

Same hook as §2.3 and the same table as §2.2. The new-tab decision means this phase is a **route shell + one button** — no new presentational component, and nothing to test against a live call beyond "the call is still connected in the other tab."

The patient page (§2.1) gets a **View full history** link to the same route, so the page has two entry points and one implementation.

---

## 4. Doctor app — My Patients, outside a call 🔵

**Read README §5.4.** This is the doctor app's **first patients concept** — there is no roster, route or endpoint today, so it is the largest remaining piece.

### 4.1 Sidebar entry 🟡

`features/dashboard/nav.ts`, after *Appointments*:

```ts
{ label: "My Patients", href: ROUTES.dashboard.patients, icon: "FiUsers", requiresLive: true },
```

`requiresLive: true` matters — `visibleNav()` hides it during onboarding, and a doctor who is not yet approved has no patients by definition.

`constants/routes.ts` 🟡 → `patients: "/dashboard/patients"` and `patientTimeline: (id) => \`/dashboard/patients/${id}\``.

### 4.2 The roster 🔵 `app/(dashboard)/dashboard/patients/page.tsx` + `MyPatientsTable.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  My Patients                                                 │
│  Everyone you've consulted, most recent first.               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Patient              │ Consultations │ Last seen     │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ 🧑 Ramananda Pattnaik │      4        │ 02 Jul 2026   │    │
│  │ 🧑 Sunita Das         │      1        │ 18 Jun 2026   │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

- Avatar + name, consultation count, last-seen date. Whole row is clickable → `/dashboard/patients/[patientId]`.
- Sorted most-recently-seen first (the backend does this).
- Empty state: *"No patients yet — they'll appear here after your first completed consultation."*
- `capped: true` → footer note, same treatment as the timeline (§1.5).
- **No search box in v1** (README: roster search is a follow-up). If a doctor's list grows past a screenful this is the first thing to add.

### 4.3 The patient-keyed history page 🔵 `app/(dashboard)/dashboard/patients/[patientId]/page.tsx`

Renders the **same `TreatmentTimelineTable`** as §2.2 and §3.3 — the third and last placement of one component. Only the hook differs: patient-keyed rather than booking-keyed.

Header shows the patient's name with a **← Back to My Patients** link.

### 4.4 Hooks 🔵

```ts
useMyPatients()                          // GET /doctor/patients
useTimelineByBooking(bookingId, filters) // GET /doctor/bookings/:id/patient-timeline   (§3)
useTimelineByPatient(patientId, filters) // GET /doctor/patients/:id/timeline           (§4.3)
```

The two timeline hooks return the identical `TimelineResult` and feed the identical table — keep their query keys distinct (`["doctor","timeline","booking",id]` vs `["doctor","timeline","patient",id]`) so a cached booking-scoped result is never served to the patient-scoped page or vice versa.

---

## 5. Shared shape

Both apps get a `types/timeline.ts` 🔵 mirroring `serializeTimelineRow` exactly:

```ts
export interface TimelineRow {
  bookingId: string;
  date: string;                 // "YYYY-MM-DD"
  startTime: string | null;     // "HH:mm"
  mode: "clinic" | "video";
  location: { name: string; city: string | null } | null;
  doctor: { id: string; name: string; specialization: string | null };
  issue: string | null;
  prescription: { id: string | null; rxNumber: string; canView: boolean } | null;
}
export interface TimelineResult { rows: TimelineRow[]; years: number[]; total: number; capped: boolean }
```

Per README §7-E the table component is duplicated across the two apps, matching the existing `HealthRecordTable.tsx` precedent. The **types and the API contract** stay identical so the two can be unified later without a data migration.

---

## 6. Accessibility & polish

- Real `<caption>` on the table (visually hidden) naming what it lists.
- The **View PDF** button's accessible name includes the Rx number — a screen-reader user hitting eight identical "View PDF" buttons has no idea which is which.
- The video-consultation chip must not rely on colour alone; it carries an icon and a text label.
- `capped: true` renders a footer note: *"Showing your 200 most recent consultations."* Silently truncating a medical history is not acceptable.
- The **History** button opens a new tab, which some screen readers announce and some do not. Give it `aria-label="Open treatment history in a new tab"` so the context switch is never a surprise — the same courtesy the existing Description/Prescription buttons should get.
- The history page needs its own `<title>`/`<h1>` naming the patient, since it opens detached from the call and a doctor with several tabs open must be able to tell them apart.
