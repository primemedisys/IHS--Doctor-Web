import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { VideoToken } from "@/types/consultation";

/**
 * Video consultation service (docs/video-consultation). Fetches a short-lived
 * LiveKit join token for one of the doctor's own confirmed video bookings. The
 * Axios bearer interceptor authorizes the request automatically.
 */
export const consultationService = {
  getVideoToken(bookingId: string): Promise<VideoToken> {
    return requestData<VideoToken>(
      api.post<ApiResponse<VideoToken>>(API_ENDPOINTS.doctor.bookingVideoToken(bookingId)),
    );
  },
};
