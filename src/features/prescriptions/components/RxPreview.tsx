"use client";

import Box from "@mui/material/Box";
import type {
  PatientFieldKey,
  PrescriptionItem,
  PrescriptionTemplate,
  TemplateSnapshot,
} from "@/types/prescription";
import { COLUMN_LABELS, durationText, ROUTE_LABELS, SAMPLE_MEDICINES, SAMPLE_PATIENT, TIMING_LABELS } from "./rx-format";

/**
 * The real draft, when this preview is showing an actual prescription being
 * written rather than the letterhead editor's sample page.
 *
 * Every field is optional and blanks render as blanks: a half-filled draft must
 * look like a half-filled page, never fall back to sample text — a doctor who
 * saw "Ramananda Pattnaik" on their own patient's letterhead would rightly stop
 * trusting the preview entirely.
 */
export interface RxLiveData {
  patient: Partial<Record<PatientFieldKey, string>>;
  diagnosis?: string;
  advice?: string;
  followUp?: string;
  items: PrescriptionItem[];
}

/**
 * A live, APPROXIMATE render of the letterhead — fast enough to update while
 * the doctor drags a colour picker.
 *
 * It is deliberately not pixel-exact. The server's Chromium render is the
 * authority on what the page looks like (see "Preview PDF"), and chasing
 * parity between a browser <div> and a print stylesheet is weeks of work that
 * a Preview button makes unnecessary.
 *
 * The one discipline that keeps drift bounded: this file and the server's
 * `templates/prescriptions/rx.html` use the SAME CSS custom-property names.
 * Add a themeable value in both places, or in neither.
 */
export interface RxPreviewProps {
  template: PrescriptionTemplate | TemplateSnapshot;
  /** Assets live under `assets` on a live template and at the top level on a snapshot. */
  logoUrl?: string | null;
  watermarkUrl?: string | null;
  signatureUrl?: string | null;
  /** 1 = actual A4 size. The parent scales this down to fit its pane. */
  scale?: number;
  adviceSelected?: string[];
  /** Omit for the letterhead editor (sample page); pass to preview a real draft. */
  data?: RxLiveData;
}

const A4 = { w: 210, h: 297 };

