# Bug fixes 18/07/2026 — Frontend

**Read `README.md` first.** Legend: 🟢 exists · 🟡 extend · 🔵 new.

---

## 1. All three apps — session & freshness

### 1.1 `providers/query-client.ts` 🟡 (patient · doctor)

```ts
staleTime: 30 * 1000,          // was 60s
refetchOnWindowFocus: true,    // was FALSE — the whole bug
refetchOnReconnect: true,
```

`refetchOnWindowFocus: false` is why nothing refreshed without a reload. The two sides of a consultation are **different browsers**, so this app cannot know its cache went stale — returning to the tab is the moment a user expects current data.

Event-driven, **not polling**: an idle tab makes zero requests. `staleTime` came down because at 60s a quick tab switch would still serve stale data.

### 1.2 `services/api.ts` 🟡 (patient · doctor · admin)

The refresh interceptor's `catch { tokenStorage.clear() }` ended the session on *anything* — a 429, a 5xx, a dropped connection. Now:

```ts
// Another TAB may have refreshed while this call was in flight.
const current = tokenStorage.getRefreshToken();
if (current && current !== refreshToken) return tokenStorage.getAccessToken() ?? null;

// Only a genuine auth rejection ends the session.
if (status === 401 || status === 403) tokenStorage.clear();
```

The single-flight queueing already present handles concurrent 401s *within* a tab; the storage re-read handles the race *across* tabs.

---

## 2. Patient app (3000)

| Area | Change |
|---|---|
| `features/timeline/` 🔵 | `TreatmentTimelinePage`, `TreatmentTimelineTable`, `TimelineToolbar`, hooks + service, `types/timeline.ts` |
| `app/(dashboard)/dashboard/timeline/page.tsx` 🔵 | Route shell |
| `features/dashboard/nav.ts` 🟡 | "Treatment timeline" directly after Appointments |
| `features/health/vitalStatus.tsx` 🔵 | Status → colour map + `VitalValueCell` + legend |
| `features/health/components/HealthRecordTable.tsx` 🟡 | Colouring, ordering, responsive layout |
| `features/health/components/ReportViewerDialog.tsx` 🟡 | Pan/zoom image viewer |
| `features/health/components/UploadedReportsSection.tsx` 🟡 | Widened `accept` |
| `features/prescriptions/components/PrescriptionPdfDialog.tsx` 🟡 | Prop widened to `ViewablePrescription` |

### 2.1 Timeline filters live in the URL

`?year=&month=&sort=` rather than component state, so a filtered view is shareable, survives a refresh, and the Back button steps through filters instead of leaving the page.

Two **distinct** empty states: "no consultations yet" (with a *Find a doctor* CTA) vs "no consultations in this period" (with *Clear filters*). Conflating them makes an over-filtered view look like an empty medical record.

### 2.2 Nav icon

Changed from `FiActivity` to `FiClock`. It was identical to Health snapshot directly beneath it — two matching icons adjacent in one group are hard to scan — and a clock reads as "history".

### 2.3 `PrescriptionPdfDialog` prop widened

It only reads `id`, `rxNumber` and `diagnosis`, but demanded a full `Prescription`. Typed structurally as `ViewablePrescription` so the timeline doesn't have to fabricate a whole object to open the viewer.

---

## 3. Doctor app (3001)

| Area | Change |
|---|---|
| `features/timeline/` 🔵 | `PatientHistoryView`, `MyPatientsTable`, table + toolbar, hooks + service |
| `app/…/appointments/[id]/history/page.tsx` 🔵 | Booking-keyed history page |
| `app/…/patients/page.tsx` + `[patientId]/page.tsx` 🔵 | Roster + patient-keyed history |
| `features/dashboard/nav.ts` 🟡 | "My Patients", `requiresLive: true` |
| `app/…/appointments/[id]/call/page.tsx` 🟡 | **History** button |
| `features/appointments/components/RescheduleDialog.tsx` 🔵 | Reschedule UI |
| `features/appointments/components/AppointmentDetailDialog.tsx` 🟡 | Reschedule button + dialog mount |
| `features/appointments/components/PatientDescriptionView.tsx` 🟡 | History section, consultation banner, read-only mode |
| `features/appointments/vitalStatus.tsx` 🔵 + `HealthRecordTable.tsx` 🟡 | Vitals colouring, ordering, responsive |
| `features/appointments/components/ReportViewerDialog.tsx` 🟡 | Pan/zoom |
| `features/prescriptions/components/MedicineTable.tsx` 🟡 | Duration unit selector |
| `features/prescriptions/components/RxComposer.tsx` 🟡 | Today-only vitals prefill |
| `features/prescriptions/components/{RxPreview,PrescriptionView}.tsx` + `rx-format.ts` 🟡 | `durationText()` helper |

