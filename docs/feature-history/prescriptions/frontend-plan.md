# Prescriptions — Frontend Plan

**Read `README.md` first.** This file covers `frontend-doctor/` (the template editor + the Rx composer + history) and the small surface added to `frontend-patient/`. It follows the structure the doctor app already uses: `src/features/<domain>/{components,hooks,services,index.ts}`, React Query for server state, `react-hook-form` + `zod` for forms, MUI for chrome, and `services/api.ts`'s `requestData()` to unwrap the `{ success, data }` envelope.

Everything here builds on patterns already in the repo — `features/appointments/` is the closest sibling; read `appointment.service.ts` and `useAppointments.ts` before writing a line.

---

## 1. New surface

```
frontend-doctor/src/
  app/(dashboard)/dashboard/
    prescriptions/
      page.tsx                        ← history list
      templates/page.tsx              ← template list
      templates/[id]/page.tsx         ← THE EDITOR
    appointments/[id]/
      prescription/page.tsx           ← THE COMPOSER
  features/prescriptions/
    components/
      TemplateEditor.tsx              ← split-pane shell
      panels/HeaderPanel.tsx
      panels/BrandingPanel.tsx        ← logo / watermark / signature dropzones
      panels/ThemePanel.tsx           ← colours, font, margins, page size
      panels/PatientFieldsPanel.tsx   ← toggle + reorder the strip
      panels/SidebarPanel.tsx         ← the "Advice" checklist editor
      panels/FooterPanel.tsx          ← 3-column footer editor
      RxPreview.tsx                   ← the live A4 preview (HTML, not PDF)
      RxPdfPreviewDialog.tsx          ← server-rendered PDF, via react-pdf
      TemplateList.tsx
      RxComposer.tsx                  ← the prescription form
      MedicineTable.tsx               ← useFieldArray rows
      AdviceChecklist.tsx
      VitalsRow.tsx
      PrescriptionHistory.tsx
      rx-format.ts                    ← mirrors appointments/appointment-format.ts
    hooks/
      usePrescriptionTemplates.ts
      usePrescription.ts
    services/
      prescriptionTemplate.service.ts
      prescription.service.ts
    schemas/                          ← zod, mirroring backend Joi
    types.ts
    index.ts
  constants/api.ts                    ← EXTEND
  features/dashboard/nav.ts           ← EXTEND: "Prescriptions" nav item
```

**No new npm dependencies.** `react-pdf` (PDF preview), `react-dropzone` (asset upload), `@mui/x-date-pickers` (follow-up date), `react-hook-form` (`useFieldArray` for medicines), `zod`, `sonner` (toasts) are all already installed.

---

## 2. The fidelity problem, and how we dodge it

The obvious design — build a React component that draws the letterhead, and separately a Node module that draws the same letterhead in HTML for Chromium — has **two renderers that will drift.** The doctor tweaks a margin, sees it move on screen, prints it, and it's 2 mm off. This is the classic failure mode of every WYSIWYG editor, and it is worth spending a paragraph to avoid.

The resolution:

- **`RxPreview.tsx` is explicitly a *sketch*, not a proof.** It renders an A4-proportioned `<div>` from the same JSON, scaled with `transform: scale()`, so the doctor gets instant feedback while dragging a colour picker. It is fast, live, and approximate — and the UI says so, quietly ("Approximate preview — use *Preview PDF* to see the exact page").
- **The PDF is the truth.** `RxPdfPreviewDialog` calls `GET /doctor/prescription-templates/:id/preview.pdf`, gets the real Chromium output, and displays it. One click, exact pixels, zero drift.

> **Built with an `<iframe>` off a blob URL, not `react-pdf`.** Every target browser has a native PDF viewer; `react-pdf` would mean copying a `pdf.js` worker into `public/` and keeping its version pinned to the bundler's. The dependency is already in `package.json` and stays unused here.

