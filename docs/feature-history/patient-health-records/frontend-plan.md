# Frontend Plan — Patient Health Records

Covers both apps. **Legend:** 🟢 exists · 🟡 extend · 🔵 new. Stack: Next.js (App Router) + MUI + React Query + react-hook-form + Zod, following the existing `features/<domain>/{components,hooks,services,schemas}` layout and `RHFTextField`/`FormContainer` form primitives.

---

## Part A — Patient app (`frontend-patient/src/`)

### A1. Types — `types/patient.ts` 🟡
Add alongside the existing `PatientProfile`:
```ts
export interface Allergy { name: string; severity?: "mild" | "moderate" | "severe" | null }
export interface Condition { name: string; diagnosedYear?: number | null }
export interface Medication { id: string; medicineName: string; dosage?: string | null; frequency?: string | null; startedOn?: string | null; notes?: string | null }
export interface UploadedRecord { id: string; fileUrl: string; fileType: "prescription" | "lab_report" | "other"; recordDate?: string | null; tag?: string | null; uploadedAt: string }

// The record-table matrix (mirrors serializePatientVitals).
export interface VitalsField { key: string; label: string; unit: string; derived?: boolean }
export interface VitalsEntry { id: string; recordedOn: string; source: "patient" | "doctor"; note?: string | null; values: Record<string, number | string | null> }
export interface VitalsMatrix { fields: VitalsField[]; entries: VitalsEntry[] }

export interface CompletionSection { key: string; label: string; done: boolean; weight: number }
export interface ProfileCompletion { percent: number; sections: CompletionSection[]; missingRequired: string[] }
```
Extend `PatientProfile` with `emergencyContactName`, `emergencyContactPhone`, and embed `completion: ProfileCompletion | null`.

### A2. API + query keys 🟡
- `constants/api.ts` — `patient.allergies`, `patient.conditions`, `patient.medications(id?)`, `patient.records(id?)`, `patient.vitals`.
- `constants/queryKeys.ts` — `patient.allergies`, `.conditions`, `.medications`, `.records`, `.vitals`, and reuse `.profile`.
- `constants/routes.ts` — `dashboard.health` already exists (no change); it becomes a real page.

### A3. Services + hooks — `features/profile/` (or a new `features/health/`) 🟡🔵
- Extend `patient.service.ts` with `getAllergies/setAllergies`, `getConditions/setConditions`, `getMedications/addMedication/updateMedication/deleteMedication`, `getRecords/addRecord/deleteRecord`, `getVitals/addVitals`.
- Hooks (React Query): `usePatientHealth` bundle or individual `useAllergies`, `useConditions`, `useMedications`, `useRecords`, `useVitals` + their mutations (each `invalidateQueries` on its key, and the **profile key** so the completion % refreshes).

### A4. The Health page — `app/(dashboard)/dashboard/health/page.tsx` 🔵 → `features/health/components/HealthPage.tsx` 🔵
One scrollable page, sectioned with MUI `Card`/`Divider` (order top-to-bottom):

1. **Profile** (`ProfileSection.tsx` 🔵) — identity (name/phone/dob/gender/city), address, **emergency contact**, blood group. Reuse the field set from `ProfileCompleteForm.tsx` (extract the shared inputs rather than duplicate); saves via `PUT /patient/profile`.
2. **Reported history** (`HistoryListsSection.tsx` 🔵):
   - **Allergies** — chips + an add row (name + severity select); "No known allergies" checkbox (`no_known_allergies`). Save = replace-set `PUT /patient/allergies`.
   - **Conditions** — chips + add row (name + diagnosed-year); "None" checkbox. `PUT /patient/conditions`.
   - **Current medications** — a small editable list (medicine/dosage/frequency/started/notes); add/delete per item.
3. **Vitals record table** (`HealthRecordTable.tsx` 🔵 + `AddVitalsEntry.tsx` 🔵) — see A5.
4. **Uploaded reports** (`UploadedReportsSection.tsx` 🔵) — a list of links (tag · date · type) with an **Add report** form (URL + tag + date + type) and per-row delete. URL-only.

`HealthPage` fetches all sections; shows `Loading`/`ErrorState` (existing `@/components/feedback`) per card.

