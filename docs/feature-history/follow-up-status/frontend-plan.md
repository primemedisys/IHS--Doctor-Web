# Follow-up status — frontend plan (doctor app)

🔵 Planned. Four surfaces: a new settings page, a control in the prescription composer, three
changes to the appointments board, and a richer patient cell.

---

## 1. Types & hooks

🔵 `src/types/followUp.ts`

```ts
export interface FollowUpStatus {
  id: string;
  label: string;      // "OPD FU"
  colorHex: string;   // "#2E86C1"
  sortOrder: number;
  isActive: boolean;
  /** Present only on the options page — how many patients would break on delete. */
  inUse?: number;
}

/** A patient's current follow-up, as a roster row carries it. Null = untagged. */
export interface PatientFollowUp {
  status: FollowUpStatus;
  followUpOn: string | null;  // "YYYY-MM-DD"
  note: string | null;
  updatedAt: string;
}
```

🟡 `types/appointment.ts` — `Appointment.followUp: PatientFollowUp | null`, and `patient` gains
`age`, `phone`, `city`, `addressLine` (all optional, so a stale cache still type-checks).

🔵 `features/follow-ups/hooks.ts` — `useFollowUpStatuses()`, `useCreateFollowUpStatus()`,
`useUpdateFollowUpStatus()`, `useDeleteFollowUpStatus()`, `useSetPatientFollowUp(patientId)`.
Every mutation invalidates `queryKeys.followUps.all()` **and** `queryKeys.appointments.all()` — the
board's column shows the same data, and a recoloured status that stays blue on the roster until a
hard refresh reads as a bug.

---

## 2. 🔵 Follow-up options page

**Route:** `/dashboard/follow-up-options` · **Sidebar:** a new item in
[`features/dashboard/nav.ts`](../../../src/features/dashboard/nav.ts), under
Appointments, icon `FiTag`, `requiresLive: true` (it is meaningless before the profile is live).

```
┌──────────────────────────────────────────────────────────────┐
│ Follow-up options                          [+ Add status]    │
│ The categories you tag patients with. Yours alone — a        │
│ surgeon's list is not a dermatologist's.                     │
├──────────────────────────────────────────────────────────────┤
│ ⠿  ● NEW PATIENT      #2E7D53   12 patients   [edit] [⋯]     │
│ ⠿  ● OPD FU           #2E86C1   48 patients   [edit] [⋯]     │
│ ⠿  ● SX WAITING       #B07714    3 patients   [edit] [⋯]     │
│ ⠿  ● SX FU            #5B4CB0    9 patients   [edit] [⋯]     │
└──────────────────────────────────────────────────────────────┘
```

- **Inline edit**, not a dialog: label field + colour swatch + save, in the row. Renaming a status is
  a two-second job and a modal makes it a five-second one.
- **Colour picker** = a palette of 12 pre-validated hues plus a free hex field. Free-choice-only
  invites `#FFFF00` on white, which fails contrast in the roster chip; the palette is the fast path
  and the hex field is the escape hatch.
- **`inUse` count is shown before you delete, not after.** Delete on a status with `inUse > 0` gets a
  409 (backend §3.4) and the UI offers **Archive** — it stops appearing in pickers, existing patients
  keep their tag.
- **Reorder** by drag (`sortOrder`), because the dropdown order is the doctor's scanning order.

**Empty state** cannot happen — the backend seeds the four. If a doctor archives all of them, the
page says so and offers to restore.

---

## 3. 🟡 Prescription composer — setting the status

**File:** [`RxComposer.tsx`](../../../src/features/prescriptions/components/RxComposer.tsx),
as a new panel beside "Follow-up date" in `panels.tsx`.

```
┌─ Follow-up ────────────────────────────────────────┐
│ Status   [● OPD FU        ▾]   (+ Manage options)  │
│ Date     [ 12-09-2026     ]                        │
│ Note     [ Review post-op wound…               ]   │
└────────────────────────────────────────────────────┘
```

- The select renders each option **with its colour dot**, so the colour code is learned where it is
  set, not just where it is read.
- **"Manage options"** links to the page above. A doctor mid-consult who needs a new category should
  not have to abandon the prescription to get one.
- Saving the prescription and saving the follow-up are **separate calls**. The follow-up is not part
  of the prescription document — it is a fact about the patient, it must survive a discarded draft,
  and it must be settable on a consult that ends without a prescription.
- Pre-filled with the patient's current status, so the common case (unchanged) is zero clicks.

---

## 4. 🟡 Appointments board

**File:** [`AppointmentsBoard.tsx`](../../../src/features/appointments/components/AppointmentsBoard.tsx)

### 4.1 A fourth count card

`FAMILY_ORDER` in `appointment-format.ts` becomes four: *Awaiting payment · Confirmed · Completed ·
**Follow-ups***. The grid goes `repeat(3,1fr)` → `repeat(4,1fr)` at `sm`, `repeat(2,1fr)` at `xs`.

> **The fourth card is not a status family.** The other three partition by `booking.status`;
> "follow-ups" counts rows whose PATIENT carries a follow-up tag, which cuts across all three. So
> `Filter` gains a third kind:
> ```ts
> type Filter =
>   | { kind: "family"; value: FamilyKey }
>   | { kind: "status"; value: BookingStatus }
>   | { kind: "followUp"; value: string | "any" };   // status id, or any tag at all
> ```
> Clicking the card sets `{ kind: "followUp", value: "any" }`.

### 4.2 The status dropdown

Next to the status chip strip: a select listing every active status, each with its colour dot, plus
"All follow-ups" and "Untagged". Choosing one sets `{ kind: "followUp", value: id }` — click `OPD
FU`, see only OPD follow-ups, exactly as asked.

Counts on each dropdown row come from `inScope`, like the status chips, so the numbers describe the
open tab and date range.

### 4.3 The Follow-up column

Between **Status** and the chevron, sortable (`SortKey` gains `"followUp"`, ordered by
`followUpOn` ascending with untagged last — the soonest review is the useful top):

```
┌ FOLLOW-UP ────────────┐
│ ● OPD FU              │   ← chip in the status's own colour
│ 12 Sep '26 · in 5 wks │   ← the date, and how far off it is
└───────────────────────┘
```

Overdue dates (`followUpOn < today`) render in `error.main` — a review that was due three weeks ago
is the one thing on this column worth interrupting for. Untagged rows show a quiet `—` and a
hover action to tag inline.

### 4.4 The patient cell — age, phone, address

The cell currently shows avatar + name + "via X Clinic". It gains a second and third line:

```
[AS]  Arya Sunirmal
      23 · +91 82603 30233
      Bhubaneswar, Odisha
```

- **Two lines, not four fields on one** — the row is already 1000px wide with seven columns.
- `noWrap` with a `title` on the address: a clipped address is fine, a row that grows to three
  wrapped lines breaks the scan rhythm of the whole table.
- On `xs`, the phone/address lines are hidden (`display: { xs: "none", md: "block" }`); the mobile
  roster keeps name + time + status. Cramming an address into a 360px row makes every row unreadable
  to save one tap.

---

## 5. 🟡 My Patients roster

[`MyPatientsTable.tsx`](../../../src/features/timeline/components/MyPatientsTable.tsx)
currently renders the ENUM status. It switches to the same chip component — one definition of what a
follow-up looks like, in `features/follow-ups/components/FollowUpChip.tsx`, used by the board, the
roster and the composer.