We do not try to make the HTML preview pixel-exact. We make it *fast and honest*, and we put the exact answer one button away. Chasing pixel-parity between a browser `<div>` and a print stylesheet is weeks of work that a `Preview PDF` button makes unnecessary.

---

## 3. The Template Editor (`/dashboard/prescriptions/templates/[id]`)

### 3.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Templates    "Orthospinecare — Baramunda"   [Set default] [Preview PDF]│
│                                                       ● Saved 2s ago      │
├────────────────────────────┬─────────────────────────────────────────────┤
│  ▼ Header & credentials    │                                             │
│      Doctor name line      │        ┌───────────────────────────┐        │
│      Credential lines  [+] │        │                           │        │
│      Regd. No.             │        │      RxPreview            │        │
│  ▶ Logo & branding         │        │      (A4, scale 0.55)     │        │
│  ▶ Theme & page            │        │                           │        │
│  ▶ Patient fields          │        │   live, approximate       │        │
│  ▶ Advice sidebar          │        │                           │        │
│  ▶ Footer                  │        └───────────────────────────┘        │
│                            │         [ Zoom − ][ 55% ][ Zoom + ]         │
└────────────────────────────┴─────────────────────────────────────────────┘
      MUI Accordion, 40% width          sticky, 60% width
```

On mobile the preview collapses into a bottom sheet behind a "Preview" FAB.

### 3.2 State: one `useForm`, autosaved

The whole template is **one `react-hook-form` form** whose `defaultValues` are the fetched template. `RxPreview` subscribes with `useWatch()` — no prop-drilling, no local mirror state, and the preview updates as the doctor types.

Autosave: `useWatch()` → debounce 800 ms → `PATCH /prescription-templates/:id` with the **dirty fields only** (`formState.dirtyFields`), driven by a `useMutation`. Show `● Saving…` / `● Saved 2s ago` / `● Save failed — Retry` in the header. Rationale: this screen has ~40 controls across 6 panels; an explicit Save button that the doctor forgets after twenty tweaks is worse than a debounce.

The `PATCH` is a deep-merge on the server (`backend-plan §4.2`), so sending `{ headerJson: {...} }` never clobbers `footerJson`.

### 3.3 Panels

**HeaderPanel** — `doctorNameLine` (text), `credentialLines` (a `useFieldArray` of one-line inputs with ↑/↓/✕ — reorder by buttons, not drag; no dnd dependency, and buttons are accessible for free), `clinicName`, `clinicTagline`, `regNoLabel` + `regNoValue`, `logoPosition` (left/right toggle). A "Fill from my profile" button seeds the fields from `GET /doctor/profile` — the same data `buildDefaultTemplate` uses server-side.

**BrandingPanel** — three `react-dropzone` targets (logo, watermark, signature), each showing the current image with a Replace / Remove overlay. `accept: { 'image/png': [], 'image/jpeg': [] }` — mirroring the backend's narrowed allowlist, which stays the authority. Upload → `POST …/assets` (multipart) → invalidate the template query. `watermarkOpacity` is a `<Slider>` 0–0.3, step 0.01, previewed live.

**ThemePanel** — four colour fields (header bg/text, footer bg/text) + accent. Use `<input type="color">` inside an MUI `TextField` adornment plus a hex text input, so the doctor can paste `#2E4A2E`. Font family: a `<Select>` over a **fixed list of 5 print-safe families** — a free-text font is a broken PDF, because Chromium renders on the server where the doctor's font isn't installed. Page size, the four margins (mm), and `baseFontSizePt`.

**PatientFieldsPanel** — a reorderable checklist over the frozen `PRESCRIPTION_PATIENT_FIELDS`. Each row: enable checkbox, editable `label` (a doctor may prefer "Wt (kg)" over "Wt"), row assignment (1–3). The key set comes from the backend so it cannot drift; ship it as a typed const in `features/prescriptions/types.ts` and let the backend 422 be the backstop.

