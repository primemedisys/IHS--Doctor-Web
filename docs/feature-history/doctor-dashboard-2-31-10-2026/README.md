# Doctor Dashboard 2.0 — Phase 1 (31-10-2026)

The doctor website Overview becomes an analytics dashboard: five KPI sections, quick
shortcuts, patient-acquisition insights and trend charts, with an "Explore more" page per
section. Patients can now say how they discovered a doctor when they book.

Stack unchanged: Next.js + MUI (doctor site), Express + Sequelize + MySQL. No new services,
no new environment variables, one additive migration (056).

| File | Contents |
|---|---|
| [README.md](README.md) | Architecture, data sources, every KPI definition, what isn't tracked, testing |
| api.md (`backend/docs/feature-history/doctor-dashboard-2-31-10-2026/api.md`) | Endpoints and response shapes |

## 1. Architecture

* **Backend** — `services/doctorAnalytics.service.js` (all aggregates), `routes/doctorAnalytics.routes.js`
  (`GET /doctor/analytics/{overview,trends,patients,appointments,financial,quality,productivity,acquisition}`),
  `services/acquisition.service.js` (catalogue + capture), `routes/patientAcquisition.routes.js`,
  migration `056_patient_acquisition_sources.sql` + boot guard `db/ensureAcquisitionSources.js`.
  Swagger: `config/swagger.doctorAnalytics.js`.
* **Security** — `authenticate` + `authorize(doctor)` + `resolveDoctorId("self")`: `doctorId` is
  pinned to the signed-in doctor; Joi strips any `doctorId` a client appends. Every query has
  `doctor_id = :doctorId` in its WHERE. Patient rows show name + IHS registration number only —
  no medical content. Platform-wide revenue is never served to a doctor; the doctor sees their
  own gross collections, the platform fee deducted from them, and their net.
* **Performance** — every KPI is a SQL aggregate (`COUNT`/`SUM`/`GROUP BY`); series are one
  `GROUP BY bucket` and zero-filled in JS; tables are paginated in SQL. On the dev DB the full
  overview runs in ~50–350 ms. Existing indexes (`bookings.doctor_id`, `payments.booking_id`,
  slot dates) cover the filters; the new tables are indexed on `(doctor_id, source_group)` /
  `(doctor_id, created_at)`.

## 2. Conventions used by every metric

* **Dates are IST calendar days** (the project convention). Appointments use `slot_date`;
  money uses `paid_at` / `refunded_at` converted to IST.
* **Period** = `from`–`to` (default: 1st of this month → today). **Previous period** = the
  equally long span immediately before; growth % = (current − previous) ÷ previous, shown only
  when previous > 0.
* **Treated booking** = status `confirmed` or `completed` (same rule as the existing overview
  and EMR workbench).
* **Abandoned checkout** = cancelled with reason `hold_expired` / `order_failed` (the patient
  never finished paying). Excluded from appointments and cancellations everywhere.
* **First visit** = a patient's earliest treated booking with this doctor.
* Booking statuses that exist: `pending_payment`, `confirmed`, `completed`, `cancelled`,
  `no_show`. There is **no "rejected" status** and **no check-in step**.

## 3. KPI definitions

### Patient Overview
| KPI | Definition |
|---|---|
| Total patients | Distinct patients with ≥ 1 treated booking with the doctor, all time |
| New patients | Distinct patients whose first visit falls in the period |
| Returning patients | Distinct patients with a treated booking in the period whose first visit was before it; % = of patients seen in the period |
| Active patients | Distinct patients with a treated booking in the last 90 days |
| Today's patients | Distinct patients with a confirmed / completed / no-show booking today; completed vs remaining (confirmed) |
| Cancellations | Bookings in the period cancelled by a person; rate = cancelled ÷ period bookings that are not awaiting payment (abandoned checkouts excluded from both) |

### Appointment Performance
| KPI | Definition |
|---|---|
| Today's appointments | Confirmed + completed + no-show bookings dated today, split clinic / video |
| Upcoming | Confirmed or awaiting-payment bookings dated after today; next = earliest confirmed |
| Completed | Completed bookings in the period, clinic / video split |
| Completion rate | Completed ÷ appointments that are over (completed + no-show + cancelled + confirmed bookings whose date has passed) |
| No-show rate | No-shows ÷ the same denominator (no-show *is* tracked) |
| Pending / in queue | Today's bookings in the token queue (`queue_state = waiting`, not yet called) + bookings awaiting payment. **Not** a count of patients physically present — arrival isn't recorded |
| Rescheduled | Bookings in the period with `rescheduled_at` set |
| Average consultation time | Mean of `consult_ended_at − consult_started_at` over completed consultations that have both (and ≤ 4 h); shows how many were measured |

