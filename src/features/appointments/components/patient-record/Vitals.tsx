"use client";

import type { VitalsEntry, VitalsField, VitalStatusInfo } from "@/types/appointment";
import { fmtDate, relTime } from "./chart-format";

/**
 * The vitals half of the chart: one severity-aware cell, the per-date
 * flowsheet, and the "at a glance" tile row.
 *
 * NO clinical number appears in this file. Every band arrives on the wire as
 * `entry.statuses[key]` (backend `config/vitalsRanges.js`, shared with the
 * patient app), so a doctor and a patient can never see different verdicts on
 * the same reading. This file only decides what a band LOOKS like.
 */

/** Severity → the arrow that has to survive without colour (WCAG 1.4.1). */
const ARROW: Record<string, string> = { low: "↓", high: "↑" };

/** "60–100 bpm" / "< 130/85" — the quiet line under a flowsheet column head. */
function rangeText(field: VitalsField): string {
  const n = field.normal;
  if (!n) return field.unit || "—";
  if (n.display) return n.display;
  if (n.min == null || n.max == null) return field.unit || "—";
  return `${n.min}–${n.max}`;
}

/** The tooltip on a flagged reading: what the band is called, and the range. */
function tipText(info: VitalStatusInfo, unit: string): string {
  const n = info.normal;
  const range = n?.display
    ? `normal is ${n.display}`
    : n && n.min != null && n.max != null
      ? `normal is ${n.min}–${n.max}${unit ? ` ${unit}` : ""}`
      : null;
  return [info.label, range].filter(Boolean).join(" — ") || "Outside the usual range";
}

/**
 * One reading. `unknown` renders exactly like `normal` on purpose — it means
 * NOT EVALUATED (no date of birth, under 18, no range for the field), and must
 * never read as a verdict of "fine".
 */
export function Cell({
  value,
  status,
  unit = "",
}: {
  value: number | string | null;
  status?: VitalStatusInfo;
  unit?: string;
}) {
  if (value == null || value === "") return <span className="dash">—</span>;
  const info = status ?? { status: "unknown" as const };
  const flagged = info.status !== "normal" && info.status !== "unknown";
  const arrow = ARROW[info.status];

  return (
    <span
      className={`cell sv-${info.status}`}
      tabIndex={flagged ? 0 : undefined}
      aria-label={flagged ? `${value} ${unit} — ${tipText(info, unit)}` : undefined}
    >
      {info.status === "critical" && (
        <span className="wn" aria-hidden>
          ⚠
        </span>
      )}
      {arrow && (
        <span className="arr" aria-hidden>
          {arrow}
        </span>
      )}
      {value}
      {flagged && <span className="tip">{tipText(info, unit)}</span>}
    </span>
  );
}

/** "Apollo Clinic · self" — where a reading came from, in one short line. */
function sourceLine(e: VitalsEntry): string {
  const place = e.location ? e.location.split(",")[0] : "";
  const tail = e.source === "patient" ? " · self" : e.source === "doctor" ? " · clinic" : "";
  return (place || e.source) + tail;
}

/**
 * The date block's flowsheet: readings down, fields across — the shape a
 * paper chart uses, so two readings on one day compare by eye.
 *
 * Below 720px the table becomes cards. A vitals table that scrolls sideways
 * hides the very column a doctor is looking for.
 */