**SidebarPanel** — the "Advice" investigations menu. `title` + N groups, each with a title and a `useFieldArray` of items. Add a **"Paste list"** affordance: a textarea that splits on newlines into items. Recreating the 30-item list from the reference letterhead one `[+]` click at a time is the kind of friction that makes a doctor abandon the feature. `showSidebar` toggle + `sidebarWidthPct` slider (10–30%).

**FooterPanel** — 1–4 columns, each `{ title, lines[] }`, same `useFieldArray` shape. Live-previewed against `footerBgColor`.

### 3.4 `RxPreview.tsx`

```tsx
// A4 = 210 × 297 mm. Render at true mm size and scale the whole thing down —
// so every child can use mm/pt units exactly as the print stylesheet does, and
// only ONE number (the scale) differs between preview and PDF.
<Box sx={{ width: 210 * scale + "mm", height: 297 * scale + "mm", overflow: "hidden" }}>
  <Box sx={{ width: "210mm", height: "297mm", transformOrigin: "top left",
             transform: `scale(${scale})`, position: "relative" }}>
    {showWatermark && <Watermark url={watermarkUrl} opacity={watermarkOpacity} />}
    {showHeader && <PreviewHeader {...headerJson} />}
    <PreviewPatientStrip fields={patientFieldsJson} />
    <Box sx={{ display: "flex" }}>
      {showSidebar && <PreviewSidebar {...sidebarJson} widthPct={sidebarWidthPct} />}
      <PreviewBody {...bodyJson} sample={SAMPLE_RX} />
    </Box>
    {showFooter && <PreviewFooter {...footerJson} />}
  </Box>
</Box>
```

Colours flow through CSS custom properties set on the outer box (`--header-bg`, …) — **the same variable names the server's `rx.html` uses.** When the two files share variable names, a theme change is a one-line edit in two places instead of a hunt.

`SAMPLE_RX` (a fake patient: `Ramananda Pattnaik, 28/M`) lives in `rx-format.ts` and is shared with `renderSample` semantics.

### 3.5 `RxPdfPreviewDialog.tsx`

```tsx
const preview = useTemplatePreview(templateId, savedAt, previewOpen);  // keyed on updatedAt
const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);  // a blob URL pins memory
// <Box component="iframe" src={url} />
```

Keying on `updatedAt` means clicking "Preview PDF" right after an autosave lands fetches a fresh render, and clicking it twice with no edits serves from cache — which matters, because each render costs a Chromium page (`backend-plan §6`, rate-limited).

---

## 4. The Rx Composer (`/dashboard/appointments/[id]/prescription`)

Entered from `AppointmentDetailDialog`, which gains one button whose label depends on `GET /doctor/bookings/:id/prescription`:

| Booking state | Button |
|---|---|
| `confirmed` / `completed`, no Rx | **Write prescription** → `POST /prescriptions` → route to composer |
| draft exists | **Continue draft** |
| finalized exists | **View prescription** (opens the PDF) · **Amend** |
| `pending_payment` / `cancelled` | *(no button)* |

That's one extra request on a dialog that already fetches the appointment — fold it into the same `useQuery` cache key rather than a separate spinner.

### 4.1 Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│ ← Appointment    Prescription · Ramananda Pattnaik · 08 Jul 2026      │
│                  Template: [Orthospinecare — Baramunda ▾]  [Preview]  │
├─────────────────────────────────────┬─────────────────────────────────┤
│  Patient (read-only, from booking)  │  Advice                         │
│    Ramananda Pattnaik · 28 / M      │   ☑ CBC                         │
│    9000000000 · Bhubaneswar         │   ☑ FBS, PPBS                   │
│                                     │   ☐ HbA1C                       │
│  Vitals    BP __ Pulse __ Wt __ …   │   ☐ S-Urea, Creat               │
│  Chief complaint  ________________  │   ☐ LFT                         │
│  Diagnosis        ________________  │   …  (from sidebarJson)         │
│                                     │                                 │
│  ℞  Medicines                       │  Notes    ____________          │
│  ┌──────┬────────┬───────┬───────┐  │  Follow-up  [ 22 Jul 2026 ]     │
│  │ Name │ Dosage │ Freq  │ Days  │  │                                 │
│  └──────┴────────┴───────┴───────┘  │                                 │
│  [+ Add medicine]                   │                                 │
├─────────────────────────────────────┴─────────────────────────────────┤
│  Draft saved 4s ago     [Discard draft]  [Preview PDF]  [Finalize ▸]  │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 Behaviours worth specifying

