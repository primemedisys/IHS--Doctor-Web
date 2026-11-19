"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import GlobalStyles from "@mui/material/GlobalStyles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiFileText,
  FiLock,
  FiMapPin,
  FiPaperclip,
  FiPlus,
  FiVideo,
} from "react-icons/fi";
import { ROUTES } from "@/constants/routes";
import { PrescriptionActionButton } from "@/features/prescriptions";
import { ReferDoctorDialog } from "@/features/referrals";
import { useTimelineByBooking } from "@/features/timeline";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/utils/error";
import { useAppointment, useClinicalNotes, usePatientVitals, useUpdatePatientRecordDate } from "../hooks";
import { AddPatientVitalsModal } from "./AddPatientVitalsModal";
import { CHART_CSS } from "./patient-record/chart-css";
import { ChartNotes } from "./patient-record/ChartNotes";
import { ChartReferrals } from "./patient-record/ChartReferrals";
import { Flowsheet, Glance } from "./patient-record/Vitals";
import {
  dayMonth,
  fmtDate,
  fmtLong,
  initials,
  isToday,
  relTime,
  sameDay,
  yearOf,
} from "./patient-record/chart-format";
import { BUCKETS, bucketOf, REGISTER_COLS, reportType } from "@/features/records/bucket";
import { RecordReader, useReadingList } from "@/features/records";
import type { SnapshotRecord } from "@/types/appointment";
import type { TimelineRow } from "@/types/timeline";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "YYYY-MM-DD" (or an ISO datetime) → "YYYY-MM", the register's page key. */
const monthOf = (d: string) => d.slice(0, 7);

