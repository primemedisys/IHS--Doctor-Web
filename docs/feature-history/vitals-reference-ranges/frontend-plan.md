# Vitals Reference Ranges — Frontend Plan

**Read `README.md` first**, especially §3 (why colour must encode severity, not direction).
Legend: 🟢 exists · 🟡 extend · 🔵 new.

The frontends own **presentation only**. Every threshold lives in `backend/src/config/vitalsRanges.js` (README §5). If a number from §2 of the README appears in a `.tsx` file, the implementation is wrong.

---

## 1. The status → colour map 🔵

One tiny module per app (`features/health/vitalStatus.ts` in patient, `features/appointments/vitalStatus.ts` in doctor):

```ts
import type { Theme } from "@mui/material/styles";

export type VitalStatus = "normal" | "low" | "borderline" | "high" | "critical" | "unknown";

/** README §3 — severity first, direction second. */
export const VITAL_STATUS_STYLE: Record<VitalStatus, {
  color: (t: Theme) => string; arrow: "↑" | "↓" | null; weight: number; ring: boolean;
}> = {
  normal:     { color: (t) => t.palette.text.primary,   arrow: null, weight: 400, ring: false },
  low:        { color: (t) => t.palette.info.main,      arrow: "↓",  weight: 600, ring: false }, // blue
  borderline: { color: (t) => t.palette.warning.main,   arrow: null, weight: 600, ring: false }, // amber
  high:       { color: (t) => t.palette.error.main,     arrow: "↑",  weight: 600, ring: false }, // red
  critical:   { color: (t) => t.palette.error.main,     arrow: null, weight: 800, ring: true  }, // red + ⚠
  unknown:    { color: (t) => t.palette.text.primary,   arrow: null, weight: 400, ring: false },
};
```

Notes that matter:

- **`unknown` renders exactly like `normal`** — plain. It must never look like a verdict. A child's pulse showing amber "we didn't check" would be worse than no colour at all.
- **`critical` gets a ring/badge, not just bolder red**, so it is distinguishable from `high` without relying on font weight alone.
- **The arrow is not decoration.** It is the non-colour channel required by WCAG 1.4.1. `borderline` and `critical` carry direction in their tooltip label instead, since both can occur in either direction.
- Use **theme palette tokens**, never hex. Both apps render in light and dark; a hard-coded `#d32f2f` fails contrast on a dark surface.

---

## 2. The cell 🔵 `VitalValueCell.tsx`

One component, used everywhere a vital renders:

```tsx
<VitalValueCell value={112} unit="bpm" status={statuses.pulseRateBpm} />
```

Renders: the value, the arrow when present, and wraps it in a `Tooltip` reading **`"Tachycardia — normal is 60–100 bpm"`** (label + range, both straight from the API).

`status.status === "unknown"` → render the bare value with **no** tooltip and no arrow.

Accessibility: the tooltip text is also the cell's `aria-label`, so a screen reader announces *"112 bpm, Tachycardia, normal is 60 to 100"* rather than a naked number.

---

## 3. Surface 1 — patient health page 🟡

`frontend-patient/src/features/health/components/HealthRecordTable.tsx`

Currently every cell goes through `const cell = (v) => (v == null || v === "" ? "—" : String(v))`. Replace that call site with `<VitalValueCell>`, passing `entry.statuses[field.key]`. The table's layout, sticky header, sticky date column and scroll-to-bottom behaviour are all unchanged.

**Add the disclaimer** (README §6) directly beneath the table, always visible — not behind an info icon:

> *Colours compare your readings to general adult reference ranges. They are not a diagnosis — talk to your doctor.*

**Add a legend** — a compact row of the five statuses with their colours. Without it a patient sees a red number and has no idea whether that means "slightly high" or "go to hospital."

---

## 4. Surface 2 — doctor patient page 🟡

`frontend-doctor/src/features/appointments/components/HealthRecordTable.tsx`

The same edit, against the same contract. This file is already a near-duplicate of the patient one, and the duplication is pre-existing — this plan does not fix it, but the **statuses come from the API**, so the two tables cannot disagree clinically even while their markup drifts.

The doctor's copy does **not** need the patient-facing disclaimer (a clinician reading reference ranges is the intended audience), but keeps the legend.

---

## 5. Surface 3 — prescription composer 🟡 *(decision README §7-E)*

`frontend-doctor/src/features/prescriptions/components/RxComposer.tsx`

Highest-value surface: the doctor is typing numbers that get **signed onto a legal medical document**, so an out-of-range entry should be visible at entry time.

Different shape from the tables — these are `<TextField>` inputs (`Vital` at the bottom of the file), not cells. Approach:

- Colour the input's **helper text and outline**, not the typed text (recolouring what someone is typing is jarring).
- Helper text carries the band label: `Tachycardia · normal 60–100`.
- **Never block, never auto-correct, never warn on submit.** A doctor may legitimately record an abnormal vital — that is the whole point of recording it. This is information, not validation.

Complication to note: the composer holds `draft.vitals` locally and autosaves, so statuses cannot come from the vitals-matrix payload. Two options:

- **(a)** Reuse the band tables via a tiny read-only endpoint (`GET /vitals/ranges`) and evaluate client-side. Keeps one source of truth, costs one cached request.
- **(b)** Evaluate on the server as part of the existing autosave `PATCH` response. No new endpoint, but statuses lag the keystroke by the 800 ms debounce.

**Recommended: (a).** The ranges are static configuration, cache them with `staleTime: Infinity`, and the doctor gets instant feedback while thresholds stay single-sourced.

---

## 6. What must **not** happen

- No threshold literals in frontend code (README §5).
- No colour on **Weight** or **Height** — the API sends `unknown` for both, and the cell renders plain. If either shows colour, the field table was edited wrongly.
- No alert, toast, modal or notification on `critical` (README §6). Colour and tooltip only.
- No advice text. Band names and ranges, never "consult a doctor immediately."

---

## 7. Verification

- Light **and** dark theme: all five statuses meet 4.5:1 contrast against the table surface.
- Simulate deuteranopia/protanopia (Chrome DevTools → Rendering → Emulate vision deficiencies): every non-normal cell is still identifiable via arrow, weight or ring.
- 360 px viewport: arrows and tooltips don't break the sticky-column layout.
- `tsc --noEmit` + ESLint clean on touched files in both apps.
