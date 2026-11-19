/**
 * "How is this calculated?" text — one line per KPI, kept in step with the
 * definitions in backend/src/services/doctorAnalytics.service.js and
 * docs/doctor-dashboard-2-31-10-2026/api.md.
 */
export const DEFS = {
  totalPatients:
    "Unique patients with a confirmed or completed booking with you, all time. New = their first visit with you falls in the selected period; the chip compares with the previous period of equal length.",
  activePatients: "Unique patients with a confirmed or completed booking with you in the last 90 days.",
  newPatients: "Patients whose first confirmed or completed visit with you falls in the selected period.",
  seenInPeriod: "Unique patients with a confirmed or completed booking dated in the selected period.",
  consulted: "All-time unique patients you have completed a consultation with.",
  todayPatients:
    "Unique patients booked with you today (IST) — confirmed, completed or no-show. Remaining = still confirmed. Not affected by the period filter.",
  returning: "Patients seen in the period whose first visit with you was before the period started. % = returning ÷ patients seen in the period.",
  cancellations:
    "Bookings dated in the period that you or the patient cancelled. Expired payment holds don't count. Rate = cancelled ÷ bookings that weren't still awaiting payment.",
  todayAppointments: "Bookings for today (IST) that are confirmed, completed or no-show. Not affected by the period filter.",
  upcoming: "Confirmed or awaiting-payment bookings dated after today. Not affected by the period filter.",
  totalAppointments: "Bookings dated in the period, excluding abandoned checkouts (expired payment holds / failed orders).",
  completed:
    "Appointments in the period marked complete. Completion rate = completed ÷ appointments that are over (completed, no-show, cancelled, or confirmed with a past date).",
  noShow: "Appointments marked no-show. Rate = no-shows ÷ appointments that are over.",
  rescheduled: "Appointments in the period that were moved to a new slot at least once.",
  notMarkedComplete: "Confirmed appointments dated before today that were never marked complete or no-show.",
  queue:
    "Today only: confirmed bookings still waiting in your token queue, plus bookings awaiting payment. IHS doesn't record arrival, so this is not 'checked in'.",
  consultDuration:
    "Average time between starting and ending a consultation, over completed consultations that have both times recorded (sessions left open over 4 hours are ignored).",
  collected:
    "Successful payments received in the period (by payment date, IST). Refunded payments are excluded and shown separately. 'You receive' = collected minus the platform fee stored on each payment.",
  doctorNet: "Your share of collected payments after the platform commission stored on each payment.",
  commission: "Platform commission on the successful payments in this period.",
  refunded: "Refunds issued in the period, counted on the day they were issued.",
  failed: "Payment attempts in the period that failed (the patient wasn't charged).",
  averagePerConsult: "Collected ÷ paid payments whose appointment is completed.",
  consultationRevenue: "Collected consultation payments in the period, split by clinic and video bookings.",
  pending:
    "Cash / UPI consultations not yet marked paid — outstanding right now, not limited to the period. Overdue = the consultation date has passed.",
  methods: "Collected in the period by how the patient paid: online (gateway), cash or UPI QR at the clinic.",
  documentation:
    "Completed consultations in the period that have a finalized prescription. Clinical notes are counted separately.",
  followUp:
    "Follow-ups due in the period. Completed = the patient had a completed consultation with you after the visit that set the follow-up. Rate = completed ÷ (completed + overdue); upcoming ones aren't counted yet.",
  completionRate: "Completed ÷ appointments that are over (completed, no-show, cancelled, or confirmed with a past date).",
  patientsPerDay: "Unique patients with a completed consultation per working day (a day with at least one completed consultation).",
  consultsPerDay: "Completed consultations ÷ working days in the period.",
  adherence:
    "Consultation sessions that started within 15 minutes of their scheduled start time, out of sessions with a recorded start.",
  utilization:
    "Booked appointments (confirmed, completed or no-show) ÷ slots available in the period, based on your current weekly schedule minus days you blocked.",
  workingDays: "Days in the period with at least one completed consultation.",
  acquisition:
    "New patients in the period by the source they gave on their first booking with you. The chip compares with the previous period.",
  acquisitionOther:
    "Other answers, 'not sure / prefer not to say', and patients who were never asked (they booked before the question existed).",
  bookingAnswers: "How many bookings in the period included an answer to 'How did you hear about us?'.",
} as const;
