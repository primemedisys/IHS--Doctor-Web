# Frontend Plan — Blood Pressure Split Input + Vitals Deduplication

**Date:** 15-09-2026
**Scope:** Doctor frontend only (`frontend-doctor/`)
**Status:** ✅ Implemented

---

## 1. Overview

This document covers the frontend changes for:
1. Splitting the blood pressure input into two separate fields (systolic/diastolic)
2. Removing duplicate vitals (BP, Weight, Height) from the prescription body section

---

## 2. Components Modified

### 2.1 `RxComposer.tsx` — Prescription Form View

**Location:** `frontend-doctor/src/features/prescriptions/components/RxComposer.tsx`

**Changes:**

1. **Replaced BP Vital input** (line 354):
   ```tsx
   // BEFORE
   <Vital label="BP" value={draft.vitals.bloodPressure ?? ""} onChange={(v) => setVital("bloodPressure", v)} placeholder="130/85" />
   
   // AFTER
   <BloodPressureInput value={draft.vitals.bloodPressure ?? ""} onChange={(v) => setVital("bloodPressure", v)} />
   ```

2. **Added `BloodPressureInput` component** (after line 637):
   - Splits existing `"120/56"` value on `"/"`
   - Renders two MUI `TextField` components with `"/"` separator
   - Combines values before calling `onChange`
   - Handles edge cases: empty, partial, malformed values

**Component API:**
```tsx
function BloodPressureInput({
  value: string,        // e.g. "120/56" or ""
  onChange: (v: string) => void,  // receives combined value
}): JSX.Element
```

**Styling:**
- Uses existing MUI `TextField` with `size="small"`
- Systolic field: `width: 72px`, label "BP", placeholder "120"
- Separator: `Typography` with `fontWeight: 700`
- Diastolic field: `width: 72px`, label " " (empty), placeholder "56"
- Wrapped in `Stack direction="row" spacing={0.5}`

---

### 2.2 `RxPad.tsx` — Letterhead Pad View

**Location:** `frontend-doctor/src/features/prescriptions/components/RxPad.tsx`

**Changes:**

1. **Modified patient strip** (lines 332-347):
   - When `vitalKey === "bloodPressure"`, renders `<PadBloodPressure>` instead of generic input
   - Other vitals continue to use the generic input

2. **Added `PadBloodPressure` component** (after line 887):
   - Same split/combine logic as `BloodPressureInput`
   - Styled to match the letterhead pad's paper-like appearance
   - Uses native `<input>` with `paperField` styling

3. **Removed BP and Weight from body vitals section** (lines 502-512):
   - Only Pulse, Temperature, and SpO₂ remain
   - Comment added explaining BP/Weight/Height are in the patient strip

**Component API:**
```tsx
function PadBloodPressure({
  value: string,        // e.g. "120/56" or ""
  onChange: (v: string) => void,  // receives combined value
}): JSX.Element
```

**Styling:**
- Uses native `<input>` with `paperField` CSS (paper-like appearance)
- Systolic field: `width: 10mm`, placeholder "120"
- Separator: `Box` with `fontWeight: 700`, content "/"
- Diastolic field: `width: 10mm`, placeholder "56"
- Label: `Box` with "BP:" text
- Wrapped in `Box sx={{ display: "flex", alignItems: "baseline", gap: "1mm" }}`

---

### 2.3 `RxPreview.tsx` — Client-Side Preview

**Location:** `frontend-doctor/src/features/prescriptions/components/RxPreview.tsx`

**Changes:**

1. **Removed BP and Weight from vitals section** (lines 272-281):
   - Only Pulse remains in the body vitals
   - Comment added explaining BP/Weight/Height are in the patient strip

**Before:**
```tsx
<Section label="Vitals">
  <span>BP: <b>{val("bp")}</b></span>
  <span>Pulse: <b>{val("pulse") ? `${val("pulse")} bpm` : ""}</b></span>
  <span>Wt: <b>{val("weight") ? `${val("weight")} kg` : ""}</b></span>
</Section>
```

