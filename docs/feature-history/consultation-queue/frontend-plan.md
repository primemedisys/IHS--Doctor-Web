# Consultation queue — frontend plan

🔵 Planned. Three apps change. Every one is Next.js 16 + MUI + TanStack Query, with the same
`constants/api.ts` → `features/*/services` → `features/*/hooks` → component layering.

The visible change is small and specific: **a grid of times becomes a card describing a day.**

---

## 1. The shape of the change, in one picture

```
BEFORE                                   AFTER
┌ Select a date ─────────────┐           ┌ Select a day ──────────────┐
│ [Mon 4] [Tue 5] [Wed 6] …  │           │ [Mon 4] [Tue 5] [Wed 6] …  │
├ Available times ───────────┤           ├ Sunrise Clinic ────────────┤
│ [10:00][10:15][10:30]      │    ⇒      │ 9:00 AM – 4:00 PM          │
│ [10:45][11:00]             │           │ 12 patients booked         │
│                            │           │ You'll be token #13        │
│  ← empty once 5 are taken  │           │ ~12 min per patient        │
└────────────────────────────┘           └────────────────────────────┘
```

---

## 2. `frontend-patient`

### 2.1 🟡 `features/doctors/components/BookingFlow.tsx` — the step that changes

The stepper label `"Choose slot"` becomes `"Choose day"`. Inside:

