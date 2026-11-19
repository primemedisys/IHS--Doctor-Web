import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  FollowUpReminder,
  FollowUpStatus,
  FollowUpStatusInput,
  FollowUpStatusPatch,
  PatientFollowUp,
  SetFollowUpInput,
  SetReminderInput,
} from "@/types/followUp";

/**
 * The doctor's follow-up API (docs/follow-up-status). Thin wrappers over the
 * `{ data }` envelope, like every other service.
 */
export const followUpService = {
  /** The doctor's own list, in their order. Seeds four starters on first call. */
  listStatuses(): Promise<FollowUpStatus[]> {
    return requestData<FollowUpStatus[]>(
      api.get<ApiResponse<FollowUpStatus[]>>(API_ENDPOINTS.doctor.followUpStatuses),
    );
  },

  createStatus(input: FollowUpStatusInput): Promise<FollowUpStatus> {
    return requestData<FollowUpStatus>(
      api.post<ApiResponse<FollowUpStatus>>(API_ENDPOINTS.doctor.followUpStatuses, input),
    );
  },

  /** Rename / recolour / reorder / archive — every field optional. */
  updateStatus(id: string, patch: FollowUpStatusPatch): Promise<FollowUpStatus> {
    return requestData<FollowUpStatus>(
      api.patch<ApiResponse<FollowUpStatus>>(API_ENDPOINTS.doctor.followUpStatus(id), patch),
    );
  },

  /** 409s while patients still carry it — the caller offers archiving instead. */
  deleteStatus(id: string): Promise<{ id: string }> {
    return requestData<{ id: string }>(
      api.delete<ApiResponse<{ id: string }>>(API_ENDPOINTS.doctor.followUpStatus(id)),
    );
  },

  reorderStatuses(ids: string[]): Promise<FollowUpStatus[]> {
    return requestData<FollowUpStatus[]>(
      api.put<ApiResponse<FollowUpStatus[]>>(API_ENDPOINTS.doctor.followUpStatusReorder, { ids }),
    );
  },

  /** This CONSULTATION'S follow-up — not the patient's, so visits stay independent. */
  getBookingFollowUp(bookingId: string): Promise<PatientFollowUp | null> {
    return requestData<PatientFollowUp | null>(
      api.get<ApiResponse<PatientFollowUp | null>>(API_ENDPOINTS.doctor.bookingFollowUp(bookingId)),
    );
  },

  setBookingFollowUp(bookingId: string, input: SetFollowUpInput): Promise<PatientFollowUp> {
    return requestData<PatientFollowUp>(
      api.put<ApiResponse<PatientFollowUp>>(API_ENDPOINTS.doctor.bookingFollowUp(bookingId), input),
    );
  },

  clearBookingFollowUp(bookingId: string): Promise<{ bookingId: string }> {
    return requestData<{ bookingId: string }>(
      api.delete<ApiResponse<{ bookingId: string }>>(API_ENDPOINTS.doctor.bookingFollowUp(bookingId)),
    );
  },

  // ── Automatic follow-up reminders (docs/follow-up-reminders-07-09-2026) ────

  /** Get this consultation's reminder configuration. */
  getBookingReminder(bookingId: string): Promise<FollowUpReminder | null> {
    return requestData<FollowUpReminder | null>(
      api.get<ApiResponse<FollowUpReminder | null>>(API_ENDPOINTS.doctor.bookingReminder(bookingId)),
    );
  },

  /** Create or update the reminder for a consultation. */
  setBookingReminder(bookingId: string, input: SetReminderInput): Promise<FollowUpReminder> {
    return requestData<FollowUpReminder>(
      api.put<ApiResponse<FollowUpReminder>>(API_ENDPOINTS.doctor.bookingReminder(bookingId), input),
    );
  },

  /** Cancel the reminder for a consultation. */
  clearBookingReminder(bookingId: string): Promise<{ bookingId: string }> {
    return requestData<{ bookingId: string }>(
      api.delete<ApiResponse<{ bookingId: string }>>(API_ENDPOINTS.doctor.bookingReminder(bookingId)),
    );
  },
};
