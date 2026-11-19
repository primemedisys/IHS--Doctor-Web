import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  CreateReferralInput,
  IncomingReferral,
  Referral,
  ReferralCase,
  ReferralTarget,
} from "@/types/referral";

/**
 * The doctor's referral API (docs/multi-doctor-referrals). The autocomplete
 * (`listTargets`) reuses the backend's doctor-search SQL; the rest hang off the
 * consultation the referral is made from. Thin wrappers over the `{ data }`
 * envelope, like every other service.
 */
export const referralService = {
  /** Name-driven autocomplete of referable doctors (self-excluded, ≤ 8). */
  listTargets(q: string, clinicId?: string): Promise<ReferralTarget[]> {
    return requestData<ReferralTarget[]>(
      api.get<ApiResponse<ReferralTarget[]>>(API_ENDPOINTS.doctor.referralTargets(q, clinicId)),
    );
  },

  /** Refer this consultation's patient onward to another doctor. */
  createReferral(bookingId: string, input: CreateReferralInput): Promise<Referral> {
    return requestData<Referral>(
      api.post<ApiResponse<Referral>>(API_ENDPOINTS.doctor.bookingReferrals(bookingId), input),
    );
  },

  /** Referrals already made from this consultation, newest first. */
  listBookingReferrals(bookingId: string): Promise<Referral[]> {
    return requestData<Referral[]>(
      api.get<ApiResponse<Referral[]>>(API_ENDPOINTS.doctor.bookingReferrals(bookingId)),
    );
  },

  /** Cancel a still-pending referral the caller made. */
  cancelReferral(id: string): Promise<Referral> {
    return requestData<Referral>(
      api.patch<ApiResponse<Referral>>(API_ENDPOINTS.doctor.referral(id), { status: "cancelled" }),
    );
  },

  /** The inbox of referrals sent TO the signed-in doctor. */
  listIncoming(status?: string): Promise<IncomingReferral[]> {
    return requestData<IncomingReferral[]>(
      api.get<ApiResponse<IncomingReferral[]>>(API_ENDPOINTS.doctor.referralsIncoming(status)),
    );
  },

  /** The referring doctor's notes + prescription behind one incoming referral. */
  getCase(id: string): Promise<ReferralCase> {
    return requestData<ReferralCase>(
      api.get<ApiResponse<ReferralCase>>(API_ENDPOINTS.doctor.referralCase(id)),
    );
  },

  /** The referring doctor's prescription PDF, as a blob for inline viewing. */
  async casePdf(id: string): Promise<Blob> {
    const res = await api.get(API_ENDPOINTS.doctor.referralCasePdf(id), { responseType: "blob" });
    return res.data as Blob;
  },

  /**
   * Begin the walk-in consultation for a referral. Creates the target doctor's
   * own ₹0 appointment (the visit was already paid on the referring booking) and
   * returns its id, so the UI opens the ordinary appointment screen for it.
   */
  startConsultation(id: string): Promise<{ bookingId: string }> {
    return requestData<{ bookingId: string }>(
      api.post<ApiResponse<{ bookingId: string }>>(API_ENDPOINTS.doctor.referralStartConsultation(id)),
    );
  },
};
