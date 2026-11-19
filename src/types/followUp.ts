/**
 * Doctor-defined follow-up statuses (docs/follow-up-status).
 *
 * The labels are the DOCTOR'S — they add, rename, recolour, reorder and delete
 * them. Nothing in this app may branch on a label's text: "OPD FU" is a value a
 * doctor typed, and the next doctor calls it "Review".
 */
export interface FollowUpStatus {
  id: string;
  label: string;
  /** "#RRGGBB" — the doctor's own colour code for this status. */
  colorHex: string;
  sortOrder: number;
  /** Archived statuses stay on the patients that carry them, but leave the pickers. */
  isActive: boolean;
  /** How many patients carry it. Present only on the options page's payload. */
  inUse?: number;
}

/** A patient's CURRENT follow-up for the signed-in doctor. Null when untagged. */
export interface PatientFollowUp {
  status: FollowUpStatus;
  /** "YYYY-MM-DD" — the day the patient is expected back. Null when not set yet. */
  followUpOn: string | null;
  note: string | null;
  /** The consultation it was set from. */
  bookingId: string | null;
  /** EMR follow-up plan (backend migration 051) — all optional. */
  intervalValue?: number | null;
  intervalUnit?: "day" | "week" | "month" | null;
  homeCare?: boolean;
  serviceName?: string | null;
  serviceQuantity?: number | null;
  comments?: string | null;
  updatedAt: string | null;
}

export interface FollowUpStatusInput {
  label: string;
  colorHex: string;
  sortOrder?: number;
}

export interface FollowUpStatusPatch {
  label?: string;
  colorHex?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SetFollowUpInput {
  statusId: string;
  followUpOn?: string | null;
  note?: string | null;
  bookingId?: string | null;
  /** EMR follow-up plan (backend migration 051) — all optional. */
  intervalValue?: number | null;
  intervalUnit?: "day" | "week" | "month" | null;
  homeCare?: boolean;
  serviceName?: string | null;
  serviceQuantity?: number | null;
  comments?: string | null;
}

// ── Automatic follow-up reminders (docs/follow-up-reminders-07-09-2026) ─────

export interface FollowUpReminder {
  id: string;
  bookingId: string;
  /** "YYYY-MM-DD" — the follow-up date this reminder is for. */
  followUpOn: string;
  /** ISO datetime — when the reminder will fire. */
  reminderAt: string;
  channel: "email" | "whatsapp" | "both";
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  emailStatus: "pending" | "sent" | "failed";
  whatsappStatus: "pending" | "sent" | "failed";
  sentAt: string | null;
}

export interface SetReminderInput {
  /** Days before follow-up date to trigger (1–90). System computes reminder_at. */
  reminderDaysBefore?: number | null;
  /** Explicit datetime to trigger (ISO). Overrides reminderDaysBefore if both given. */
  reminderAt?: string | null;
  /** Which channels to use. Defaults to "both" when available. */
  channel?: "email" | "whatsapp" | "both" | null;
}

export type ReminderChannel = "email" | "whatsapp" | "both";
export type ReminderTiming = "none" | "1" | "3" | "7" | "custom";