- `SlotStep` 🟡 → **`DayStep`**. The date chip row stays exactly as it is (it already computes
  `upcomingDates()` from the doctor's weekly days). The `slots.map(...)` button grid is **deleted**
  and replaced by a single **session card** per available window on the selected date:
  window, clinic name, `booked` count, `"You'll be token #N"`, and the expected minutes per patient.
- A doctor with **two windows that day** (Clinic A 9–4, Clinic B 7–9) renders two selectable cards —
  this is the doctor's core request and the UI must not assume one.
- `isFull` → the card is disabled with *"Fully booked — try another day"*. It is a **capacity** state,
  not an empty grid, so the patient is told why.
- `selectedTime` state 🟡 → `selectedSessionDate` (+ `clinicId`). `confirm()` sends no `startTime`.
- `PaymentStep` 🟡: the *When* row reads `"Thu 6 Aug · 9:00 AM – 4:00 PM · token #13"` instead of a
  clock time. Payment options, Razorpay handoff, the dev auto-confirm branch and every error path
  (`SLOT_TAKEN` → back to day step, `PROFILE_INCOMPLETE` → profile) are **unchanged**.
- `ConfirmedStep` 🟡: leads with the **token in a large chip**, then *"Track your position live in My
  Bookings"*. The video note changes from *"a joining link will be emailed"* to *"the Join button
  turns on when the doctor calls you in"*.

### 2.2 🔵 `features/booking/components/QueueCard.tsx` — the live piece

Rendered by `MyBookingsView.tsx` (`frontend-patient/src/features/booking/components/MyBookingsView.tsx`) 🟡
for any confirmed booking whose session is **today**, and on the appointment detail page. Polls
`useBookingQueue` and renders exactly one of six states:

| State | Renders |
|---|---|
| Session not started | `Token #6` · *"Clinic opens at 9:00 AM"* |
| Waiting, doctor idle | `Token #6` · **"3 ahead of you"** · *"about 35 min"* |
| Waiting, doctor consulting | the above + a pulsing dot: **"Doctor is with another patient (now serving #2)"** |
| Session paused | *"The doctor has stepped away — you'll keep your place"* |
| **Your turn** (`serving`) | full-width success panel: **"It's your turn"** + `Join video call` for online |
| Done / skipped / ended | the card disappears; the ordinary appointment row remains |

The number that must be unmissable is **position**, not the token — that is the one the doctor
described counting down. The token is secondary, shown small, because it never changes.

### 2.3 🔵 Data layer

| File | Change |
|---|---|
| `constants/api.ts` 🟡 | `doctors.slots` → `doctors.sessions`; add `bookings.queue(id)` |
| `constants/queryKeys.ts` 🟡 | `doctorSlots` → `doctorSessions`; add `bookingQueue(id)` |
| `features/doctors/hooks/useDoctorSlots.ts` 🟡 | → `useDoctorSessions.ts` (same shape: params + `enabled`) |
| `features/booking/hooks/useBookingQueue.ts` 🔵 | `refetchInterval` from the response's `pollSeconds`, `refetchIntervalInBackground: false`, `enabled` only while the session is today and not ended |
| `features/doctors/services/doctor.service.ts` 🟡 | `fetchSlots` → `fetchSessions` |
| `types/booking.ts` / `types/doctor.ts` 🟡 | `Session`, `QueueView`, `queueNumber`/`queueState` on `Booking`; drop `slots: string[]` |

Polling discipline: one query per *booking*, not per card; disabled when the tab is hidden (TanStack
does this by default with `refetchIntervalInBackground: false`); stopped the moment `queueState`
reaches `done`/`skipped` or the session ends. A patient with three appointments today polls three
cheap endpoints every 20 s — acceptable; anything heavier needs the websocket layer this feature
explicitly defers.

---

## 3. `frontend-doctor`

### 3.1 🔵 The queue console — `/dashboard/queue`

A new page and a new sidebar entry in
[`features/dashboard/nav.ts`](../../../src/features/dashboard/nav.ts), placed directly
under **Appointments** (`icon: "FiList"`, `requiresLive: true`) — the same one-line addition
`Follow-up options` used.

```
┌ Today · Sunrise Clinic · 9:00 AM – 4:00 PM ───────── [ Start session ] ┐
│  IN CONSULTATION                                                       │
│  #4  Ramesh Kumar · 34 yrs          started 6 min ago   [ Complete ]  │
│                                                          [ Skip ]      │
├ WAITING · 7 ──────────────────────────────────────────────────────────┤
│  #5  Sunita Devi · 51 yrs · +91…              [ Call in ]   [ Skip ]   │
│  #6  Arya Sunirmal · 23 yrs                   [ Call in ]   [ Skip ]   │
│  …                                                                     │
├ DONE · 3 ─────────────────────────────────────── avg 11 min / patient ┤
└───────────────────────────────────────────────────────────────────────┘
```

- **One primary action at a time.** While someone is being consulted, the only prominent buttons are
  *Complete* and *Skip*; `Call in` on the waiting rows is secondary and 409s with
  `QUEUE_ALREADY_SERVING` if the doctor forgets.
- **Session controls**: `Start session` → `Pause` / `End`. A day-tab strip when the doctor has more
  than one session (Clinic A morning, Clinic B evening).
- **Cap for today**: a small `Max patients` field writing `PATCH /doctor/sessions/:id`, so a doctor
  can close today's list without editing their weekly template.
- Polls the same way the patient does (20 s) so a second device or the clinic's front desk stays in
  sync. Every action optimistically updates and then invalidates `sessionQueue`.
- Reuses the roster row from the appointments board — avatar, name, age, phone, address — rather
  than inventing a second patient cell.

New feature folder `features/queue/{components,hooks,services}` mirroring `features/follow-ups`.

### 3.2 🟡 `features/doctor/components/WeeklyScheduleEditor.tsx`

The editor that publishes the windows. Three edits, no restructuring:

- The **`Slot` dropdown** (10/15/20/30/45/60 min) is relabelled **`Avg mins/patient`** with the
  helper *"Used to estimate waiting times. It no longer limits how many patients can book."* Same
  values, same field, new meaning — this is the single control most likely to be misread, so the
  copy carries the explanation.
- A new optional **`Max patients`** number field per day (blank = unlimited).
- The `DEFAULT_ROW` comment and the component docblock are rewritten: a row is a **consulting
  window**, not a slot generator.

`AvailabilityStep`/`AvailabilityManager` 🟡 get one line of subtitle: *"Patients book a day at this
clinic and receive a token — they don't pick a time."*

### 3.3 🟡 The appointments board

| File | Change |
|---|---|
| [`AppointmentsBoard.tsx`](../../../src/features/appointments/components/AppointmentsBoard.tsx) | `WHEN` column shows `9:00 AM – 4:00 PM` + a `#6` token chip; rows sort by token within a day; a `Today's queue →` link into the console |
| [`RescheduleDialog.tsx`](../../../src/features/appointments/components/RescheduleDialog.tsx) | the time picker becomes a **session picker** — date → available window(s); the confirm copy says the patient moves to the **end of that day's queue** |
| `AppointmentDetailDialog.tsx` | token + queue state chip; `Call in` / `Skip` when the booking is in today's active session |
| `appointment-format.ts` | `formatWhen()` renders a window + token instead of a start time |

### 3.4 🟡 Data layer

`constants/api.ts` (`sessions.*`), `constants/queryKeys.ts` (`sessions`, `sessionQueue`),
`constants/routes.ts` (`dashboard.queue`), `types/appointment.ts` (`queueNumber`, `queueState`,
`session`).

---

## 4. `frontend-clinic`

The clinic portal books on a patient's behalf and must not be left on a deleted endpoint.

- `features/patients/components/BookAppointmentDialog.tsx` (`frontend-clinic/src/features/patients/components/BookAppointmentDialog.tsx`) 🟡 —
  same slot-grid → session-card swap as §2.1, minus the payment-mode branch it already handles.
  On success it shows the token, because the front desk will write it on the patient's card.
- `services/clinic.service.ts`, `constants/api.ts`, `constants/queryKeys.ts`, `types/clinic.ts` 🟡 —
  `doctorSlots` → `doctorSessions`.
- `features/patients/components/tabs/AppointmentsTab.tsx` 🟡 — window + token in the When column.

No queue console here. A clinic seeing another clinic's live queue is out of scope, and the front
desk can read the token off the patient's confirmation.

---

## 5. Copy that has to be right

Patients have never seen a token system in this app. The words do more work than the layout:

| Where | Text |
|---|---|
| Day step | *"Dr. Sharma sees patients in the order they book. You'll get a token number and can track your turn live."* |
| Full session | *"Fully booked for Thursday — try another day."* |
| Queue card, waiting | *"3 patients ahead of you · about 35 min"* — never a precise clock time |
| Queue card, busy | *"Doctor is with another patient"* |
| Your turn, clinic | *"You're next — please go in."* |
| Your turn, video | *"The doctor is ready for you."* + Join |
| Reschedule notice | *"Your appointment moved to Friday. You're token #4 for that day."* |

Every estimate is prefixed **"about"**, and the ETA is never rendered as a wall-clock time — a
patient told "10:42" will treat it as an appointment.

---

## 6. Deletions

Removing these is part of the work, not a follow-up — a dead slot path is how the old cap sneaks
back:

- `useDoctorSlots.ts`, `fetchSlots`, the `slots: string[]` types, and every `SlotStep` grid in all
  three apps.
- `timeLabel()` usages that render a booking's start time as *the appointment time* (the helper stays
  for session windows).