### 3.1 The History button must not tear down the live call

The call page owns the LiveKit connection, and `onDisconnected` navigates the doctor off the page — so **anything that unmounts `ConsultationRoom` drops a real consultation**. History therefore uses the existing `openInNewTab`, exactly like Description and Prescription beside it.

**Rule:** never `router.push` or a bare `<Link>` on that page.

### 3.2 Read-only prescriptions when arriving from history

`?from=history` on the Details link puts `PrescriptionActionButton` in `readOnly` mode: *View prescription* still works, *Write* / *Continue draft* become text pointing at the correct appointment.

Scoped to that entry point deliberately — the same page is also reached from the appointments list and the call's Description button, where writing a prescription is the normal thing to do. Removing the action globally would have broken both.

The consultation is also **named** above the action (date chip, status chip, amber *"Past consultation — not today"*), so prescribing there is a conscious choice.

> ⚠️ `useSearchParams()` requires a `Suspense` boundary. It works in dev and **fails `next build`** — the page shell wraps the view accordingly.

### 3.3 `RescheduleDialog`

Offers only the doctor's genuinely free slots for the chosen date, read from the same endpoint a patient books through. Mode and clinic are **not** editable — a video consult stays a video consult; changing those would be a different appointment.

🐞 The service translates the vocabulary: the app says `video`, availability says `online`, and `clinicId` is **forbidden** (not merely optional) when online — sending it 422s. Getting this wrong broke the picker for every video consult.

The doctor id comes from `useAuth()`: an `Appointment` carries none, because it is the doctor's own list.

### 3.4 Query keys kept distinct

`["doctor","timeline","booking",id]` vs `["doctor","timeline","patient",id]`. Both return the same shape, so a shared key would let a cached booking-scoped result be served to the patient-scoped page — showing one patient's history under another's name.

### 3.5 Medicine duration

A count box plus a **Unit** dropdown. `durationText(count, unit)` in `rx-format.ts` is the one place the string is built — "days" had been hardcoded in three separate render paths.

### 3.6 Vitals prefill

Only readings recorded **today** carry over. The caption explains the blank fields in amber; without it a doctor with a reading on file would assume the app lost it.

Date comparison avoids the classic bug: a bare `YYYY-MM-DD` is **not** passed through `new Date()`, which parses it as UTC midnight and lands a day earlier west of Greenwich.

---

## 4. Shared UI work (both apps)

### 4.1 Vitals colouring — presentation only

`vitalStatus.tsx` holds the status → colour map and nothing else. **If a clinical number ever appears in a `.tsx` file, the implementation is wrong** — the same table renders in two apps and two copies of the thresholds would drift.

- `unknown` renders **exactly like** `normal` — plain. It means "not evaluated" and must never read as a verdict.
- Colour is never the only channel: arrows for direction, a ring for `critical`, tooltips naming the band and its range. Roughly 1 in 12 men has a red-green deficiency, and WCAG 1.4.1 forbids colour alone.
- Theme palette tokens, never hex — both apps render light and dark.
- The patient's copy carries the "not a diagnosis" disclaimer; the doctor's does not (a clinician reading reference ranges is the intended audience). Both carry the legend.

### 4.2 Health record table

- **Newest first.** The table had been reversing the API's order and auto-scrolling to the bottom; both removed.
- **Fits any width.** `minWidth: 680` + `tableLayout: auto` made nine columns exceed the container. Now `tableLayout: fixed` (columns *share* the width), no `minWidth`, `overflowX: hidden`, units stacked under labels, padding and font stepped by breakpoint.
- **Below `md` it becomes cards.** Nine columns cannot be read on a phone at any legible size; squeezing them to ~40px each would be worse than a different layout.

### 4.3 Pan/zoom image viewer

`ReportViewerDialog` detects images by extension and renders a viewer; PDFs keep the iframe so the browser's reader does the work.

- `overflow: hidden` + `object-fit: contain` — no scrollbars, whole image visible
- Zoom via `+`/`−`, wheel and double-click, live % (100–600 %)
- **Click-and-hold to drag** via Pointer Events, so touch-drag works on tablets
- Panning activates only once zoomed in — dragging an already-fitted image just slides it off screen
- The transform transition is disabled *during* a drag, or panning feels laggy
- `touch-action: none` stops the browser panning underneath
- A new image opens fitted via `key`-based remount, not a reset effect (which would be a cascading render)

---

## 5. Hygiene

All three apps pass `tsc --noEmit` and ESLint on every touched file. The only remaining lint errors are two **pre-existing** unescaped-quote warnings in `frontend-patient/.../DoctorProfile.tsx`, untouched by this work.
