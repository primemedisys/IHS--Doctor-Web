"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { FiPlus, FiX } from "react-icons/fi";
import type {
  MedicineColumn,
  PatientFieldKey,
  Prescription,
  PrescriptionItem,
  PrescriptionTemplate,
  PrescriptionUpdate,
  Vitals,
} from "@/types/prescription";
import { DURATION_UNITS, MEDICINE_ROUTES, MEDICINE_TIMINGS } from "@/types/prescription";
import { COLUMN_LABELS, DURATION_UNIT_LABELS, ROUTE_LABELS, TIMING_LABELS, fmtDate } from "./rx-format";
import { useNumberedLines } from "./AdviceLines";
import { emptyItem } from "./MedicineTable";
import { VITAL_FOR_FIELD, vitalValue, type Draft } from "./draft";

const A4 = { w: 210, h: 297 };

/** CSS px per mm at the CSS reference resolution (96dpi). */
const PX_PER_MM = 96 / 25.4;

/**
 * An input that looks like the paper it sits on.
 *
 * Deliberately native `<input>`/`<select>`, not MUI `TextField`: the whole point
 * of this view is that nothing looks like a form control until you touch it,
 * and a native select also opens its menu correctly no matter how the sheet is
 * positioned — MUI's Popper has to compute coordinates, a native one doesn't.
 */
const paperField: SxProps<Theme> = {
  outline: 0,
  background: "transparent",
  font: "inherit",
  color: "inherit",
  fontWeight: 600,
  width: "100%",
  minWidth: 0,
  p: "0.9mm 1.4mm",
  /*
   * A real box per field, not a shared underline.
   *
   * Three underlined inputs sitting on one row read as one continuous ruled
   * line — you cannot see where Medicine ends and Dosage begins. An outlined
   * box costs a little of the paper look and buys an unambiguous target.
   */
  border: "1.4px solid #8d8d8d",
  borderRadius: "1.2mm",
  transition: "background-color .12s, border-color .12s, box-shadow .12s",
  "&:hover": { borderColor: "#4a4a4a", backgroundColor: "rgba(0,0,0,.02)" },
  "&:focus": {
    borderColor: "var(--accent)",
    boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent)",
    backgroundColor: "#fff",
  },
  "&::placeholder": { color: "#bcbcbc", fontStyle: "italic", fontWeight: 400 },
};

const paperSelect: SxProps<Theme> = {
  ...(paperField as object),
  appearance: "none",
  cursor: "pointer",
};

export interface RxPadProps {
  rx: Prescription;
  template: PrescriptionTemplate;
  draft: Draft;
  onPatch: (local: Partial<Draft>, wire: PrescriptionUpdate) => void;
  /**
   * Fields filled from the Patient Workbench (migration 059). They are edited
   * there — on the pad they are shown, not typed, so the two can't disagree.
   */
  locked?: { chiefComplaint?: boolean; diagnosis?: boolean; vitals?: boolean };
  /**
   * The whole sheet is a preview of saved Patient Workbench data: nothing can
   * be typed, ticked, added or removed here. Fields keep their printed layout.
   */
  readOnly?: boolean;
  /** Printed from the Workbench snapshot (same lines the PDF prints). */
  investigations?: string[];
  followUpNote?: string | null;
}

/** A medicine cell as it prints, for the read-only sheet. */
function cellText(column: MedicineColumn, item: PrescriptionItem): string {
  switch (column) {
    case "route":
      return item.route ? ROUTE_LABELS[item.route] : "";
    case "timing":
      return item.timing ? TIMING_LABELS[item.timing] : "";
    case "durationDays":
      return item.durationDays ? `${item.durationDays} ${DURATION_UNIT_LABELS[item.durationUnit ?? "day"]}` : "";
    default: {
      const v = item[column as "medicineName" | "dosage" | "frequency" | "notes"];
      return v == null ? "" : String(v);
    }
  }
}

/**
 * The letterhead as a WRITING SURFACE — the doctor fills in their own printed
 * pad rather than a form that later becomes one.
 *
 * Rendered at TRUE A4 width with no CSS `transform`. A scaled sheet gives you a
 * scaled caret and mispositioned menus, and none of that is worth the fit; a
 * pane too narrow for 210mm scrolls sideways instead, and the Form view is the
 * answer on a phone.
 *
 * The sheet is ONE PAGE and says so: content is measured against the printable
 * area, and once it is full the "add" affordances switch off rather than
 * letting the doctor write into space that the sheet cannot show.
 */