export function RxPreview({
  template: t,
  logoUrl = null,
  watermarkUrl = null,
  signatureUrl = null,
  scale = 0.55,
  adviceSelected = [],
  data,
}: RxPreviewProps) {
  const padX = Math.max(t.marginMmLeft, t.marginMmRight);
  const picked = new Set(adviceSelected);
  /* Sample page vs real draft — resolved once, so no section below has to ask. */
  const val = (key: PatientFieldKey) => (data ? data.patient[key] ?? "" : SAMPLE_PATIENT[key]);
  const meds: readonly PrescriptionItem[] = data
    ? data.items.filter((i) => i.medicineName.trim())
    : (SAMPLE_MEDICINES as unknown as readonly PrescriptionItem[]);
  const enabledFields = t.patientFieldsJson.filter((f) => f.enabled);
  const rows = [1, 2, 3]
    .map((n) => enabledFields.filter((f) => (f.row ?? 1) === n))
    .filter((g) => g.length);

  return (
    // Render at TRUE A4 size and scale the whole thing down, so every child can
    // use mm/pt exactly as the print stylesheet does — only ONE number (scale)
    // differs between this preview and the PDF.
    <Box
      sx={{
        width: `${A4.w * scale}mm`,
        height: `${A4.h * scale}mm`,
        overflow: "hidden",
        boxShadow: 3,
        bgcolor: "#fff",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: `${A4.w}mm`,
          height: `${A4.h}mm`,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          color: "#111",
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
          fontSize: "var(--base)",
        }}
      >
        {/* ① header */}
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
            {(logoUrl || t.headerJson.clinicName) && (
              <Box sx={{ textAlign: "center", flexShrink: 0, maxWidth: "45mm" }}>
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
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

        {/* ② patient strip */}
        {rows.length > 0 && (
          <Box sx={{ px: "var(--pad-x)", py: "3mm", borderBottom: "1.2px solid var(--accent)" }}>
            {rows.map((group, i) => (
              <Box key={i} sx={{ display: "flex", flexWrap: "wrap", gap: "0 6mm", mb: "2mm" }}>
                {group.map((f) => (
                  <Box
                    key={f.key}
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "1.5mm",
                      flex: f.key === "name" || f.key === "address" ? "1 1 40mm" : "0 1 auto",
                    }}
                  >
                    <Box sx={{ fontSize: ".82em", color: "#333", whiteSpace: "nowrap" }}>{f.label}</Box>
                    <Box
                      sx={{
                        borderBottom: "1px dotted #666",
                        minWidth: "18mm",
                        flex: 1,
                        fontSize: ".9em",
                        fontWeight: 600,
                        px: "1mm",
                      }}
                    >
                      {val(f.key)}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}

        {/* ③ + ④ body */}
        <Box sx={{ flex: 1, display: "flex", position: "relative", minHeight: 0 }}>
          {t.showWatermark && watermarkUrl && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${watermarkUrl})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "55%",
                opacity: "var(--wm-opacity)",
                zIndex: 0,
              }}
            />
          )}

          {t.showSidebar && t.sidebarJson.groups.some((g) => g.items.length > 0) && (
            <Box
              sx={{
                width: `${t.sidebarWidthPct}%`,
                flexShrink: 0,
                borderRight: "1.2px solid var(--accent)",
                p: "3mm 2.5mm 3mm var(--pad-x)",
                position: "relative",
                zIndex: 1,
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
                    <Box
                      key={`${item}-${ii}`}
                      sx={{
                        fontSize: ".74em",
                        lineHeight: 1.55,
                        display: "flex",
                        gap: "1.2mm",
                        fontWeight: picked.has(item) ? 700 : 400,
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

          <Box sx={{ flex: 1, p: "3mm var(--pad-x) 3mm 4mm", position: "relative", zIndex: 1, minWidth: 0 }}>
            <Box sx={{ textAlign: "right", fontSize: ".82em", mb: "2mm" }}>
              Date: <b>{val("date")}</b>
            </Box>

            {t.bodyJson.showVitals && (
              <Section label="Vitals">
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "1mm 5mm", fontSize: ".84em" }}>
                  {/* BP, Weight, Height are already in the patient strip — only show other vitals here. */}
                  <span>
                    Pulse: <b>{val("pulse") ? `${val("pulse")} bpm` : ""}</b>
                  </span>
                </Box>
              </Section>
            )}

            {t.bodyJson.showDiagnosis && (
              <Section label="Diagnosis">
                <Box sx={{ fontSize: ".92em" }}>
                  {data ? data.diagnosis || "" : "L4–L5 disc bulge with radiculopathy"}
                </Box>
              </Section>
            )}

            <Box sx={{ mb: "3.5mm" }}>
              {t.bodyJson.rxSymbol && (
                <Box sx={{ fontSize: "1.7em", fontWeight: 700, fontFamily: "Georgia, serif", mb: "1mm" }}>
                  ℞
                </Box>
              )}
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: ".84em" }}>
                <thead>
                  <tr>
                    {t.bodyJson.medicineColumns.map((c) => (
                      <Box
                        component="th"
                        key={c}
                        sx={{
                          textAlign: "left",
                          borderBottom: "1.2px solid var(--accent)",
                          p: "1.2mm 1.5mm",
                          fontSize: ".82em",
                          textTransform: "uppercase",
                          letterSpacing: ".4px",
                          color: "#444",
                        }}
                      >
                        {COLUMN_LABELS[c]}
                      </Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meds.map((med, mi) => (
                    <tr key={`${med.medicineName}-${mi}`}>
                      {t.bodyJson.medicineColumns.map((c) => (
                        <Box
                          component="td"
                          key={c}
                          sx={{
                            p: "1.4mm 1.5mm",
                            borderBottom: "1px solid #e2e2e2",
                            fontWeight: c === "medicineName" ? 600 : 400,
                          }}
                        >
                          {c === "durationDays"
                            ? durationText(med.durationDays, med.durationUnit)
                            : c === "timing"
                              ? med.timing
                                ? TIMING_LABELS[med.timing]
                                : ""
                              : c === "route"
                                ? ROUTE_LABELS[med.route] ?? ""
                                : (med[c as "medicineName" | "dosage" | "frequency" | "notes"] ?? "")}
                        </Box>
                      ))}
                    </tr>
                  ))}
                  {meds.length === 0 && (
                    <tr>
                      <Box
                        component="td"
                        colSpan={t.bodyJson.medicineColumns.length}
                        sx={{ p: "2mm 1.5mm", color: "#999", fontStyle: "italic" }}
                      >
                        No medicines added yet
                      </Box>
                    </tr>
                  )}
                </tbody>
              </Box>
            </Box>

            {t.bodyJson.showAdviceText && (
              <Section label="Advice">
                {/* pre-line mirrors the PDF's `white-space: pre-wrap`, so the
                    numbered advice lines break here exactly as they print. */}
                <Box sx={{ fontSize: ".92em", whiteSpace: "pre-line" }}>
                  {data ? data.advice || "" : "Avoid forward bending. Hot fomentation twice daily."}
                </Box>
              </Section>
            )}
            {t.bodyJson.showFollowUp && (
              <Section label="Follow-up">
                <Box sx={{ fontSize: ".92em" }}>{data ? data.followUp || "" : fmtSampleFollowUp()}</Box>
              </Section>
            )}

            <Box sx={{ mt: "8mm", textAlign: "right" }}>
              {signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt="" style={{ maxHeight: "16mm", maxWidth: "45mm" }} />
              )}
              <Box sx={{ borderTop: "1px solid #333", width: "45mm", ml: "auto", mt: "1mm", pt: "1mm" }}>
                <Box sx={{ fontSize: ".8em", fontWeight: 600 }}>{t.headerJson.doctorNameLine}</Box>
              </Box>
            </Box>

            {t.bodyJson.disclaimer && (
              <Box sx={{ mt: "4mm", fontSize: ".68em", color: "#777", fontStyle: "italic" }}>
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
              mt: "auto",
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
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: "3.5mm" }}>
      <Box
        sx={{
          fontSize: ".72em",
          textTransform: "uppercase",
          letterSpacing: ".6px",
          color: "#666",
          mb: ".8mm",
        }}
      >
        {label}
      </Box>
      {children}
    </Box>
  );
}

const fmtSampleFollowUp = () =>
  new Date(Date.now() + 14 * 864e5).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
