# Bug fixes 31/07/2026 — Frontend

Client-side detail for the day's batch. Only `frontend-patient` (3000) changed.

**Legend:** 🔵 new file · 🟡 modified · 🔴 removed

---

## 1. Navbar — "For Doctors"

### 1.1 `components/navigation/Navbar.tsx` 🟡

A highlighted pill left of *Sign In* / *Get started* on `md`+, and the same link in the
mobile drawer labelled in full — *Register / Sign in as Doctor* — since the drawer is the
only place `xs`/`sm` users can reach it. It renders in **both** auth states: switching
portals is not a signed-out-only concern.

**`component="a"`, not `next/link`.** `frontend-doctor` is a separate Next application on
another origin. `next/link` would attempt a client-side route transition to a path this app
does not own. This has to be a real document navigation, and it stays in the same tab
because the intent is *redirect*, not *open alongside*.

**`href={env.doctorUrl}`, not a literal.** Resolves via `NEXT_PUBLIC_DOCTOR_URL` →
`http://doctor.localhost:3001` in dev. That subdomain is not incidental: it is what the
cookie-SSO setup (`NEXT_PUBLIC_COOKIE_DOMAIN`) and the backend's `CLIENT_URL` allow-list
already expect. Hardcoding `localhost:3001` would have worked in dev and broken in
production. It points at the doctor app **root**, whose landing page serves both register
and sign-in; retargeting to `/register` is a one-line change in two places.

### 1.2 The highlight

Tinted `secondary` (blue): 12% fill, 45% border, weight 700, and a soft 3px ring that
expands on hover.

Deliberately **not** a second solid button. `Get started` is solid `primary` navy; two
filled buttons adjacent compete for the same attention and neither reads as primary. The
tint makes it prominent within its own register. Every colour goes through `alpha()` on
theme callbacks, so light and dark are both handled.

Label is *For Doctors* on desktop with a tooltip spelling out "Register or sign in as a
doctor" — the full sentence overflows a navbar that already holds a centred pill group and
two buttons at `md`. The drawer, with a full-width column, uses the long form.

---

## 2. Uploaded reports

### 2.1 `recordFormat.ts` 🔵 — the shared vocabulary

`FILE_TYPES`, `typeLabel`, `recordLabel`, `recordDateOf`, `dateLabel`, `today`, plus new
`monthLabel`, `monthKey`, `dayKey` and `relativeDay`.

Extracted because the table, the timeline and the edit dialog all render the same labels.
`FILE_TYPES` had already been copy-pasted once; a third copy would have guaranteed drift.

`relativeDay` returns `null` past a year — "14 months ago" is harder to place than the date
itself, so past that point the timeline shows only the date.

### 2.2 `RecordActions.tsx` 🔵 — one set of row actions

View · Open in new tab · Edit · Remove, shared by both views so they cannot diverge on what
a report lets you do.

The edit button is **disabled with an explanatory tooltip** on clinic/doctor-authored rows
rather than hidden — the actions column stays aligned across rows, and the restriction is
discoverable instead of mysterious. The `IconButton` is wrapped in a `<span>` because MUI
tooltips do not fire on disabled elements.

This mirrors the backend gate (`backend-plan.md §1.2`). The client hiding it is *not* the
security boundary; the server's 403 is.

### 2.3 `ReportsTimeline.tsx` 🔵 — the default view

One node per **calendar day**, newest first, with a month heading when the month changes
and a relative hint beside each date.

**Grouping by day, not per file, is the core decision.** A single clinic visit routinely
produces several documents; a node per file turned one appointment into a wall of
near-identical rows repeating the same date. Days with more than one report show a
`· N reports` count.

Cards are colour- and icon-coded by type — `prescription` → `primary`/document,
`lab_report` → `info`/activity, `other` → neutral/paperclip. Colour is the fastest way to
scan a long history for "where are my lab reports", and staying inside the palette keeps
both schemes working.

The rail (dot + connector) is modelled on `CareJourneyTimeline` so the app's two timelines
read as one system.

### 2.4 `UploadedReportsSection.tsx` 🟡 — toggle, date field, wiring

**View toggle.** Timeline (default) / Table, with a report count on the left. The table is
kept rather than replaced: it is better for scanning a long history at a glance, and
deleting a working view to add a prettier one is a net loss.

**Date of test on upload.** A `type="date"` field capped at `today()`, sent as
`recordDate: recordDate || null`. Optional by design — blank means the row falls back to
`uploadedAt`, exactly as every existing record already does, so the field adds capability
without adding an obligation to a flow that was previously two fields and a button.

**Grouping** is two `useMemo`s: sort newest-first, then bucket by `dayKey` into a `Map`.
`Map` preserves insertion order, so groups come out correctly ordered without a second
sort. `rows` is memoised on `data` so the grouping memo is not invalidated every render.

### 2.5 `EditRecordDialog.tsx` 🔵

Date of test · Type · Reason, seeded from the row. No file picker — replacing a document is
a new upload, and the dialog says so.

**Split into an outer `Dialog` and an inner keyed `EditRecordForm`.** The obvious approach —
one component seeding state from props via `useEffect` — is what the repo's lint config
rejects (`react-hooks/set-state-in-effect`), and it is right to: it is a cascading render.
Mounting the form with `key={record.id}` gives fresh initial state per row with no effect
at all.

Clearing the date sends `null`, not `""` — the `PATCH` schema accepts `null` and rejects
`""` (`backend-plan.md §1.1`).

---

## 3. Data layer

### 3.1 `types/patient.ts` 🟡

`RecordUpdateInput` — `fileType`, `recordDate`, `tag`, all optional. No `file` field, which
is what makes "the document is immutable" visible at the type level rather than only in a
comment.

### 3.2 `features/health/services/health.service.ts` 🟡

```ts
updateRecord(id: string, body: RecordUpdateInput) {
  return requestData<UploadedRecord>(api.patch(API_ENDPOINTS.patient.record(id), body));
}
```

Reuses the existing `API_ENDPOINTS.patient.record(id)` that `deleteRecord` already uses.

### 3.3 `features/health/hooks/useHealth.ts` 🟡

```ts
export function useUpdateRecord() {
  return useHealthMutation(
    ({ id, body }: { id: string; body: RecordUpdateInput }) => healthService.updateRecord(id, body),
    [queryKeys.patient.records()],
  );
}
```

Signature mirrors `useUpdateMedication` — the `{ id, body }` object form, not two
positional arguments — so the two update hooks are used identically. Invalidates
`patient.records()` on success.

---

## 4. Verification performed

- `npx tsc --noEmit` — clean.
- `npx eslint src/features/health src/types/patient.ts src/components/navigation/Navbar.tsx` — clean.
  (One real finding en route: the `useEffect` prop-sync in the first draft of
  `EditRecordDialog`, fixed as described in §2.5 rather than suppressed.)
- Navbar button confirmed rendering in the running app with `href="http://doctor.localhost:3001"`.

The drawer link does not appear in server-rendered HTML — MUI does not mount `Drawer`
contents until it opens. Expected, not a defect.
