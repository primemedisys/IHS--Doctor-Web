# Vitals on Notes + Prescription Integration (add-on)

Extends the clinical-notes feature. Decisions locked with the user: **vitals in both** (kept on the prescription *and* added to notes; the prescription prefills from the latest note) and **finalize → reopen the appointment modal**. **Legend:** 🟢 existed · 🟡 extended · 🔵 new.

---

## 1. Vitals on clinical notes (backend)

Six columns added to `clinical_notes`, same shape/types as `prescriptions.*`:

| Column | Type | Note field |
|---|---|---|
| `blood_pressure` | VARCHAR(20) | BP (free text) |
| `pulse_rate_bpm` | SMALLINT UNSIGNED | Pulse |
| `weight_kg` | DECIMAL(5,2) | Weight |
| `height_cm` | DECIMAL(5,2) | Height |
| `temperature_f` | DECIMAL(4,1) | Temp °F |
| `spo2_percent` | TINYINT UNSIGNED | SpO₂ |

- **Model** `clinicalNote.model.js` 🟡 — the six camelCase attrs (`underscored` → snake_case).
- **Migration 009** 🟡 — columns added inline to the CREATE TABLE (fresh installs).
- **Boot shim** `db/ensureClinicalNoteVitals.js` 🔵 + `server.js` 🟡 — plain `sequelize.sync()` never ALTERs an existing table, so this idempotently adds any missing vitals column at dev boot (mirrors `ensureBookingLockKey`/`ensureRxCounters`). This is why the dev DB got the columns without a manual migration.
- **Validator** `clinicalNote.validator.js` 🟡 — a `vitals` object (BP string; the rest numeric with ranges); the "≥1 detail" rule now counts vitals too.
- **Service** `clinicalNote.service.js` 🟡 — `create` maps `data.vitals` onto the row.
- **Serializer** `serializeClinicalNote` 🟡 — returns a nested `vitals` object; DECIMALs coerced to numbers (mysql2 returns them as strings).

Request/response both carry `vitals: { bloodPressure, pulseRateBpm, weightKg, heightCm, temperatureF, spo2Percent }`.

## 2. Note form + modal (doctor)

- `ClinicalNoteForm.tsx` 🔵 — the shared add-note form: the six text fields **+ a Vitals row**. Enforces "≥1 detail"; on success hands the **created note** back (so callers can prefill vitals).
- `AddClinicalNoteModal.tsx` 🔵 — a Dialog wrapping the form; opened from the prescription composer.
- `ClinicalNotesSection.tsx` 🟡 — uses the shared form inline; the list is now a **one-at-a-time navigator**.

## 3. One-at-a-time navigation

Both the doctor `ClinicalNotesSection` and the patient `MyBookingsView` render **one note at a time, latest first**:
- **◄ Previous** → older note (index+1); disabled at the oldest.
- **Next ►** → newer note (index−1); disabled at the latest (index 0).
- Header: `Note X of Y · latest`.
- Doctor side jumps back to the latest when a new note is added (adjust-state-on-render guard on the top note's id).

## 4. Prescription composer (`RxComposer.tsx` 🟡)

- Fetches the patient's notes via `useClinicalNotes(rx.booking.id)`; `latestNote = notes[0]`.
- **Prefill:** an effect hydrates the draft's `vitals` from `latestNote.vitals` **once**, only if the doctor hasn't already entered vitals (ref-guarded; a justified `set-state-in-effect` suppression — one-shot hydration, no cascade).
- Under the Vitals inputs: **“These are from the update on ⟨date⟩”** (or "No clinical-note vitals recorded yet") **+ an Update button** → opens `AddClinicalNoteModal`. On save, the new note's vitals `patch()` the draft (and the query invalidation refreshes the date). The vitals fields stay **editable** (Option B).
- **Finalize redirect:** `onFinalize` success now `router.push`es to `…/appointments?appointment=<bookingId>` instead of the read-only view — landing on the appointment's detail modal.

## 5. Appointment modal by URL (`AppointmentsBoard` 🟡 + page 🟡)

- The appointments page reads `?appointment=<id>` (server `searchParams`) and passes `initialAppointmentId` to the board.
- The board seeds `selected` from it (auto-opens that appointment's `AppointmentDetailDialog`, which shows **Mark complete / No-show / payment** for a confirmed booking — the "as before" flow).
- Closing the modal strips the query param (`router.replace`) so a refresh/back doesn't reopen it.

## 6. Patient side (`MyBookingsView.tsx` 🟡 + `types/booking.ts` 🟡)

- `ClinicalNote` gains `vitals: NoteVitals`.
- The read-only note card now shows vitals as chips (`BP: 118/78`, `Pulse: 68`, …) and uses the same one-at-a-time navigator.

## 7. End-to-end flow

```
Doctor: appointment → Write prescription (composer)
  Vitals prefilled from latest note · "…update on <date>" · [Update]
     └▶ Add-note modal (details + vitals) → save → draft vitals refresh, date updates
  Finalize → Sign & lock
     └▶ /dashboard/appointments?appointment=<id> → detail modal opens → Mark complete
Patient: My Bookings → completed card → View consultation notes
  one-at-a-time (◄ ► ) · text + vitals chips · read-only
```

## 8. Later tweaks

- **Renamed to "Tests & Reports"** (UI only) — the doctor section header, add-button/modal, and the patient's toggle now read "Tests & Reports". The **code/API keep the `clinical_notes` / `clinical-notes` naming** (no schema or route rename), so only user-facing strings changed.
- **Note numbering is chronological** — the navigator shows the oldest as `Note 1 of N` and the latest as `Note N of N · latest` (display position = `N − index`); order stays newest-first, arrows are labelled **Previous** / **Next**.
- **Patient "View prescription"** (`MyBookingsView`) — the booking card's Tests & Reports row gets a right-aligned **View prescription** button when a finalized prescription exists for that booking. Resolved by `usePrescriptions()` → a `bookingId → Prescription` map (the patient prescription serializer now returns `bookingId`); the button opens the existing `PrescriptionPdfDialog`.
- **Doctor board ordering** (`AppointmentsBoard`) — the appointments list is now ordered by **booking creation date/time, newest first** (`serializeBookingForDoctor` returns `createdAt`; the old status-grouping sort was removed). The status *filter* is unchanged.

## 9. Verification

- Backend loads; doctor-write → doctor-read → patient-read verified vs the DB (vitals round-trip intact).
- `frontend-doctor` + `frontend-patient` `tsc --noEmit` clean; ESLint clean on touched files.