**After:**
```tsx
<Section label="Vitals">
  {/* BP, Weight, Height are already in the patient strip */}
  <span>Pulse: <b>{val("pulse") ? `${val("pulse")} bpm` : ""}</b></span>
</Section>
```

---

## 3. Data Flow

### 3.1 BP Input → Save

```
Doctor enters:  Systolic = 120, Diastolic = 56
                         ↓
BloodPressureInput.handleChange()
  s = "120", d = "56"
  onChange("120/56")
                         ↓
setVital("bloodPressure", "120/56")
  value = "120/56" (not numeric, kept as string)
  vitals = { ...draft.vitals, bloodPressure: "120/56" }
  patch({ vitals }, { vitals })
                         ↓
API: PATCH /doctor/prescriptions/:id
  body: { vitals: { bloodPressure: "120/56", ... } }
                         ↓
Database: blood_pressure = "120/56"
```

### 3.2 Load → Edit

```
Database: blood_pressure = "120/56"
                         ↓
API: GET /doctor/prescriptions/:id
  response: { vitals: { bloodPressure: "120/56", ... } }
                         ↓
draftFrom(rx): vitals = { bloodPressure: "120/56", ... }
                         ↓
BloodPressureInput:
  value = "120/56"
  parts = ["120", "56"]
  systolic = "120"
  diastolic = "56"
                         ↓
Renders:  [ 120 ] / [ 56 ]
```

---

## 4. State Management

No new state added. The existing `draft.vitals.bloodPressure` field continues to hold the combined string value. The split is purely a presentation concern.

**Existing state:**
```tsx
const [draft, setDraft] = useState<Draft>(() => draftFrom(rx));
// draft.vitals.bloodPressure = "120/56" (string)
```

**Existing setter:**
```tsx
const setVital = (key: keyof Vitals, raw: string) => {
  const value = raw === "" ? null : key === "bloodPressure" ? raw : Number(raw);
  const vitals = { ...draft.vitals, [key]: value } as Vitals;
  patch({ vitals }, { vitals });
};
```

The `bloodPressure` key is treated as free text (not numeric) — this behavior is unchanged.

---

## 5. Responsive Behavior

### 5.1 Form View (`RxComposer`)

The BP input uses MUI `Stack direction="row"` with `spacing={0.5}`:
- **Desktop:** Two fields sit side-by-side in the vitals row
- **Tablex:** Fields wrap with the existing `flexWrap: "wrap"` on the parent `Stack`
- **Mobile:** Fields stack vertically (MUI responsive spacing)

### 5.2 Letterhead Pad (`RxPad`)

The BP input uses `Box sx={{ display: "flex" }}`:
- **Desktop:** Two fields sit side-by-side in the patient strip
- **Tablet:** Fields fit within the patient strip row
- **Mobile:** Pad view is not recommended (Form view is the fallback)

---

## 6. Compatibility

### 6.1 Existing Prescriptions

No special handling required. The `draftFrom()` function reads `rx.vitals.bloodPressure` as-is:
- `"120/56"` → splits into `[120]` and `[56]`
- `"130"` → shows `[130]` and `[ "" ]`
- `""` → shows `[ "" ]` and `[ "" ]`
- `null` → shows `[ "" ]` and `[ "" ]`

### 6.2 Other Frontends

The following frontends are **not affected**:
- `frontend-patient/` — Uses read-only display, not edit
- `frontend-admin/` — Uses read-only display, not edit
- `frontend-clinic/` — Uses read-only display, not edit

### 6.3 Clinical Note Forms

The following components are **not modified** (separate from prescription workflow):
- `ClinicalNoteForm.tsx` — Uses single BP input for clinical notes
- `AddPatientVitalsModal.tsx` — Uses single BP input for vitals readings

These could be updated in a future pass for consistency, but are out of scope for this change.

---

## 7. Files Summary

| File | Lines Changed | Type |
|---|---|---|
| `RxComposer.tsx` | +53 lines | Modified + Added component |
| `RxPad.tsx` | +58 lines | Modified + Added component |
| `RxPreview.tsx` | -6 lines | Modified (removed vitals) |
| **Total** | +105 lines | — |