/** "2025-10" → "October 2025". */
const monthLabel = (key: string) => `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/** "2025-10" ± n months, staying a valid key. */
function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "Wed" for a "YYYY-MM-DD". */
const weekdayOf = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });

/** A register entry — one row. Visits and record-only days share the shape so
 *  the table stays one uniform grid instead of three special cases. */
interface RegisterEntry {
  key: string;
  time: string | null;
  who: string;
  sub: string | null;
  place: string | null;
  video: boolean;
  diagnosis: string | null;
  treatment: string | null;
  rx: TimelineRow["prescription"];
  current: boolean;
}

/**
 * Correct the date a document speaks for. Deliberately still an MUI dialog:
 * dialogs are portalled outside the chart's scope, and rebuilding shared,
 * behaviour-carrying overlays in a page-local visual language buys nothing.
 */
function EditRecordDateDialog({
  record,
  bookingId,
  onClose,
}: {
  record: SnapshotRecord | null;
  bookingId: string;
  onClose: () => void;
}) {
  const update = useUpdatePatientRecordDate(bookingId);
  const [date, setDate] = useState("");
  // Re-seed when a different record opens the dialog (adjust-state-during-render).
  const [seeded, setSeeded] = useState<SnapshotRecord | null>(null);
  if (record !== seeded) {
    setSeeded(record);
    setDate((record?.recordDate ?? record?.uploadedAt ?? "").slice(0, 10));
  }
  const today = new Date().toISOString().slice(0, 10);

  const save = () => {
    if (!record?.id || !date) return;
    update.mutate(
      { recordId: record.id, recordDate: date },
      {
        onSuccess: () => {
          toast.success("Record date updated");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  return (
    <Dialog open={Boolean(record)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Correct this document&apos;s date</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set the date <strong>{record?.tag ?? "this document"}</strong> actually speaks for — the day
          the prescription was written or the test was done, not the day it was uploaded.
        </Typography>
        <TextField
          type="date"
          label="Record date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: "none", fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          onClick={save}
          variant="contained"
          disabled={!date}
          loading={update.isPending}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Save date
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The patient record — a doctor's reading view, laid out the way a clinician
 * actually reads a patient: WHO THEY ARE → WHAT'S DANGEROUS → WHAT'S CURRENT →
 * THE HISTORY.
 *
 * Two ideas hold the page together.
 *
 * First, the record is a TIME SPINE, not a list of cards. Order is clinical
 * information: a reading taken on the 15th and a report dated the 30th are two
 * different days, and a flat table under today's heading claims they happened
 * today. Every item is filed under the date it belongs to, newest first, hung
 * off one continuous rail with the current consultation pinned to it.
 *
 * Second, colour is a clinical instrument and nothing else. The page paints in
 * ink on chart paper, spending exactly one bold accent — the red allergy band
 * at the top, the hospital wristband — and reserving the severity palette for
 * findings. A section tinted for decoration would compete with a critical SpO₂
 * for the same glance.
 *
 * Every band shown here is computed by the backend and arrives on the wire, so
 * the doctor and the patient can never read different verdicts off one number.
 */
export function PatientDescriptionView({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  // Reached from the treatment timeline's "View details"? Then this is a PAST
  // consultation being read, and every prescription WRITE action is hidden.
  const searchParams = useSearchParams();
  const fromHistory = searchParams?.get("from") === "history";
  /**
   * Rendered inside the video call's side panel (`?embed=1`), where the
   * dashboard app bar does not exist. The context bar offsets itself by that
   * bar's height, so without this it pins 64px down and floats over the content
   * mid-scroll instead of sitting flush at the top.
   */
  const embedded = searchParams?.get("embed") === "1";

  const { data, isLoading, isError, refetch } = useAppointment(bookingId);
  const { data: vitals, isLoading: vitalsLoading } = usePatientVitals(bookingId);
  // Prior consultations across ALL doctors (docs/treatment-timeline §5.2).
  const history = useTimelineByBooking(bookingId);
  /**
   * Patient-wide clinical notes — the register's Diagnosis and Treatment
   * columns. Notes carry the doctor's own SOAP assessment (`diagnosis`) and
   * plan (`treatment`), which is the only place either is written in full.
   * Already fetched further down the page by <ChartNotes>, so this shares that
   * cache rather than issuing a second request.
   */
  const notes = useClinicalNotes(bookingId);

  /**
   * Every document the reader can show, newest first. Built from data already
   * in memory — opening the reader costs one request (the document clicked),
   * never one per document.
   */
  const readingList = useReadingList(data?.patient?.uploadedRecords, history.data?.rows);

  const [addVitalsOpen, setAddVitalsOpen] = useState(false);
  /**
   * The month on show, "YYYY-MM". NULL until the doctor picks one, which reads
   * as "the month of the consultation I opened" — computed below, once the
   * booking has loaded. Storing the fallback in state instead would mean
   * setting state from an effect after the fetch resolves.
   */
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [referOpen, setReferOpen] = useState(false);
  /** The document the reader is open at; null = closed. */
  const [readingKey, setReadingKey] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<SnapshotRecord | null>(null);

  /** The chart's paper, its scope, and the way back — every state renders inside it. */
  const shell = (children: React.ReactNode) => (
    <>
      <GlobalStyles styles={CHART_CSS} />
      <div className="chart">
        <div className="page">
          <button className="crumb" onClick={() => router.push(ROUTES.dashboard.appointments)}>
            <FiChevronLeft size={14} />
            Back to appointments
          </button>
          {children}
        </div>
      </div>
    </>
  );

  if (isLoading) {
    return shell(
      <div className="state">
        <div className="sic2" aria-hidden>
          <FiFileText size={20} />
        </div>
        <h4>Opening the record…</h4>
        <p>Fetching this patient&apos;s vitals, documents and consultation history.</p>
      </div>,
    );
  }

  if (isError || !data?.booking) {
    return shell(
      <div className="state">
        <div className="sic2" aria-hidden>
          <FiAlertTriangle size={20} />
        </div>
        <h4>That record didn&apos;t load</h4>
        <p>The connection may have dropped, or this appointment may no longer be yours to open.</p>
        <button className="btn primary" style={{ marginTop: 16 }} onClick={() => refetch()}>
          Try again
        </button>
      </div>,
    );
  }

  const { booking, patient: snapshot } = data;

  /**
   * The unlock rule, rendered. A doctor cannot read patient data off an unpaid
   * hold — the backend gate returns no snapshot at all, so there is nothing
   * here to leak even if this branch were wrong.
   */
  if (!snapshot) {
    return shell(
      <div className="state">
        <div className="sic2" aria-hidden>
          <FiLock size={20} />
        </div>
        <h4>Record locked</h4>
        <p>
          Patient details unlock once the booking is confirmed. Until then the appointment shows only
          what the patient chose to book.
        </p>
      </div>,
    );
  }

  const today = isToday(booking.date);
  const vitalEntries = vitals?.entries ?? [];
  const vitalFields = vitals?.fields ?? [];
  const address = [snapshot.addressLine, snapshot.city, snapshot.state].filter(Boolean).join(", ");
  const demographics = [
    snapshot.age != null ? `${snapshot.age} yrs` : null,
    snapshot.gender,
    snapshot.bloodGroup && snapshot.bloodGroup !== "unknown" ? snapshot.bloodGroup : null,
  ].filter(Boolean) as string[];

  /**
   * The record, grouped by the DATE each item belongs to — the doctor's own
   * mental model, and the spine of this page.
   *
   * Keyed by "YYYY-MM-DD". This consultation's own date is always present even
   * when nothing was recorded on it, so the visit the doctor came here for
   * never silently disappears from its own page.
   */
  /**
   * Rx number → the date of the consultation that issued it.
   *
   * A prescription PDF is an uploaded record, and an uploaded record is filed by
   * `recordDate ?? uploadedAt` — the day it was UPLOADED when nobody set a
   * record date. That put four prescriptions written across four different
   * consultations onto whichever day they happened to be uploaded. The
   * consultation that issued an Rx is the only thing that knows its real date,
   * so its date wins over the upload date.
   */
  const rxDates = new Map<string, string>();
  for (const c of history.data?.rows ?? []) {
    const no = c.prescription?.rxNumber;
    if (no) rxDates.set(no, c.date);
  }

  const dayGroups = (() => {
    const byDate = new Map<
      string,
      { vitals: typeof vitalEntries; records: SnapshotRecord[]; consults: TimelineRow[] }
    >();
    const bucket = (d: string) => {
      const key = d.slice(0, 10);
      let g = byDate.get(key);
      if (!g) {
        g = { vitals: [], records: [], consults: [] };
        byDate.set(key, g);
      }
      return g;
    };
    for (const e of vitalEntries) bucket(e.recordedOn).vitals.push(e);
    for (const r of snapshot.uploadedRecords) {
      const d = (r.tag ? rxDates.get(r.tag) : null) ?? r.recordDate ?? r.uploadedAt;
      if (d) bucket(d).records.push(r);
    }
    // Past consultations across all doctors belong in their own date's node
    // rather than in a second table repeating the visit shown above it.
    for (const c of history.data?.rows ?? []) bucket(c.date).consults.push(c);
    bucket(booking.date); // the consultation's own day, always shown
    return [...byDate.entries()]
      .map(([date, g]) => ({ date, ...g }))
      .sort((a, b) => b.date.localeCompare(a.date));
  })();

  /**
   * The doctor's SOAP assessment + plan for a date. Notes are patient-wide and
   * carry no booking id, so a day is the finest grain available — which is also
   * how a doctor reads a register ("what did we decide that day").
   */
  const notesByDate = new Map<string, { diagnosis: string | null; treatment: string | null }>();
  for (const n of notes.data ?? []) {
    const key = n.date.slice(0, 10);
    const cur = notesByDate.get(key) ?? { diagnosis: null, treatment: null };
    notesByDate.set(key, {
      diagnosis: cur.diagnosis ?? n.diagnosis ?? null,
      treatment: cur.treatment ?? n.treatment ?? null,
    });
  }

  /** Every month the record touches, newest first — the year/month pickers. */
  const monthsOnRecord = [...new Set(dayGroups.map((g) => monthOf(g.date)))].sort((a, b) =>
    b.localeCompare(a),
  );
  // Default to the month of the consultation this page was opened through: the
  // doctor came here for THAT visit, so it must be on screen without a click.
  const activeMonth = monthKey ?? monthOf(booking.date);
  const yearsOnRecord = [...new Set([...monthsOnRecord, activeMonth].map((m) => m.slice(0, 4)))].sort(
    (a, b) => b.localeCompare(a),
  );

  const monthGroups = dayGroups.filter((g) => monthOf(g.date) === activeMonth);

  /** Rows for one day. A day with vitals or documents but no consultation still
   *  gets a row — the register may never silently drop a day that has data. */
  const entriesFor = (g: (typeof dayGroups)[number]): RegisterEntry[] => {
    const isConsultDay = sameDay(g.date, booking.date);
    const note = notesByDate.get(g.date);
    const rows: RegisterEntry[] = [];

    if (isConsultDay) {
      rows.push({
        key: "current",
        time: booking.startTime,
        who: user?.name ?? "You",
        sub: null,
        place: booking.clinic?.name ?? null,
        video: booking.mode === "video",
        diagnosis: note?.diagnosis ?? null,
        treatment: note?.treatment ?? null,
        rx: null,
        current: true,
      });
    }
    for (const c of g.consults) {
      rows.push({
        key: c.bookingId,
        time: c.startTime,
        who: c.doctor.name ?? "—",
        sub: c.doctor.specialization,
        place: c.location?.name ?? null,
        video: c.mode === "video",
        // The backend's `issue` is already note-diagnosis → prescription-
        // diagnosis → complaints, so it is the right fallback and the only one
        // that can see a prescription's diagnosis from here.
        diagnosis: note?.diagnosis ?? c.issue,
        treatment: note?.treatment ?? (c.prescription ? "Prescription issued" : null),
        rx: c.prescription,
        current: false,
      });
    }
    if (rows.length === 0) {
      rows.push({
        key: "record",
        time: null,
        who: "Record entry",
        sub: null,
        place: null,
        video: false,
        diagnosis: note?.diagnosis ?? null,
        treatment: note?.treatment ?? null,
        rx: null,
        current: false,
      });
    }
    return rows;
  };

  const monthEntryCount = monthGroups.reduce((n, g) => n + entriesFor(g).length, 0);
  /** The nearest month that actually holds something — the empty state's way out. */
  const nearestMonth =
    monthsOnRecord.find((m) => m <= activeMonth) ?? monthsOnRecord[monthsOnRecord.length - 1] ?? null;

  return (
    <>
      {shell(
        <>
          {/* ── Who the patient is ───────────────────────────────────────── */}
          <div className="banner">
            <div className="top">
              <div className="pav" aria-hidden>
                {snapshot.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={snapshot.photoUrl} alt="" />
                ) : (
                  initials(snapshot.name)
                )}
              </div>
              <div className="idblock">
                <div className="pname">{snapshot.name ?? "Patient"}</div>
                <div className="identifiers">
                  {demographics.map((d, i) => (
                    <span key={d}>
                      {i > 0 && <span className="sep">· </span>}
                      {d}
                    </span>
                  ))}
                  {booking.patient.id && <span className="mrn">PID {booking.patient.id}</span>}
                  {snapshot.city && <span>{[snapshot.city, snapshot.state].filter(Boolean).join(", ")}</span>}
                </div>
              </div>
              <div className="rx">
                <PrescriptionActionButton
                  bookingId={booking.id}
                  bookingStatus={booking.status}
                  patientId={booking.patient.id}
                  readOnly={fromHistory}
                />
              </div>
            </div>

            <div className="rule" />

            <div className="cols">
              <div className="bcol">
                <div className="k">Contact</div>
                <div className="v">
                  <div className="factline">
                    <span className="fk">DOB</span>
                    <span className="fv">{fmtDate(snapshot.dateOfBirth)}</span>
                  </div>
                  <div className="factline">
                    <span className="fk">Phone</span>
                    <span className="fv mono">{snapshot.phone ?? "—"}</span>
                  </div>
                  <div className="factline">
                    <span className="fk">Address</span>
                    <span className="fv">{address || "—"}</span>
                  </div>
                </div>
              </div>
              <div className="bcol">
                <div className="k">Chronic conditions</div>
                <div className={`v${snapshot.conditions.length ? "" : " q"}`}>
                  {snapshot.conditions.length
                    ? snapshot.conditions
                        .map((c) => (c.diagnosedYear ? `${c.name} (${c.diagnosedYear})` : c.name))
                        .join(", ")
                    : "None recorded"}
                </div>
              </div>
              <div className="bcol">
                <div className="k">Current medications</div>
                <div className={`v${snapshot.currentMedications.length ? "" : " q"}`}>
                  {snapshot.currentMedications.length
                    ? snapshot.currentMedications
                        .map((m) => [m.medicineName, m.dosage, m.frequency].filter(Boolean).join(" "))
                        .join(", ")
                    : "None recorded"}
                </div>
              </div>
            </div>
          </div>

          {/* ── The wristband ────────────────────────────────────────────────
              The page's one bold accent. An allergy is the only fact here that
              can make a correct prescription harm somebody, so it is read
              before any clinical data — but it now sits UNDER the patient card
              rather than above it: a band declaring "no known allergies" over
              an unnamed page states it about nobody. Name first, then the
              warning that attaches to that name.

              When there is nothing to declare it turns green and says so —
              silence would be indistinguishable from "not asked". */}
          <div className={`allergyband${snapshot.allergies.length ? "" : " clear"}`}>
            <div className="ab-ic" aria-hidden>
              {snapshot.allergies.length ? <FiAlertTriangle size={16} /> : <FiCheckCircle size={16} />}
            </div>
            <div>
              <div className="ab-lab">{snapshot.allergies.length ? "Allergy alert" : "No known allergies"}</div>
              <div className="ab-list">
                {snapshot.allergies.length ? (
                  snapshot.allergies.map((a, i) => (
                    <span key={a.name}>
                      {i > 0 && " · "}
                      <b>{a.name}</b>
                      {a.severity ? ` (${a.severity})` : ""}
                    </span>
                  ))
                ) : (
                  <>Nothing recorded against this patient.</>
                )}
              </div>
            </div>
          </div>

          {/* ── What's current ──────────────────────────────────────────── */}
          <Glance fields={vitalFields} entries={vitalEntries} />

          {/* ── The consultation this record was opened through ───────────
              Sticky, so it stays answerable on a long scroll: everything below
              is "as of" this consultation. The past-consultation warning lives
              here rather than beside the prescription button — it is a fact
              about the whole page, not about one control. */}
          <div className="context" style={{ top: embedded ? 0 : 56 }}>
            <span className="cdate">{fmtLong(booking.date)}</span>
            <span className={`chip ${today ? "today" : "past"}`}>
              {today ? "Today" : "Past consultation"}
            </span>
            <span className="chip stat">{booking.status.replace(/_/g, " ")}</span>

            <div className="tools">
              {/* The day-jump picker is gone: the register below is browsed a
                  month at a time, so a single date is now a scroll, not a
                  filter. */}
              <button className="btn" onClick={() => setAddVitalsOpen(true)}>
                <FiPlus size={14} />
                Add vitals
              </button>
            </div>
          </div>

          {/* ── The register: one month, days as bands, one row per entry ──
              A table rather than a stack of cards, because the question a
              doctor asks of a record is usually columnar — every diagnosis this
              month, every treatment — and a column can be read down in one
              pass. Vitals and documents don't fit a column, so they stay behind
              each day's band, one click away. */}
          <div className="monthbar">
            {/* What the register is showing, stated first; the controls that
                change it sit together at the other end of the bar. */}
            <span className="mcount">
              <b>{monthEntryCount}</b> {monthEntryCount === 1 ? "entry" : "entries"} ·{" "}
              <b>{monthGroups.length}</b> {monthGroups.length === 1 ? "day" : "days"}
            </span>

            <div className="mnav">
            <button
              className="ib"
              aria-label={`Show ${monthLabel(shiftMonth(activeMonth, -1))}`}
              onClick={() => {
                setMonthKey(shiftMonth(activeMonth, -1));
              }}
            >
              <FiChevronLeft size={15} />
            </button>

            <select
              className="msel"
              aria-label="Month"
              value={activeMonth.slice(5, 7)}
              onChange={(e) => {
                setMonthKey(`${activeMonth.slice(0, 4)}-${e.target.value}`);
              }}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={String(i + 1).padStart(2, "0")}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="msel"
              aria-label="Year"
              value={activeMonth.slice(0, 4)}
              onChange={(e) => {
                setMonthKey(`${e.target.value}-${activeMonth.slice(5, 7)}`);
              }}
            >
              {yearsOnRecord.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              className="ib"
              aria-label={`Show ${monthLabel(shiftMonth(activeMonth, 1))}`}
              onClick={() => {
                setMonthKey(shiftMonth(activeMonth, 1));
              }}
            >
              <FiChevronRight size={15} />
            </button>

            {activeMonth !== monthOf(booking.date) && (
              <button
                className="btn"
                onClick={() => {
                  setMonthKey(monthOf(booking.date));
                }}
              >
                <FiCalendar size={13} />
                This visit
              </button>
            )}
            </div>
          </div>

          <div className="reg">
            {vitalsLoading ? (
              <div className="emptyline" style={{ padding: "18px" }}>
                Loading the record…
              </div>
            ) : monthGroups.length === 0 ? (
              <div className="state" style={{ border: 0, boxShadow: "none" }}>
                <div className="sic2" aria-hidden>
                  <FiCalendar size={20} />
                </div>
                <h4>Nothing recorded in {monthLabel(activeMonth)}</h4>
                <p>
                  {nearestMonth
                    ? "This patient has entries in other months."
                    : "This patient has no vitals, documents or consultations on record yet."}
                </p>
                {nearestMonth && nearestMonth !== activeMonth && (
                  <button
                    className="btn primary"
                    style={{ marginTop: 16 }}
                    onClick={() => setMonthKey(nearestMonth)}
                  >
                    Go to {monthLabel(nearestMonth)}
                  </button>
                )}
              </div>
            ) : (
              <div className="regscroll">
                <table className="regtable">
                  <thead>
                    <tr>
                      <th className="num">#</th>
                      <th>Time</th>
                      <th>Doctor</th>
                      <th>Place</th>
                      <th>Diagnosis</th>
                      <th>Treatment</th>
                      {/* One column per kind of document, not one "Record"
                          column holding a mixed stack. */}
                      {BUCKETS.map((b) => (
                        <th key={b.key}>
                          <span className={`kd k-${b.key}`} aria-hidden />
                          {b.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {monthGroups.map((g) => {
                    const entries = entriesFor(g);
                    // Every Rx number the day's consultations claim — a document
                    // tagged with one of these belongs to that row, not to the
                    // day (see the per-row split below).
                    const entryRxNumbers = new Set(
                      entries.map((e) => e.rx?.rxNumber).filter(Boolean) as string[],
                    );
                    const isConsultDay = sameDay(g.date, booking.date);
                    // The band no longer summarises "1 reading · 4 documents":
                    // both are now on screen — the documents as capsules on the
                    // rows that own them, the readings in the panel below — so
                    // the summary only invited a recount that never matched.

                    return (
                      <tbody key={g.date}>
                        <tr className="dayrow">
                          <th colSpan={REGISTER_COLS}>
                            {/* A label, no longer a control. Both things it used
                                to reveal are on the page by default now: the
                                documents as capsules in the Record column, the
                                vitals in the row below. */}
                            <div className="dayhead">
                              <FiCalendar size={13} />
                              <span className="dw">{weekdayOf(g.date)}</span>
                              <span className="dd">{dayMonth(g.date)}</span>
                              <span className="dw">{yearOf(g.date)}</span>
                              <span className="dn">
                                {entries.length} {entries.length === 1 ? "entry" : "entries"}
                                {relTime(g.date) ? ` · ${relTime(g.date)}` : ""}
                              </span>
                              {isConsultDay && <span className="dtag">This visit</span>}
                            </div>
                          </th>
                        </tr>

                        {entries.map((e, i) => {
                          /*
                            Which documents belong to THIS row.

                            An uploaded record carries a date, not a booking, so
                            there is only one honest link back to a consultation:
                            a prescription PDF is tagged with its Rx number, and
                            the entry knows its own. Match on that, and four
                            consultations with four prescriptions show one each
                            instead of stacking all four on the day's first row.

                            Whatever doesn't match any entry — a lab report, a
                            scan — is genuinely day-level and rides on the first
                            row, as before.
                          */
                          const rxNo = e.rx?.rxNumber ?? null;
                          const ownDocs = rxNo ? g.records.filter((r) => r.tag === rxNo) : [];
                          const dayDocs = i === 0 ? g.records.filter((r) => !r.tag || !entryRxNumbers.has(r.tag)) : [];
                          const docs = [...ownDocs, ...dayDocs];
                          return (
                          <tr key={e.key} className={e.current ? "cur" : undefined}>
                            <td className="num">{String(i + 1).padStart(2, "0")}</td>
                            <td>
                              <div className="tm">
                                {e.time ?? "—"}
                                {e.current && <span className="rel">this visit</span>}
                              </div>
                            </td>
                            <td>
                              <div className="who">
                                <span className="acc" aria-hidden />
                                <span>
                                  <div className="nm">{e.who}</div>
                                  {e.sub && <div className="sub">{e.sub}</div>}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="mk">
                                {e.video ? <FiVideo size={11} /> : <FiMapPin size={11} />}
                                {e.video ? "Video" : (e.place ?? "In person")}
                              </span>
                            </td>
                            <td>
                              {e.diagnosis ? (
                                <span className="dx">{e.diagnosis}</span>
                              ) : (
                                <span className="dash">—</span>
                              )}
                            </td>
                            <td>
                              {e.treatment ? (
                                <div className="tx">{e.treatment}</div>
                              ) : (
                                <span className="dash">—</span>
                              )}
                            </td>
                            {/*
                              One column per kind of paper, one capsule per
                              document inside it. A doctor hunting the MRI reads
                              down the MRI column instead of scanning a mixed
                              stack, and an empty cell is itself an answer —
                              "no scan on file for that visit".
                            */}
                            {BUCKETS.map((b) => {
                              const inBucket = docs.filter((r) => bucketOf(r) === b.key);
                              /* The consultation's own Rx, shown only in the
                                 Prescription column and only when no uploaded
                                 copy is already listed there — one row must not
                                 show the same Rx number twice. */
                              const showRx = b.key === "prescription" && ownDocs.length === 0 && e.rx;
                              return (
                                <td key={b.key}>
                                  <div className="marks col">
                                    {showRx &&
                                      (e.rx?.canView && e.rx.id ? (
                                        <button className="mk rx" onClick={() => setReadingKey(e.rx?.id ? `rx:${e.rx.id}` : null)}>
                                          <FiFileText size={11} />
                                          <span className="doclab mono">{e.rx.rxNumber ?? "Prescription"}</span>
                                        </button>
                                      ) : (
                                        <span className="mk rx">
                                          <FiFileText size={11} />
                                          <span className="doclab mono">{e.rx?.rxNumber ?? "On file"}</span>
                                        </span>
                                      ))}
                                    {inBucket.map((r) => {
                                      const label = r.tag ?? reportType(r.fileType);
                                      const isRx = b.key === "prescription";
                                      return (
                                        <span className="doccap" key={r.id}>
                                          {/* `k-<kind>` carries the colour; the
                                              column it sits in carries the word.
                                              Colour is never the only signal. */}
                                          <button
                                            className={`mk doc k-${b.key}`}
                                            title={`Open ${label}`}
                                            onClick={() => setReadingKey(`rec:${r.id ?? r.fileUrl}`)}
                                          >
                                            {isRx ? <FiFileText size={11} /> : <FiPaperclip size={11} />}
                                            <span className={`doclab${isRx ? " mono" : ""}`}>{label}</span>
                                          </button>
                                          {/* Correcting the DATE a document speaks
                                              for is rare, so it stays out of the
                                              way until the capsule is hovered or
                                              tabbed to — but it must stay
                                              reachable: a report filed under the
                                              wrong day is worse than one not
                                              filed at all. */}
                                          <button
                                            className="mk pen"
                                            aria-label={`Correct the date of ${label}`}
                                            title="Correct the date"
                                            onClick={() => setEditingRecord(r)}
                                          >
                                            <FiEdit2 size={10} />
                                          </button>
                                        </span>
                                      );
                                    })}
                                    {!showRx && inBucket.length === 0 && <span className="dash">—</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                          );
                        })}

                        {/*
                          Vitals are ALWAYS open. A blood pressure is read, not
                          retrieved — hiding a day's readings behind a chevron
                          made the one thing a doctor scans the register for the
                          one thing they had to ask for. Days without readings
                          render nothing, so the table stays as short as the
                          record actually is.
                        */}
                        {g.vitals.length > 0 && (
                          <tr className="detailrow">
                            <td colSpan={REGISTER_COLS}>
                              {/* A card, not more rows. A flowsheet has its own
                                  columns, and dropping it straight into a cell
                                  that spans the register's seven made two grids
                                  fight for the same width — which is what made
                                  the day unreadable. Boxed and inset, it reads
                                  as a sheet clipped to this day. */}
                              <div className="vpanel">
                                <h4 className="dh">
                                  <FiActivity size={12} />
                                  Vitals recorded on {fmtDate(g.date)}
                                  <span className="vn">
                                    {g.vitals.length} {g.vitals.length === 1 ? "reading" : "readings"}
                                  </span>
                                </h4>
                                <Flowsheet fields={vitalFields} entries={g.vitals} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            )}
          </div>

          <ChartNotes bookingId={booking.id} />
          <ChartReferrals bookingId={booking.id} onRefer={() => setReferOpen(true)} />
        </>,
      )}

      {/* One reader for every document, opened at the one that was clicked.
          It replaces the two single-document dialogs this page used to mount:
          from any capsule the doctor can now keep scrolling into the previous
          prescriptions, reports and scans without coming back to the table. */}
      <RecordReader
        open={readingKey !== null}
        items={readingList}
        startKey={readingKey}
        patientName={snapshot.name}
        onClose={() => setReadingKey(null)}
        onEditDate={setEditingRecord}
      />
      <EditRecordDateDialog
        record={editingRecord}
        bookingId={bookingId}
        onClose={() => setEditingRecord(null)}
      />
      <AddPatientVitalsModal open={addVitalsOpen} bookingId={bookingId} onClose={() => setAddVitalsOpen(false)} />
      <ReferDoctorDialog
        open={referOpen}
        onClose={() => setReferOpen(false)}
        bookingId={booking.id}
        sourceClinicId={booking.clinic?.id ?? null}
        patientName={snapshot.name}
      />
    </>
  );
}
