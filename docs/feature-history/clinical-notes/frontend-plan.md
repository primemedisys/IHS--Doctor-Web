# Frontend Plan — Clinical Notes (frontend-doctor)

**App:** `frontend-doctor/` (Next.js, port 3001). **Legend:** 🟢 existed · 🟡 extended · 🔵 new.

The whole feature hangs off the appointment modal's **Patient details ("Description")** screen (`AppointmentDetailDialog`), which already exists from the previous change (two-view modal, reached via the **Description** button).

---

## 1. Data plumbing

### 1.1 `types/appointment.ts` (🟡)
```ts
interface ClinicalNote { id; date; doctorName; complaints; onExamination; historyMedical; historySurgical; diagnosis; treatment }  // all string|null except id/date
interface ClinicalNoteInput { complaints?; onExamination?; historyMedical?; historySurgical?; diagnosis?; treatment? }  // all string
```

### 1.2 `constants/api.ts` (🟡)
`doctor.bookingClinicalNotes: (id) => \`/doctor/bookings/${id}/clinical-notes\``.

### 1.3 `constants/queryKeys.ts` (🟡)
`appointments.clinicalNotes: (bookingId) => [...appointments.all(), "clinical-notes", bookingId]`.

### 1.4 `services/appointment.service.ts` (🟡)
`listClinicalNotes(bookingId): Promise<ClinicalNote[]>` (GET) and `addClinicalNote(bookingId, body): Promise<ClinicalNote>` (POST) via `requestData`.

### 1.5 `hooks/useClinicalNotes.ts` (🔵) + `hooks/index.ts` (🟡)
- `useClinicalNotes(bookingId)` — `useQuery`, `enabled: !!bookingId`.
- `useAddClinicalNote(bookingId)` — `useMutation`; on success invalidates `appointments.clinicalNotes(bookingId)` so the new note appears at the top.

---

## 2. `ClinicalNotesSection.tsx` (🔵)

Self-contained section rendered on the Description screen. `props: { bookingId }`.

- **`FIELDS`** — the six fields in order, each `{ key, label, placeholder }`:
  `Complaints (C/O)` · `On examination (O/E)` · `History — Medical (H/O)` · `History — Surgical (H/O)` · `Diagnosis` · `Treatment`.
- **Header** — "Clinical notes" + an **Add note** button (toggles an inline form).
- **Add form** — a `Grid` of six `TextField` (multiline, `minRows={2}`, `size="small"`), 2-up on `sm+`. **Save** collects non-empty trimmed fields; if none → `toast.error`; else `addNote.mutate(body)` → on success toast + reset + close. **Cancel** resets. Button shows `loading` while pending.
- **List** — `useClinicalNotes`; loading spinner / error text / empty hint / else newest-first `NoteCard`s.
- **`NoteCard`** — header = `noteDateLabel(note.date)` (localized date + time) + a `Chip` with `doctorName`; body = only the **filled** fields, each `label` + value (`whiteSpace: "pre-wrap"`).

Uses `toast` (sonner) + `getErrorMessage` for errors — the app's existing pattern.

---

## 3. `AppointmentDetailDialog.tsx` — Description screen wiring (🟡)

`PatientDescriptionScreen` gains `bookingId` + `bookingStatus` props (passed from the dialog: `booking.id`, `booking.status`). New layout, top → bottom:

1. **Back to appointment** button (existing).
2. Patient name + demographic chips + phone (existing).
3. **Prescription** — a labelled block rendering the existing **`PrescriptionActionButton`** (`bookingId`, `bookingStatus`). It already does exactly what was asked: *View prescription* when a finalized Rx exists, *Continue draft* for a draft, and **"Write prescription" → the composer** when there is **none**. Imported from `@/features/prescriptions` (already a dialog import).
4. **Clinical notes** — `<ClinicalNotesSection bookingId={bookingId} />`.
5. `Divider` + **"Patient-reported history"** heading + the existing snapshot grid (allergies / conditions / medications / records).

No change to the details view or the two-view/back logic from the prior change.

---

## 4. Why this is enough

- `PrescriptionActionButton` is reused verbatim — no new prescription code, and the "no Rx → create" redirect is its built-in behaviour.
- Notes list/add is one small feature slice (types → api → service → hooks → one component) that follows the existing appointments feature conventions.
- The Description screen only renders for a confirmed/completed booking (patient snapshot unlocked), so `PrescriptionActionButton` (eligible on confirmed/completed) and the notes endpoints (same gate) always have valid state.

## 5. Gotchas

- **`bookingStatus`** must be the raw status string (`confirmed`/`completed`), which is what `PrescriptionActionButton` checks — pass `booking.status`, not a label.
- **Empty-note guard** is enforced both client-side (Save) and server-side (`createNote` validator) — don't rely on only one.
- **Date formatting**: `note.date` is an ISO datetime; `noteDateLabel` guards `NaN` and falls back to the raw string.
