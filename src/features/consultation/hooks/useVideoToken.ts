import { useMutation } from "@tanstack/react-query";
import { consultationService } from "../services/consultation.service";
import type { VideoToken } from "@/types/consultation";

/**
 * Mint a LiveKit join token for a booking. A mutation (not a cached query): the
 * token is short-lived and window-bound, so it's requested fresh each time the
 * call page mounts and never persisted.
 */
export function useVideoToken() {
  return useMutation<VideoToken, unknown, string>({
    mutationFn: (bookingId: string) => consultationService.getVideoToken(bookingId),
  });
}