### A5. The record table — `HealthRecordTable.tsx` 🔵
Props: `{ matrix: VitalsMatrix; editable?: boolean; onAddReading?: () => void }`.
- Renders a table: **header row** = `matrix.entries.map(e => e.recordedOn)` (formatted `dd MMM`), newest-left; **first column** = `matrix.fields.map(f => f.label + unit)`; **cell** = `entry.values[field.key] ?? "—"`.
- **Sticky first column** + wrap the table in `Box sx={{ overflowX: "auto" }}` so many dates scroll horizontally without breaking the page (the artifact/table responsive rule).
- Empty state (no entries): a friendly "No readings yet — add your first" with the Add button.
- **`AddVitalsEntry`** — a dialog/inline form: `recordedOn` (date, default today) + the six vitals inputs (BP text, rest numeric; same labels as the doctor's `NOTE_VITAL_FIELDS`). Validates "≥1 vital" client-side, `POST /patient/vitals`, invalidates `vitals` + `profile`. New reading appears as the new leftmost column.

### A6. Dashboard completion bar — `ProfileCompletionCard.tsx` 🔵
- Reads `completion` from `usePatientProfile()` (already embedded in the profile payload).
- MUI `LinearProgress` (determinate, `value={percent}`) + `"{percent}% complete"` + a compact checklist of `sections` (done = check, todo = link) + a **"Complete your health profile → /dashboard/health"** button.
- Hidden (or shows a subtle "All set ✓") at 100%.
- Mounted at the top of `DashboardHome` in `overviews.tsx` 🟡 (above the stat tiles), only for the patient.

---

## Part B — Doctor app (`frontend-doctor/src/`)

### B1. Vitals hook — `features/appointments/{services,hooks,constants}` 🟡
- `constants/api.ts` — `doctor.bookingPatientVitals(id)` → `/doctor/bookings/:id/patient-vitals`.
- `constants/queryKeys.ts` — `appointments.patientVitals(bookingId)`.
- `appointment.service.ts` — `getPatientVitals(bookingId): Promise<VitalsMatrix>`.
- `hooks/usePatientVitals.ts` 🔵 — `useQuery`, enabled when a bookingId is present (lazy — the page fetches on mount).
- `types/appointment.ts` 🟡 — add `VitalsField/VitalsEntry/VitalsMatrix` (same shapes as the patient app).

### B2. The Description page — `app/(dashboard)/dashboard/appointments/[id]/patient/page.tsx` 🔵
```tsx
export default async function PatientDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDescriptionView bookingId={id} />;   // client component
}
```
`PatientDescriptionView.tsx` 🔵 (client):
- Fetches `useAppointment(bookingId)` (existing) for the snapshot + booking status, and `usePatientVitals(bookingId)` for the matrix.
- Renders **the content currently inside `AppointmentDetailDialog.PatientDescriptionScreen`** — identity chips, prescription button (`PrescriptionActionButton`), `ClinicalNotesSection`, and the reported-history grid (allergies/conditions/medications/uploaded records — now populated from the real snapshot) — **plus** the **`HealthRecordTable`** (read-only) at the top of the medical section.
- A **Back** button → `router.back()` (or `router.push('/dashboard/appointments')`).
- Reuses the existing `Loading`/`ErrorState`, and gates on the same "unlocks on confirmation" (snapshot `null` → the locked message).

### B3. `HealthRecordTable.tsx` 🔵 (doctor)
A read-only twin of the patient's renderer (`editable={false}`, no Add button). Same props/shape. (Kept as a separate file per app — no cross-app import; the two are ~40 lines of presentational code.)

### B4. Wire the modal's button — `AppointmentDetailDialog.tsx` 🟡
- The `PatientSnapshotPanel`'s **Description** button (and any "Description" affordance) changes from `onShowDescription = () => setView("description")` to `router.push(\`/dashboard/appointments/${bookingId}/patient\`)`.
- Remove the in-modal `view` state, the `PatientDescriptionScreen` component, and the `description` branch — the modal now only shows the appointment details + actions. `?appointment=` auto-open and mark-complete are unchanged.
- The reported-history rendering that lived in `PatientDescriptionScreen` moves to `PatientDescriptionView` (B2); `SnapshotList`/`demoChips` move with it (or into a shared `appointment-format`-style helper).

---

## C. Verification (frontend)

- **Patient:** `tsc --noEmit` + ESLint clean on touched files. `/dashboard/health` renders all sections; adding an allergy/condition/med/report persists and re-reads; **Add reading** adds a new leftmost column; the **completion %** rises as sections fill; the dashboard **bar** reflects it.
- **Doctor:** `tsc --noEmit` + ESLint clean. From the appointments board → open a confirmed booking's modal → **Description** navigates to `/dashboard/appointments/[id]/patient`; the **record table** shows the patient's readings; reported-history lists are populated (no longer empty); Back returns to the board; the modal's mark-complete/`?appointment=` flow still works.
- **Responsive:** the record table scrolls horizontally inside its own container on narrow screens; the page body never scrolls sideways.
</content>