- **Patient block is read-only.** It comes from the booking's patient snapshot (`serializePatientSnapshot`, already built). A doctor mistyping the patient's name onto a legal document is a defect, not a feature. Age is derived (`ageFrom(dob)` — the serializer already does it).
- **Medicines** are a `useFieldArray`. Columns rendered are exactly `bodyJson.medicineColumns` from the resolved template, so a doctor who removed the "Route" column doesn't see it here either. Enter in the last cell adds a row. `route`/`timing` are `<Select>`s over `MEDICINE_ROUTES` / `MEDICINE_TIMINGS`.
- **Advice checklist** is generated from `sidebarJson.groups`; checked items post as `adviceSelected: string[]`. Free-text `advice` is a separate field. (Per `README §9 Q1`, the PDF prints the *whole* menu with ticked items marked — matching the paper letterhead.)
- **Autosave the draft** on the same 800 ms debounce (`PATCH /prescriptions/:id`), same status chip. Items post as replace-the-set.
- **Finalize** is a confirmation dialog, and it says the true thing: *"This prescription will be signed and locked. It can't be edited afterwards — only amended. The letterhead will be frozen as it looks today."* Checkbox: "E-mail a copy to the patient." On success → the PDF opens, the route replaces to the read-only view.
- **Render-failure tolerance.** If `finalize` returns and `pdfUrl` is null (`backend-plan §7.4`), don't error — route to the read-only view and let its "Download" hit `GET …/pdf`, which self-heals. The doctor never learns Chromium hiccuped.

### 4.3 Read-only view + amend

After finalize, the same route renders `PrescriptionView`: the embedded PDF (`react-pdf`), the `rx_number`, `Download`, `E-mail to patient`, and `Amend`. Amend opens a reason dialog → `POST …/amend` → routes to the composer on the new draft, pre-filled. Superseded versions are listed with a subdued "Version 1 · superseded" chip.

---

## 5. Hooks & services

`services/prescriptionTemplate.service.ts` and `prescription.service.ts` mirror `appointment.service.ts` exactly — thin `requestData(api.get(...))` wrappers, one method per endpoint, no logic. The asset upload is the only special case:

```ts
putAsset(id: string, kind: AssetKind, file: File): Promise<Template> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return requestData<Template>(
    api.post<ApiResponse<Template>>(API_ENDPOINTS.doctor.prescriptionTemplateAssets(id), form),
  );
}
```