export function RxPad({ rx, template: t, draft, onPatch: writePatch, locked, readOnly = false, investigations = [], followUpNote = null }: RxPadProps) {
  // Read-only: every writer below becomes a no-op, so nothing typed here can reach the draft.
  const onPatch: RxPadProps["onPatch"] = (local, wire) => {
    if (!readOnly) writePatch(local, wire);
  };
  const padX = Math.max(t.marginMmLeft, t.marginMmRight);
  const picked = new Set(draft.adviceSelected);
  const columns = t.bodyJson.medicineColumns;

  const flowRef = useRef<HTMLDivElement | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [full, setFull] = useState(false);
  /*
   * How much the A4 sheet is magnified to fill the width it's given.
   *
   * The sheet itself stays EXACTLY 210×297mm and everything on it keeps its
   * printed size — only this one number changes. That is what makes the pad a
   * true zoom of the page: every line break falls where it falls on paper, so
   * the "page is full" check below is measuring the real thing rather than an
   * approximation that would let a full-looking page overrun in print.
   */
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const fit = () => setZoom(Math.max(0.35, el.clientWidth / (A4.w * PX_PER_MM)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /*
   * Is the sheet full? Measured, never estimated — the number of rows that fit
   * depends on the doctor's font, base size and margins, all of which are
   * template settings. Runs after layout so it sees the sheet as painted.
   */
  const measure = useCallback(() => {
    const el = flowRef.current;
    if (!el) return;
    setFull(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useLayoutEffect(measure);

  useEffect(() => {
    const el = flowRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // ── draft writers ─────────────────────────────────────────────────────────
  const setItems = (items: PrescriptionItem[]) => onPatch({ items }, { items });
  const setItem = (i: number, next: Partial<PrescriptionItem>) =>
    setItems(draft.items.map((it, j) => (j === i ? { ...it, ...next } : it)));
  const addItem = () => setItems([...draft.items, emptyItem()]);

  const setVital = (key: keyof Vitals, raw: string) => {
    if (locked?.vitals) return; // from the Workbench — recorded there
    const vitals = { ...draft.vitals, [key]: vitalValue(key, raw) } as Vitals;
    onPatch({ vitals }, { vitals });
  };

  const toggleSidebar = (item: string) => {
    const next = new Set(picked);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    const adviceSelected = [...next];
    onPatch({ adviceSelected }, { adviceSelected });
  };

  /** Patient-strip values. Vitals are editable in place; identity is not. */
  const readOnlyField = (key: PatientFieldKey): string => {
    switch (key) {
      case "name":
        return rx.patient.name ?? "";
      case "age":
        return rx.patient.age != null ? `${rx.patient.age} / ${sexLetter(rx.patient.gender)}` : "";
      case "sex":
        return sexLetter(rx.patient.gender);
      case "phone":
        return rx.patient.phone ?? "";
      case "address":
        return [rx.patient.addressLine, rx.patient.city].filter(Boolean).join(", ");
      case "date":
        // TODAY, not the appointment date — the server stamps the printed date
        // from `finalizedAt`, so today is what will actually appear on the page.
        return fmtDate(new Date());
      default:
        return "";
    }
  };

  const enabledFields = t.patientFieldsJson.filter((f) => f.enabled);
  const rows = [1, 2, 3]
    .map((n) => enabledFields.filter((f) => (f.row ?? 1) === n))
    .filter((g) => g.length);

  const hasSidebar = t.showSidebar && t.sidebarJson.groups.some((g) => g.items.length > 0);

  /*
   * Vitals appear in ONE place, never two.
   *
   * The letterhead already carries BP/Pulse/Wt in its patient strip whenever
   * those fields are enabled — printing them again as a body section is the
   * kind of duplication that makes a doctor wonder which one the patient sees.
   * The body block is the fallback for letterheads that don't put them up top.
   */
  const vitalsInStrip = enabledFields.some((f) => f.key in VITAL_FOR_FIELD);

  return (
    <Stack spacing={1.5} sx={{ alignItems: "center" }}>
      {full && (
        <Alert severity="warning" sx={{ width: "100%", maxWidth: `${A4.w}mm` }}>
          {readOnly
            ? "This prescription is longer than one page — shorten it in the Patient Workbench (medicines, advice or investigations)."
            : "The page is full — remove a line to add another. A prescription is one page."}
        </Alert>
      )}

      {/* The holder reserves the magnified page's footprint; the sheet inside
          is always a true A4, scaled to fill it. */}
      <Box
        ref={holderRef}
        sx={{ width: "100%", height: A4.h * PX_PER_MM * zoom, pb: 1 }}
      >
        <Box
          sx={{
            width: `${A4.w}mm`,
            height: `${A4.h}mm`,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            overflow: "hidden",
            bgcolor: "#fff",
            color: "#111",
            boxShadow: 3,
            display: "flex",
            flexDirection: "column",
            // Same variable names as backend/src/templates/prescriptions/rx.html
            "--header-bg": t.headerBgColor,
            "--header-text": t.headerTextColor,
            "--footer-bg": t.footerBgColor,
            "--footer-text": t.footerTextColor,
            "--accent": t.accentColor,
            "--font": t.fontFamily,
            "--base": `${t.baseFontSizePt}pt`,
            "--wm-opacity": t.watermarkOpacity,
            "--pad-x": `${padX}mm`,
            fontFamily: "var(--font)",
            // True printed size. The magnification lives on `transform` above,
            // so type, margins and rules all grow by the same factor.
            fontSize: "var(--base)",
            // A preview, not a form: field boxes and placeholders disappear so
            // the sheet reads as the printed page.
            ...(readOnly
              ? {
                  "& input, & select, & textarea": {
                    borderColor: "transparent !important",
                    backgroundColor: "transparent !important",
                    boxShadow: "none !important",
                    pointerEvents: "none",
                  },
                  "& input::placeholder": { color: "transparent" },
                }
              : {}),
          }}
        >
          {/* ① header — the doctor's letterhead, edited in the template editor */}
          {t.showHeader && (
            <Box
              sx={{
                bgcolor: "var(--header-bg)",
                color: "var(--header-text)",
                px: "var(--pad-x)",
                py: "6mm",
                display: "flex",
                gap: "8mm",
                alignItems: "flex-start",
                flexShrink: 0,
                flexDirection: t.headerJson.logoPosition === "left" ? "row-reverse" : "row",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontWeight: 700, fontSize: "1.65em", lineHeight: 1.1 }}>
                  {t.headerJson.doctorNameLine}
                </Box>
                <Box component="ul" sx={{ m: "1mm 0 0", p: 0, listStyle: "none" }}>
                  {t.headerJson.credentialLines.map((line, i) => (
                    <Box
                      component="li"
                      key={`${line}-${i}`}
                      sx={{ fontSize: ".82em", lineHeight: 1.35, fontWeight: i === 0 ? 600 : 400 }}
                    >
                      {line}
                    </Box>
                  ))}
                </Box>
                {t.headerJson.regNoValue && (
                  <Box sx={{ mt: "1.2mm", fontSize: ".82em", fontWeight: 600 }}>
                    {t.headerJson.regNoLabel} {t.headerJson.regNoValue}
                  </Box>
                )}
              </Box>
              {(t.assets.logoUrl || t.headerJson.clinicName) && (
                <Box sx={{ textAlign: "center", flexShrink: 0, maxWidth: "45mm" }}>
                  {t.assets.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.assets.logoUrl}
                      alt=""
                      style={{ maxWidth: "28mm", maxHeight: "22mm", display: "block", margin: "0 auto 1mm" }}
                    />
                  )}
                  {t.headerJson.clinicName && (
                    <Box sx={{ fontWeight: 700, fontSize: "1.15em", letterSpacing: ".4px" }}>
                      {t.headerJson.clinicName}
                    </Box>
                  )}
                  {t.headerJson.clinicTagline && (
                    <Box sx={{ fontSize: ".72em" }}>{t.headerJson.clinicTagline}</Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* ② patient strip — identity is read-only, vitals type in place */}
          {rows.length > 0 && (
            <Box
              sx={{
                px: "var(--pad-x)",
                py: "3mm",
                borderBottom: "1.2px solid var(--accent)",
                flexShrink: 0,
              }}
            >
              {rows.map((group, i) => (
                <Box key={i} sx={{ display: "flex", flexWrap: "wrap", gap: "0 6mm", mb: "2mm" }}>
                  {group.map((f) => {
                    const vitalKey = VITAL_FOR_FIELD[f.key as keyof typeof VITAL_FOR_FIELD];
                    return (
                      <Box
                        key={f.key}
                        sx={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "1.5mm",
                          // The address is the longest thing on the strip; give
                          // it the whole row so it doesn't wrap to three lines
                          // and eat the page it has to share.
                          flex: f.key === "address" ? "1 1 100%" : f.key === "name" ? "1 1 40mm" : "0 1 auto",
                          minWidth: vitalKey ? "24mm" : undefined,
                        }}
                      >
                        <Box sx={{ fontSize: ".86em", fontWeight: 700, color: "#333", whiteSpace: "nowrap" }}>
                          {f.label}
                        </Box>
                        {vitalKey ? (
                          vitalKey === "bloodPressure" ? (
                            <PadBloodPressure
                              value={String(draft.vitals[vitalKey] ?? "")}
                              onChange={(v) => setVital(vitalKey, v)}
                              readOnly={readOnly || locked?.vitals}
                            />
                          ) : (
                            <Box
                              component="input"
                              aria-label={f.label}
                              value={String(draft.vitals[vitalKey] ?? "")}
                              readOnly={readOnly || locked?.vitals}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setVital(vitalKey, e.target.value)
                              }
                              sx={{
                                ...(paperField as object),
                                fontSize: ".9em",
                                fontWeight: 600,
                                minWidth: "16mm",
                                flex: 1,
                              }}
                            />
                          )
                        ) : (
                          <Box
                            sx={{
                              borderBottom: "1px dotted #666",
                              minWidth: "18mm",
                              flex: 1,
                              fontSize: ".95em",
                              fontWeight: 700,
                              px: "1mm",
                            }}
                          >
                            {readOnlyField(f.key)}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          )}

          {/* ③ + ④ body */}
          <Box sx={{ flex: 1, display: "flex", position: "relative", minHeight: 0 }}>
            {t.showWatermark && t.assets.watermarkUrl && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${t.assets.watermarkUrl})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "55%",
                  opacity: "var(--wm-opacity)",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
            )}

            {hasSidebar && (
              <Box
                sx={{
                  width: `${t.sidebarWidthPct}%`,
                  flexShrink: 0,
                  borderRight: "1.2px solid var(--accent)",
                  p: "3mm 2.5mm 3mm var(--pad-x)",
                  position: "relative",
                  zIndex: 1,
                  /*
                   * `auto`, not `hidden`. A letterhead with more tick-items
                   * than fit in 297mm clipped the rest out of existence: they
                   * stayed in the DOM, unreachable by wheel or trackpad, so the
                   * doctor could not tick an investigation they could not see.
                   * The sidebar is template-defined and NOT something they can
                   * shorten from this screen, so scrolling is the only way to
                   * reach it. No scrollbar is reserved until it actually
                   * overflows, so a sidebar that fits keeps its exact printed
                   * width.
                   */
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                {t.sidebarJson.title && (
                  <Box sx={{ fontWeight: 700, fontSize: ".95em", mb: "1.5mm" }}>{t.sidebarJson.title}</Box>
                )}
                {t.sidebarJson.groups.map((g, gi) => (
                  <Box key={gi}>
                    {g.title && (
                      <Box sx={{ fontWeight: 600, fontSize: ".78em", m: "2mm 0 1mm", color: "#444" }}>
                        {g.title}
                      </Box>
                    )}
                    {g.items.map((item, ii) => (
                      // Tick it the way you'd circle it on the paper pad.
                      <Box
                        component="button"
                        type="button"
                        key={`${item}-${ii}`}
                        disabled={readOnly}
                        onClick={() => toggleSidebar(item)}
                        sx={{
                          all: "unset",
                          cursor: "pointer",
                          display: "flex",
                          gap: "1.2mm",
                          width: "100%",
                          fontSize: ".82em",
                          lineHeight: 1.6,
                          borderRadius: "1mm",
                          fontWeight: picked.has(item) ? 700 : 400,
                          "&:hover": { backgroundColor: "rgba(0,0,0,.05)" },
                          "&:focus-visible": { outline: "1px solid var(--accent)" },
                        }}
                      >
                        <Box sx={{ width: "3mm", flexShrink: 0 }}>{picked.has(item) ? "✓" : "•"}</Box>
                        <Box>{item}</Box>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            )}

            {/* The flowing column — the thing that must fit on one page. */}
            <Box
              ref={flowRef}
              sx={{
                flex: 1,
                p: "3mm var(--pad-x) 3mm 4mm",
                position: "relative",
                zIndex: 1,
                minWidth: 0,
                /*
                 * `auto`, not `hidden` — the sheet is still exactly one page,
                 * but the part that spills past it has to be REACHABLE.
                 *
                 * Clipped content was unreachable by wheel or trackpad, which
                 * made the "page is full" warning unactionable: it tells the
                 * doctor to remove a line, and the line to remove was the one
                 * they could not scroll to. (`hidden` is still a scroll
                 * container, so focus already scrolled it — only the user
                 * couldn't.)
                 *
                 * Print fidelity is untouched: the PDF is rendered server-side
                 * from templates/prescriptions/rx.html, never from this view,
                 * and `auto` reserves no scrollbar until the page is already
                 * over-full — so a prescription that fits keeps line-for-line
                 * the geometry it will print with.
                 */
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Rx No. above the date — the same order the PDF prints them. A
                  draft has no number yet; it is assigned at signing. */}
              <Box sx={{ textAlign: "right", fontSize: ".86em", mb: "2mm", lineHeight: 1.5 }}>
                <Box>
                  Rx No.:{" "}
                  {rx.rxNumber ? (
                    <b>{rx.rxNumber}</b>
                  ) : (
                    <Box component="span" sx={{ color: "#999", fontStyle: "italic" }}>
                      on signing
                    </Box>
                  )}
                </Box>
                <Box>
                  Date: <b>{readOnlyField("date")}</b>
                </Box>
              </Box>

              {/* Only when the letterhead's patient strip doesn't already carry them.
                  BP, Weight, Height are in the patient strip — only show other vitals here. */}
              {t.bodyJson.showVitals && !vitalsInStrip && (
                <PadSection label="Vitals">
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "1mm 5mm", fontSize: ".9em" }}>
                    <PadVital label="Pulse" value={draft.vitals.pulseRateBpm ?? ""} onChange={(v) => setVital("pulseRateBpm", v)} suffix="bpm" readOnly={readOnly || locked?.vitals} />
                    <PadVital label="Temp" value={draft.vitals.temperatureF ?? ""} onChange={(v) => setVital("temperatureF", v)} suffix="°F" readOnly={readOnly || locked?.vitals} />
                    <PadVital label="SpO₂" value={draft.vitals.spo2Percent ?? ""} onChange={(v) => setVital("spo2Percent", v)} suffix="%" readOnly={readOnly || locked?.vitals} />
                  </Box>
                </PadSection>
              )}

              <PadSection label="Chief complaint">
                <PadNumberedList
                  name="Complaint"
                  value={draft.chiefComplaint}
                  placeholder="What the patient came in with"
                  disabled={full}
                  readOnly={readOnly || locked?.chiefComplaint}
                  onChange={(chiefComplaint) => onPatch({ chiefComplaint }, { chiefComplaint })}
                />
              </PadSection>

              {t.bodyJson.showDiagnosis && (
                <PadSection label="Diagnosis">
                  <PadNumberedList
                    name="Diagnosis"
                    value={draft.diagnosis}
                    placeholder="Diagnosis"
                    disabled={full}
                    readOnly={readOnly || locked?.diagnosis}
                    onChange={(diagnosis) => onPatch({ diagnosis }, { diagnosis })}
                  />
                </PadSection>
              )}

              {/* ℞ — the medicine table, typed directly into the printed grid */}
              <Box sx={{ mb: "3.5mm" }}>
                {t.bodyJson.rxSymbol && (
                  <Box sx={{ fontSize: "1.7em", fontWeight: 700, fontFamily: "Georgia, serif", mb: "1mm" }}>
                    ℞
                  </Box>
                )}
                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: ".93em", tableLayout: "fixed" }}>
                  <colgroup>
                    {columns.map((c) => (
                      <col key={c} style={{ width: c === "medicineName" ? "34%" : undefined }} />
                    ))}
                    <col style={{ width: "6mm" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <Box
                          component="th"
                          key={c}
                          sx={{
                            textAlign: "left",
                            borderBottom: "1.2px solid var(--accent)",
                            p: "1.2mm 1.5mm",
                            fontSize: ".84em",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: ".4px",
                            color: "#3a3a3a",
                          }}
                        >
                          {COLUMN_LABELS[c]}
                        </Box>
                      ))}
                      <Box component="th" sx={{ borderBottom: "1.2px solid var(--accent)" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item, i) => (
                      <Box
                        component="tr"
                        key={i}
                        sx={{ "&:hover .rx-row-remove": { opacity: 1 } }}
                      >
                        {columns.map((c) => (
                          <Box
                            component="td"
                            key={c}
                            // No row rule — each field now carries its own box,
                            // and both together is visual noise.
                            sx={{ p: "0.9mm 0.8mm", verticalAlign: "middle" }}
                          >
                            {readOnly ? (
                              <Box sx={{ p: "0.9mm 1.4mm", fontWeight: c === "medicineName" ? 700 : 500, overflowWrap: "anywhere" }}>
                                {cellText(c, item) || "—"}
                              </Box>
                            ) : (
                            <PadCell
                              column={c}
                              item={item}
                              onChange={(next) => setItem(i, next)}
                              onEnter={i === draft.items.length - 1 && !full ? addItem : undefined}
                            />
                            )}
                          </Box>
                        ))}
                        <Box component="td" sx={{ borderBottom: "1px solid #e2e2e2", p: 0 }}>
                          {!readOnly && (
                          <Box
                            component="button"
                            type="button"
                            className="rx-row-remove"
                            aria-label={`Remove ${item.medicineName || `medicine ${i + 1}`}`}
                            onClick={() => setItems(draft.items.filter((_, j) => j !== i))}
                            sx={{
                              all: "unset",
                              cursor: "pointer",
                              opacity: 0,
                              transition: "opacity .12s",
                              color: "#b00",
                              display: "grid",
                              placeItems: "center",
                              width: "5mm",
                              height: "5mm",
                              "&:focus-visible": { opacity: 1, outline: "1px solid var(--accent)" },
                            }}
                          >
                            <FiX />
                          </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </tbody>
                </Box>
                {readOnly ? (
                  draft.items.length === 0 && (
                    <Box sx={{ fontSize: ".86em", color: "#777", fontStyle: "italic", mt: "1mm" }}>
                      {rx.noMedication ? "Medication not needed." : "No medicines in the Workbench medication order."}
                    </Box>
                  )
                ) : (
                  <PadAdd label="Add medicine" onClick={addItem} disabled={full} />
                )}
              </Box>

              {/* Printed from the Workbench investigation orders (same lines as the PDF). */}
              {investigations.length > 0 && (
                <PadSection label="Investigations">
                  <Box sx={{ fontSize: ".92em", whiteSpace: "pre-wrap" }}>
                    {investigations.map((line, i) => `${i + 1}. ${line}`).join("\n")}
                  </Box>
                </PadSection>
              )}

              {t.bodyJson.showAdviceText && (!readOnly || draft.advice.trim() !== "") && (
                <PadSection label="Advice">
                  <PadNumberedList
                    name="Advice"
                    value={draft.advice}
                    placeholder="e.g. Avoid forward bending"
                    disabled={full}
                    readOnly={readOnly}
                    onChange={(advice) => onPatch({ advice }, { advice })}
                  />
                </PadSection>
              )}

              {t.bodyJson.showFollowUp && readOnly && draft.followUpDate && (
                <PadSection label="Follow-up">
                  <Box sx={{ fontSize: ".92em" }}>
                    {[fmtDate(draft.followUpDate), followUpNote].filter(Boolean).join(" — ")}
                  </Box>
                </PadSection>
              )}

              {t.bodyJson.showFollowUp && !readOnly && (
                <PadSection label="Follow-up">
                  <Box
                    component="input"
                    type="date"
                    aria-label="Follow-up date"
                    value={draft.followUpDate ? draft.followUpDate.slice(0, 10) : ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onPatch({ followUpDate: e.target.value }, { followUpDate: e.target.value || null })
                    }
                    sx={{ ...(paperField as object), fontSize: ".92em", width: "40mm" }}
                  />
                </PadSection>
              )}

              {/* Pushes the signature to the foot of the sheet, as on paper. */}
              <Box sx={{ mt: "auto", pt: "4mm", textAlign: "right" }}>
                {t.assets.signatureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.assets.signatureUrl} alt="" style={{ maxHeight: "16mm", maxWidth: "45mm" }} />
                )}
                <Box sx={{ borderTop: "1px solid #333", width: "45mm", ml: "auto", mt: "1mm", pt: "1mm" }}>
                  <Box sx={{ fontSize: ".8em", fontWeight: 600 }}>{t.headerJson.doctorNameLine}</Box>
                </Box>
              </Box>

              {t.bodyJson.disclaimer && (
                <Box sx={{ mt: "3mm", fontSize: ".68em", color: "#777", fontStyle: "italic" }}>
                  {t.bodyJson.disclaimer}
                </Box>
              )}
            </Box>
          </Box>

          {/* ⑥ footer */}
          {t.showFooter && (
            <Box
              sx={{
                bgcolor: "var(--footer-bg)",
                color: "var(--footer-text)",
                px: "var(--pad-x)",
                py: "3.5mm",
                display: "flex",
                gap: "6mm",
                flexShrink: 0,
              }}
            >
              {t.footerJson.columns.map((col, i) => (
                <Box key={i} sx={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                  {col.title && <Box sx={{ fontWeight: 700, fontSize: ".8em", mb: ".8mm" }}>{col.title}</Box>}
                  {col.lines.map((line, j) => (
                    <Box key={j} sx={{ fontSize: ".74em", lineHeight: 1.45, wordBreak: "break-word" }}>
                      {line}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Read-only: notes typed on this draft earlier still print, so they are shown. */}
      {readOnly && draft.notes.trim() !== "" && (
        <Box sx={{ width: "100%", maxWidth: `${A4.w}mm`, p: 1.25, border: 1, borderColor: "divider", borderRadius: 1, fontSize: 14, whiteSpace: "pre-wrap" }}>
          <b>Notes (also print on the prescription):</b> {draft.notes}
        </Box>
      )}

      {/* Notes live OFF the sheet — see the caption. */}
      {!readOnly && (
      <Box sx={{ width: "100%", maxWidth: `${A4.w}mm` }}>
        <Box
          component="textarea"
          aria-label="Notes"
          placeholder="Notes — these also print on the prescription"
          value={draft.notes}
          rows={2}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onPatch({ notes: e.target.value }, { notes: e.target.value })
          }
          sx={{
            width: "100%",
            resize: "vertical",
            p: 1.25,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            color: "text.primary",
            font: "inherit",
            fontSize: 14,
            "&:focus": { outline: "2px solid", outlineColor: "primary.main" },
          }}
        />
      </Box>
      )}
    </Stack>
  );
}

const sexLetter = (g: string | null) => (g === "male" ? "M" : g === "female" ? "F" : g ? "O" : "—");

/**
 * A numbered, growable list stored in ONE text column — "1. …\n2. …".
 *
 * Chief complaint, diagnosis and advice are each a single TEXT field on the
 * wire, and the PDF prints them verbatim under `white-space: pre-wrap`. So the
 * numbering lives in the saved string: the printed page, the emailed copy and
 * the read-only record all show the list without a schema change.
 */
function PadNumberedList({
  name,
  value,
  placeholder,
  onChange,
  disabled,
  readOnly,
}: {
  name: string;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Shown, not typed (filled from the Patient Workbench). */
  readOnly?: boolean;
}) {
  // Local rows, persisted as numbered text — a blank row has to exist here to
  // be typed into, and cannot survive serialization. See `useNumberedLines`.
  const { lines, commit } = useNumberedLines(value, onChange);

  const focusRow = (listEl: HTMLElement | null, index: number) =>
    requestAnimationFrame(() => {
      const inputs = listEl?.querySelectorAll<HTMLInputElement>("input");
      inputs?.[index]?.focus();
    });

  return (
    <Box data-pad-list>
      {lines.map((line, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: "1.5mm",
            mb: "0.6mm",
            "&:hover .pad-row-remove": { opacity: 1 },
          }}
        >
          <Box sx={{ fontSize: ".95em", fontWeight: 700, color: "#555", minWidth: "5mm", flexShrink: 0 }}>
            {i + 1}.
          </Box>
          <Box
            component="input"
            aria-label={`${name} ${i + 1}`}
            placeholder={i === 0 ? placeholder : `Next ${name.toLowerCase()}`}
            value={line}
            readOnly={readOnly}
            title={readOnly ? "From the Patient Workbench — edit it there" : undefined}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              commit(lines.map((l, j) => (j === i ? e.target.value : l)))
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (readOnly) return;
              const list = e.currentTarget.closest("[data-pad-list]") as HTMLElement | null;
              if (e.key === "Enter") {
                e.preventDefault();
                if (disabled) return;
                if (i === lines.length - 1) commit([...lines, ""]);
                focusRow(list, i + 1);
                return;
              }
              // Backspace on an empty row removes it, like any list editor.
              if (e.key === "Backspace" && line === "" && lines.length > 1) {
                e.preventDefault();
                commit(lines.filter((_, j) => j !== i));
                focusRow(list, Math.max(0, i - 1));
              }
            }}
            sx={{ ...(paperField as object), fontSize: ".95em" }}
          />
          {/* Hover-revealed, exactly like a medicine row. Kept out of the way
              so a printed-looking page isn't littered with delete crosses. */}
          {!readOnly && (
          <Box
            component="button"
            type="button"
            className="pad-row-remove"
            aria-label={`Remove ${name.toLowerCase()} ${i + 1}`}
            onClick={() => {
              const next = lines.filter((_, j) => j !== i);
              commit(next.length ? next : [""]);
            }}
            sx={{
              all: "unset",
              cursor: "pointer",
              flexShrink: 0,
              opacity: 0,
              transition: "opacity .12s",
              color: "#b00",
              display: "grid",
              placeItems: "center",
              width: "5mm",
              height: "5mm",
              "&:focus-visible": { opacity: 1, outline: "1px solid var(--accent)" },
            }}
          >
            <FiX />
          </Box>
          )}
        </Box>
      ))}
      {!readOnly && <PadAdd label={`Add ${name.toLowerCase()}`} onClick={() => commit([...lines, ""])} disabled={disabled} />}
    </Box>
  );
}

function PadSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: "3.5mm" }}>
      <Box
        sx={{
          fontSize: ".8em",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".6px",
          color: "#4a4a4a",
          mb: "1mm",
        }}
      >
        {label}
      </Box>
      {children}
    </Box>
  );
}

/** A labelled vital, inline, the way it prints. */
function PadVital({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: "1mm" }}>
      <Box sx={{ color: "#444" }}>{label}:</Box>
      <Box
        component="input"
        aria-label={label}
        placeholder={placeholder}
        readOnly={readOnly}
        value={String(value)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        sx={{ ...(paperField as object), fontWeight: 700, width: "14mm" }}
      />
      {suffix && <Box sx={{ color: "#444", fontSize: ".9em" }}>{suffix}</Box>}
    </Box>
  );
}

/**
 * Split blood pressure into two separate inputs: [Systolic] / [Diastolic].
 * The combined value (e.g. "120/56") is stored in the vitals.bloodPressure field.
 */
function PadBloodPressure({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const parts = (value || "").split("/");
  const systolic = parts[0] ?? "";
  const diastolic = parts[1] ?? "";

  const handleChange = (part: "systolic" | "diastolic", raw: string) => {
    const s = part === "systolic" ? raw : systolic;
    const d = part === "diastolic" ? raw : diastolic;
    if (s && d) {
      onChange(`${s}/${d}`);
    } else if (s) {
      onChange(s);
    } else if (d) {
      onChange(`/${d}`);
    } else {
      onChange("");
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: "1mm" }}>
      <Box sx={{ color: "#444" }}>BP:</Box>
      <Box
        component="input"
        aria-label="Systolic BP"
        placeholder="120"
        readOnly={readOnly}
        value={systolic}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("systolic", e.target.value)}
        sx={{ ...(paperField as object), fontWeight: 700, width: "10mm" }}
      />
      <Box sx={{ color: "#444", fontWeight: 700 }}>/</Box>
      <Box
        component="input"
        aria-label="Diastolic BP"
        placeholder="56"
        readOnly={readOnly}
        value={diastolic}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("diastolic", e.target.value)}
        sx={{ ...(paperField as object), fontWeight: 700, width: "10mm" }}
      />
    </Box>
  );
}

/**
 * The "one more line" affordance — a pencil mark, not a button.
 *
 * The DOM is IDENTICAL whether or not it's disabled (same wrapper, only the
 * tooltip text and colours change). The fullness check measures this column, so
 * a structure that changed shape when full could measure differently, flip back
 * to not-full, and oscillate forever between the two renders.
 */
function PadAdd({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Tooltip title={disabled ? "The page is full" : ""}>
      <Box component="span" sx={{ display: "inline-block" }}>
        <Box
          component="button"
          type="button"
          onClick={onClick}
          disabled={disabled}
          sx={{
            all: "unset",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "1mm",
            mt: "1.2mm",
            px: "1mm",
            fontSize: ".76em",
            color: disabled ? "#bbb" : "var(--accent)",
            borderRadius: "1mm",
            "&:hover": disabled ? {} : { backgroundColor: "rgba(0,0,0,.05)" },
            "&:focus-visible": { outline: "1px solid var(--accent)" },
          }}
        >
          <FiPlus /> {label}
        </Box>
      </Box>
    </Tooltip>
  );
}

function PadCell({
  column,
  item,
  onChange,
  onEnter,
}: {
  column: MedicineColumn;
  item: PrescriptionItem;
  onChange: (next: Partial<PrescriptionItem>) => void;
  onEnter?: () => void;
}) {
  if (column === "route") {
    return (
      <Box
        component="select"
        aria-label="Route"
        value={item.route}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange({ route: e.target.value as PrescriptionItem["route"] })
        }
        sx={paperSelect}
      >
        {MEDICINE_ROUTES.map((r) => (
          <option key={r} value={r}>
            {ROUTE_LABELS[r]}
          </option>
        ))}
      </Box>
    );
  }

  if (column === "timing") {
    return (
      <Box
        component="select"
        aria-label="Timing"
        value={item.timing ?? ""}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange({ timing: (e.target.value || null) as PrescriptionItem["timing"] })
        }
        sx={paperSelect}
      >
        {/* Blank is a real choice: "after food" is meaningless on a gel, a
            drop or an inhaler, and it printed on the patient's copy anyway. */}
        <option value="">—</option>
        {MEDICINE_TIMINGS.map((t) => (
          <option key={t} value={t}>
            {TIMING_LABELS[t]}
          </option>
        ))}
      </Box>
    );
  }

  if (column === "durationDays") {
    return (
      <Box sx={{ display: "flex", alignItems: "baseline", gap: "1.5mm" }}>
        <Box
          component="input"
          type="number"
          aria-label="Duration count"
          placeholder="0"
          min={1}
          max={365}
          value={item.durationDays ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ durationDays: e.target.value === "" ? null : Number(e.target.value) })
          }
          sx={{
            ...(paperField as object),
            width: "13mm",
            flexShrink: 0,
            fontSize: "1.05em",
            fontWeight: 700,
            textAlign: "center",
            /*
             * Kill the native spinner. On a ~13mm cell the arrows claim roughly
             * half the box and clip the digits — a two-digit duration was
             * rendering as a sliver. Nobody steps a dosage duration by arrow.
             */
            MozAppearance: "textfield",
            "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
              WebkitAppearance: "none",
              margin: 0,
            },
          }}
        />
        <Box
          component="select"
          aria-label="Duration unit"
          value={item.durationUnit ?? "day"}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange({ durationUnit: e.target.value as PrescriptionItem["durationUnit"] })
          }
          sx={{ ...(paperSelect as object), flex: 1, minWidth: "16mm" }}
        >
          {DURATION_UNITS.map((u) => (
            <option key={u} value={u}>
              {DURATION_UNIT_LABELS[u]}
            </option>
          ))}
        </Box>
      </Box>
    );
  }

  const key = column as "medicineName" | "dosage" | "frequency" | "notes";
  return (
    <Box
      component="input"
      aria-label={COLUMN_LABELS[column]}
      placeholder={key === "medicineName" ? "Medicine" : ""}
      value={item[key] ?? ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ [key]: e.target.value || (key === "medicineName" ? "" : null) })
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      sx={{ ...(paperField as object), fontWeight: key === "medicineName" ? 600 : 400 }}
    />
  );
}