### Financial Overview (doctor's own money only)
| KPI | Definition |
|---|---|
| Collected | Sum of `payments.amount` with status `success`, `paid_at` in the period. A refunded payment's status is `refunded`, so it is never in Collected |
| Doctor net / platform fee | `doctor_payout_amount` / `commission_amount` of those payments, read from the stored split (never recomputed) |
| Consultation revenue | Collected split by booking type (clinic / video) |
| Payment methods | Collected split: online (gateway), cash, UPI (doctor's own QR) |
| Refunded | Sum of `refund_amount` for payments refunded in the period (by `refunded_at`) |
| Pending payments | Cash / UPI owed at the clinic now (`pending_at_clinic` on confirmed / completed bookings); overdue = the consultation date has passed |
| Failed transactions | Payments with status `failed` created in the period |
| Average per completed consultation | Collected ÷ successful payments whose booking is completed |
| Today / last 7 days / year to date | Collected over those windows |

Billed amount per transaction = the booking's fee. There is one payment row per booking, so
nothing is double-counted.

### Quality & Clinical Performance
| KPI | Definition |
|---|---|
| Clinical documentation | Completed consultations in the period with a finalized prescription (any version) ÷ completed consultations; also counts those with a clinical note |
| Follow-up compliance | Follow-ups whose follow-up date is in the period. Completed = the patient had a later completed consultation with the doctor after the consultation that set the follow-up; overdue = not completed and the date has passed; pending = not completed, date still ahead. Rate = completed ÷ (completed + overdue) |
| Completion rate | As above |

### Doctor Productivity
| KPI | Definition |
|---|---|
| Consultations per day | Completed consultations ÷ days with at least one completed consultation |
| Patients per day | Distinct patient-days ÷ the same working days |
| OPD / video | Completed clinic / video consultations |
| Schedule adherence | Consultation sessions in the period whose recorded start was within 15 min of the scheduled start ÷ sessions with a recorded start; plus average start delay |
| Utilization | Booked (confirmed + completed + no-show) ÷ capacity, where capacity = slots in the doctor's **current** weekly schedule over the period (max bookings per window if set, else window ÷ slot length), minus blocked dates |

### Patient Acquisition
| KPI | Definition |
|---|---|
| Patients per channel | New patients in the period (first visit inside it) grouped by their **original** discovery source for this doctor — one patient counts once, repeat bookings never add to it |
| Not asked | New patients with no original answer (booked before this feature, or skipped the question) |
| Change | vs the same count in the previous period |

## 4. Not tracked — shown as "Not tracked yet", never as 0

| Metric | Why |
|---|---|
| Patient satisfaction / ratings / feedback | IHS has no patient review or feedback system. The doctor's own portfolio testimonials are shown only as "N testimonials on your profile (added by you)" |
| Patient waiting time | No arrival / check-in time is recorded (queue state `waiting` is set at booking) |
| Procedure, surgery, contract revenue | Only consultation payments exist |
| Rejected appointments | No such status |
| Follow-up complaints | Not recorded |
| Utilization for past periods | Uses the current weekly schedule (historical schedules are not versioned) — labelled as such |

## 5. Patient acquisition ("How did you hear about Dr. X?")

* **Catalogue** — `ACQUISITION_GROUPS` / `ACQUISITION_SOURCES` in `config/constants.js`,
  served by `GET /patient/acquisition/sources`. Add an option there and both apps show it; never
  rename or reuse a stored value. Groups: Google (Search, Maps, Ad, Other), Social media / Meta
  (Instagram, Facebook, Meta ad, WhatsApp, YouTube, Other), Referral (Friend, Family, Existing
  patient, Doctor, Hospital, Clinic, Other), IHS (Website, Mobile app), Other, Not sure /
  Prefer not to say.
* **Capture** — optional question before final confirmation on the patient website
  (`BookingFlow` → clinic and video) and the patient app (`book/[slug]`). Sent as `acquisition`
  on `POST /patient/bookings` and saved in the booking's transaction. Skipped when the patient
  already answered for this doctor (`GET /patient/acquisition/doctors/:id`).
* **Two levels** — `patient_acquisition_sources` (original source, one per patient + doctor,
  first answer wins, never overwritten) and `booking_acquisition_sources` (the answer on each
  booking).
* **Integrity** — only catalogue values; free text only where offered (≤ 120 chars), referral
  details only for referral answers (≤ 160 chars); UTM parameters are stored separately and never
  replace the answer; nothing is inferred from device, browser or IP. Clinic-portal bookings
  accept the same field and are stamped `captured_via = clinic`.

## 6. Testing (31-10-2026)

| Suite | Command | Result |
|---|---|---|
| Dashboard + acquisition E2E (real HTTP, real clinic + video bookings, controlled practice with hand-computed expected values) | start `PORT=5055 REMINDER_SCHEDULER_ENABLED=false RATE_LIMIT_MAX=100000 AUTH_RATE_LIMIT_MAX=100000 node src/server.js`, then `DASHBOARD_E2E_BASE_URL=http://localhost:5055 node --test test/doctorDashboard/doctorDashboard.test.js` | 18 / 18 pass |
| Migration | `npm run migrate` | 056 applied; re-run is a no-op |

Covered: catalogue; Google Search / Google Maps / Instagram / Facebook / Friend / Doctor /
IHS website / IHS app / Other / Not sure answers; repeat bookings keep the original source;
missing answer; per-doctor attribution; invalid values; every KPI section's numbers (unique
patients, new vs returning, cancellations excluding abandoned holds, completion and no-show,
collected vs refunded vs pending, method split, documentation, follow-up compliance,
productivity, adherence, acquisition); trends zero-filled; explore tables and filters; range
validation; one doctor can't see another's analytics (even with `?doctorId=`); patients and
anonymous callers refused.