export function Flowsheet({ fields, entries }: { fields: VitalsField[]; entries: VitalsEntry[] }) {
  const recorders = [...new Set(entries.map((e) => e.recordedBy?.name).filter(Boolean))];

  return (
    <div className="flow">
      <table className="fs">
        <thead>
          <tr>
            <th className="lead">
              <span className="lb">Recorded</span>
            </th>
            {fields.map((f) => (
              <th key={f.key}>
                <div className="lb">{f.label}</div>
                <div className="rg">{rangeText(f)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="lead">
                <div className="when">{fmtDate(e.recordedOn)}</div>
                <div className="src" title={e.location ?? ""}>
                  {sourceLine(e)}
                </div>
              </td>
              {fields.map((f) => (
                <td key={f.key}>
                  <Cell value={e.values[f.key]} status={e.statuses?.[f.key]} unit={f.unit} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="fscards">
        {entries.map((e) => (
          <div className="fscard" key={e.id}>
            <div className="fh">
              <span className="when">{fmtDate(e.recordedOn)}</span>
              <span className="src">{sourceLine(e)}</span>
            </div>
            <div className="fg">
              {fields.map((f) => (
                <div className="fi" key={f.key}>
                  <div className="k">{f.label}</div>
                  <div className="val">
                    <Cell value={e.values[f.key]} status={e.statuses?.[f.key]} unit={f.unit} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {recorders.length > 0 && <div className="recby">Recorded by {recorders.join(", ")}</div>}
    </div>
  );
}

/**
 * The tiles, in the order a clinician reads them — not the storage order.
 *
 * EVERY field the matrix carries appears here. Height was previously left out,
 * so a doctor comparing the tiles against the flowsheet below found one reading
 * missing with nothing to say it had been dropped deliberately.
 */
const GLANCE_KEYS = [
  "bloodPressure",
  "pulseRateBpm",
  "temperatureF",
  "spo2Percent",
  "bmi",
  "weightKg",
  "heightCm",
];

/**
 * The latest reading, with how far each number has moved since the one before
 * it. This is the only place on the page that answers "how is this patient
 * RIGHT NOW" without scrolling — the flowsheets below are the history.
 *
 * `entries` must be newest-first (the API's order).
 */
export function Glance({ fields, entries }: { fields: VitalsField[]; entries: VitalsEntry[] }) {
  if (!entries.length) return null;
  const latest = entries[0];
  const byKey = new Map(fields.map((f) => [f.key, f]));

  /** The previous non-empty reading of this field, whenever it was taken. */
  const previous = (key: string): number | string | null => {
    for (let i = 1; i < entries.length; i++) {
      const v = entries[i].values[key];
      if (v != null && v !== "") return v;
    }
    return null;
  };

  /** Systolic only for BP — one number can move while the other doesn't. */
  const numberOf = (key: string, v: number | string) =>
    key === "bloodPressure" ? parseInt(String(v), 10) : Number(v);

  const trend = (key: string, value: number | string) => {
    const prev = previous(key);
    if (prev == null) return null;
    const now = numberOf(key, value);
    const then = numberOf(key, prev);
    if (!Number.isFinite(now) || !Number.isFinite(then)) return null;
    const delta = Math.round((now - then) * 10) / 10;
    if (delta === 0) return { arrow: "", text: "steady" };
    return {
      arrow: delta > 0 ? "▲" : "▼",
      text: `${Math.abs(delta)}${key === "bloodPressure" ? " sys" : ""}`,
    };
  };

  const where = latest.source === "patient" ? "self-reported" : (latest.location?.split(",")[0] ?? "clinic");

  return (
    <section className="glance" aria-label="Latest vitals">
      <div className="gh">
        <h3>Latest Vitals</h3>
        <span className="when">
          {relTime(latest.recordedOn)} · {where}
        </span>
      </div>
      <div className="tiles">
        {GLANCE_KEYS.filter((k) => byKey.has(k)).map((key) => {
          const field = byKey.get(key)!;
          const value = latest.values[key];
          const info = latest.statuses?.[key] ?? { status: "unknown" as const };
          const flagged = info.status !== "normal" && info.status !== "unknown";
          const arrow = ARROW[info.status];
          const t = value != null && value !== "" ? trend(key, value) : null;

          return (
            <div className={`tile sv-${info.status}${flagged ? " flag" : ""}`} key={key}>
              <div className="tk">{field.label}</div>
              <div className="tv">
                {value == null || value === "" ? (
                  <span className="dash">—</span>
                ) : (
                  <>
                    {info.status === "critical" && (
                      <span className="wn" aria-hidden>
                        ⚠
                      </span>
                    )}
                    {arrow && (
                      <span className="arr" aria-hidden>
                        {arrow}
                      </span>
                    )}
                    {value}
                    {field.unit && <span className="u">{field.unit}</span>}
                  </>
                )}
              </div>
              <div className="trange">{rangeText(field)}</div>
              {t && (
                <div className="trend">
                  {t.arrow && <span aria-hidden>{t.arrow}</span>}
                  <span className="d">{t.text}</span>
                  <span>vs prev</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