Do **not** set `Content-Type` by hand — axios must set the multipart boundary. (`api.ts` sets a JSON default; verify it doesn't force it onto `FormData` bodies. If it does, override with `headers: { "Content-Type": undefined }`.)

`hooks/usePrescriptionTemplates.ts`:

```ts
export const templateKeys = {
  all: ["prescription-templates"] as const,
  list: () => [...templateKeys.all, "list"] as const,
  detail: (id: string) => [...templateKeys.all, id] as const,
};
// useTemplates(), useTemplate(id), useCreateTemplate(), useUpdateTemplate(id) (autosave),
// useSetDefault(), useDuplicateTemplate(), useDeleteTemplate(),
// useUploadAsset(id), useRemoveAsset(id)
```

Every mutation invalidates `templateKeys.detail(id)` and, where the list summary changes (name, default, clinic), `templateKeys.list()`. `useUpdateTemplate` sets `onMutate` for an optimistic cache write so the preview never flickers back to the server value mid-typing.

`hooks/usePrescription.ts`: `usePrescription(id)`, `useBookingPrescription(bookingId)`, `useCreatePrescription()`, `useUpdatePrescription(id)`, `useFinalizePrescription(id)`, `useAmendPrescription(id)`. `useFinalizePrescription` invalidates the appointment query too — the appointment card's button must flip from "Continue draft" to "View prescription".

`constants/api.ts` additions:

```ts
doctor: {
  // …
  prescriptionTemplates: "/doctor/prescription-templates",
  prescriptionTemplate: (id) => `/doctor/prescription-templates/${id}`,
  prescriptionTemplateDefault: (id) => `/doctor/prescription-templates/${id}/default`,
  prescriptionTemplateDuplicate: (id) => `/doctor/prescription-templates/${id}/duplicate`,
  prescriptionTemplateAssets: (id) => `/doctor/prescription-templates/${id}/assets`,
  prescriptionTemplateAsset: (id, kind) => `/doctor/prescription-templates/${id}/assets/${kind}`,
  prescriptionTemplatePreview: (id) => `/doctor/prescription-templates/${id}/preview.pdf`,
  prescriptions: "/doctor/prescriptions",
  prescription: (id) => `/doctor/prescriptions/${id}`,
  prescriptionFinalize: (id) => `/doctor/prescriptions/${id}/finalize`,
  prescriptionAmend: (id) => `/doctor/prescriptions/${id}/amend`,
  prescriptionPdf: (id) => `/doctor/prescriptions/${id}/pdf`,
  bookingPrescription: (id) => `/doctor/bookings/${id}/prescription`,
},
```

---

## 6. Validation on the client

`schemas/` holds zod mirrors of the backend Joi (`backend-plan §5`) — hex-colour regex, `credentialLines.max(10)`, sidebar `items.max(60)`, vitals bounds, `items.max(30)`. Wired through `@hookform/resolvers`.

The backend remains the authority. The client schema exists so the doctor sees "Pulse must be 20–300" inline instead of a red toast after a round trip. When they disagree, the backend wins and the mutation's `onError` surfaces the server message via `sonner`.

---

## 7. `frontend-patient/`

Small and last (Phase 5):

- `features/bookings/components/BookingDetail.tsx` gains a **Prescription** section, visible when the booking is `completed` and a finalized Rx exists.
- `GET /patient/prescriptions/:id` for the structured view (medicines as a readable list — a patient on a phone should not have to pinch-zoom a PDF to read a dosage), plus a **Download PDF** button to `GET /patient/prescriptions/:id/pdf`.
- A **My Prescriptions** page listing all of them across bookings.
- No template UI, no editing — patients read.

---

## 8. Acceptance checklist (frontend)

1. A doctor with **zero** templates opens the composer → the auto-provisioned letterhead already shows their name, qualification, registration number, and clinic address. No empty state, no setup wizard.
2. Editing `headerBgColor` updates `RxPreview` within a frame; the autosave chip goes `Saving… → Saved`; a hard refresh shows the new colour.
3. "Preview PDF" after an edit shows the edit. Clicking it twice does not re-render server-side.
4. Uploading a 6 MB PNG logo → clear inline error from the server's size limit, not a crashed dropzone.
5. Removing the sidebar (`showSidebar: false`) widens the body in both the live preview and the PDF.
6. Finalize → the appointment dialog's button becomes "View prescription" without a manual refresh.
7. Amend → composer opens pre-filled with the previous medicines; the original is chipped "superseded".
8. The patient app never renders a draft.
9. Keyboard: the medicine table is fully operable with Tab/Enter; the credential-line ↑/↓ buttons have accessible names.
10. The preview scales correctly at 1280 px and at 1920 px, and collapses on mobile without overflowing the page body horizontally.
