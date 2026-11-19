/**
 * Video consultation types (docs/video-consultation). Mirror the backend
 * serializers `serializeVideoToken` / `serializeVideoSession`.
 */

/** The runtime state of a video consult's LiveKit room. */
export interface VideoSession {
  status: "pending" | "live" | "ended";
  roomName: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  doctorJoined: boolean;
  patientJoined: boolean;
}

/**
 * A LiveKit join grant. `url` is the public SFU URL; `token` is a short-lived,
 * room-scoped JWT. The API secret is never sent to the client.
 */
export interface VideoToken {
  url: string;
  token: string;
  roomName: string;
  session: VideoSession | null;
}
