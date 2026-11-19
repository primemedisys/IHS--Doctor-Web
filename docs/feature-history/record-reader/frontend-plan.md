# Record reader — frontend plan

🔵 Planned. One new feature folder in `frontend-doctor`, two existing dialogs retired into it, and
one component lifted out of a dialog so it can be reused.

---

## 1. The shape

```
┌─────────────────────────────────────────────────────────────┐
│  Arya Sunirmal · 12 documents            [ All ▾ ]      ✕   │  ← sticky header
├──────────┬──────────────────────────────────────────────────┤
│ 4 Aug'26 │  ┌────────────────────────────────────────────┐  │
│ ● Rx     │  │                                            │  │
│          │  │        RX-2026-000004  (pdf)               │  │  ← the clicked one
│ 31 Jul   │  │                                            │  │
│ ● Rx     │  └────────────────────────────────────────────┘  │
│          │  ── 31 Jul '26 · Prescription ───────────────────│  ← sticky sheet label
│ 21 Aug   │  ┌────────────────────────────────────────────┐  │
│ ● X-ray  │  │        RX-2026-000003  (pdf)               │  │
│          │  └────────────────────────────────────────────┘  │
│ 15 Jul   │  ── 21 Aug '26 · X-ray ─────────────────────────│
│ ● Report │  ┌────────────────────────────────────────────┐  │
│          │  │   [ image, pan/zoom, +/− ]                 │  │  ← scrolls in, inline
│  (rail)  │  └────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

Full-screen `Dialog` (`fullScreen` on md-down, `maxWidth="lg"` above), one scroll container, one
sheet per document, a date rail on the left for jumping.

---

## 2. New — `features/records/`

```
features/records/
  components/RecordReader.tsx     the dialog + scroller + rail
  components/RecordSheet.tsx      ONE document: label + the right renderer
  components/PdfSheet.tsx         static URL frame, or fetched-blob frame
  hooks/useReadingList.ts         merge + sort + filter
  index.ts
```

### 2.1 `useReadingList(snapshot, timelineRows)` 🔵

Pure, no fetching. Produces the ordered list the reader renders:

```ts
export interface ReadingItem {
  key: string;                                  // "rec:12" | "rx:88"
  kind: "prescription" | "report" | "xray" | "mri";
  label: string;                                // "RX-2026-000004", "Chest X-ray"
  date: string;                                 // "YYYY-MM-DD" — what it sorts on
  source:
    | { type: "url"; url: string; isImage: boolean }   // uploaded record
    | { type: "prescription"; id: string };            // fetch → blob
}
```

- Reuses `bucketOf()` from
  [`PatientDescriptionView`](../../../src/features/appointments/components/PatientDescriptionView.tsx)
  — **moved to `features/records/bucket.ts` and imported back**, so the register's four columns and
  the reader's rail can never disagree about what an MRI is.
- Reuses the **Rx-number → consultation date** map the register already builds, so a prescription
  sorts by the day it was written, not the day it was uploaded — the fix made in the register must
  not be re-broken here.
- De-duplicates: an uploaded copy of a prescription and the prescription itself are ONE item. The
  uploaded copy wins (it is a real file, no fetch needed).
- `isImage` uses `isImageUrl()`, lifted out of `ReportViewerDialog` alongside the viewer.

### 2.2 `RecordReader` 🔵

| Concern | Decision |
|---|---|
| Open at | the clicked item, scrolled to instantly (`scrollIntoView`, no animation — a reader that flies past four documents on open is disorienting) |
| Order | newest first. Older below, **newer above** — scrolling up is how you get back to today |
| Filter | a `[ All ▾ ]` select in the header: All / Prescriptions / Reports / X-rays / MRIs. Defaults to **All** (README §6 Q1) |
| Rail | date + kind dot per item, current one marked; click jumps. Hidden below `md` |
| Keyboard | `↑`/`↓` jump sheet to sheet, `Esc` closes, `+`/`−` zoom the focused image |
| Close | returns focus to the capsule that opened it |

### 2.3 Lazy loading — the part that decides whether this is usable

A patient with 60 documents must not cost 60 requests on open.

- Each sheet is a fixed-height placeholder until an `IntersectionObserver` (`rootMargin: "1200px"`)
  marks it near. **Fixed height matters**: without it the scrollbar grows as content loads and the
  scroll position drifts under the doctor's hand.
- Only near sheets render their `<img>` / frame. Prescriptions call `usePrescriptionPdf` only when
  near — its `staleTime: Infinity` means scrolling back up costs nothing.
- Object URLs are revoked when a sheet unmounts, exactly as `RxPdfPreviewDialog` does today.
- Sheets far outside the viewport unmount their content and keep their box, so memory stays flat on
  a long record.

### 2.4 `RecordSheet` 🔵

```
── 31 Jul '26 · Prescription · RX-2026-000003 ──────── [↗ open] [✎ date] ──
```

A sticky per-sheet label carrying date, kind (in its column colour from the register) and label,
plus the two actions that already exist: **open in new tab** and **correct the date**. Below it, one
of:

- **image** → `ImageViewer` 🟡 — *lifted out of `ReportViewerDialog` into
  `components/ImageViewer.tsx`* with no behaviour change. It is 200 lines of pan/zoom/pinch that
  must not be written twice.
- **pdf, static url** → `<iframe src>` sized to a page ratio.
- **pdf, prescription** → same frame over an object URL from `usePrescriptionPdf`, with the
  loading/error/retry states `RxPdfPreviewDialog` already defines.

---

## 3. Changed

| File | Change |
|---|---|
| `PatientDescriptionView.tsx` 🟡 | every capsule's `onClick` becomes `openReader(itemKey)` instead of `setViewingReport` / `setViewingRx`; the two dialog mounts are replaced by one `<RecordReader>`; `bucketOf` moves out to `features/records/bucket.ts` |
| `ReportViewerDialog.tsx` 🟡 | `ImageViewer` + `isImageUrl` exported (or moved); the dialog itself is **deleted** once nothing imports it |
| `RxPdfPreviewDialog.tsx` 🟢 | stays — it is still used by the prescription composer's own preview. The reader borrows its loading/error states rather than the dialog |

**Check before deleting either dialog:** `rg "ReportViewerDialog|RxPdfPreviewDialog" frontend-doctor/src`.
`ReportViewerDialog` is also used from the appointment detail dialog; that call site moves to the
reader too, or the dialog stays until it doesn't.

---

## 4. Copy

| Where | Text |
|---|---|
| Header | `Arya Sunirmal · 12 documents` |
| Empty filter | `No X-rays on file for this patient.` |
| PDF failed | `That prescription didn't load.` + **Try again** |
| End of list | `That's the whole record — 12 documents, 4 Aug '26 to 15 Jul '25.` |

The end marker matters: without it, a doctor cannot tell "the record ends here" from "the next one
hasn't loaded yet".
