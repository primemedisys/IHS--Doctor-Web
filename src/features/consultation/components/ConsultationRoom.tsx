"use client";

import type { CSSProperties } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import {
  LiveKitRoom,
  VideoConference,
  useRemoteParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";

/** CSSProperties that also permits our LiveKit `--lk-*` theming variables. */
type LkStyle = CSSProperties & Record<`--lk-${string}`, string>;

/**
 * The in-app video consultation surface (docs/video-consultation). Wraps
 * LiveKit's prebuilt `VideoConference` (tiles + mic/cam/screenshare/leave) and
 * overlays a "waiting for the other party" state driven by client-side presence
 * — no backend polling. Leaving (the control-bar button or a disconnect) calls
 * `onLeave`.
 */
interface ConsultationRoomProps {
  /** The public LiveKit SFU URL. */
  url: string;
  /** The short-lived, room-scoped join token. */
  token: string;
  /** Who the viewer is waiting for, e.g. "the doctor" / "the patient". */
  otherLabel: string;
  /** Navigate away (back to appointments) on leave/disconnect. */
  onLeave: () => void;
  /** Surface a connection / device-permission error to the page. */
  onError?: (error: Error) => void;
}

/** A dim overlay shown until the remote participant connects (client presence). */
function WaitingOverlay({ otherLabel }: { otherLabel: string }) {
  const remotes = useRemoteParticipants();
  if (remotes.length > 0) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        display: "grid",
        placeItems: "center",
        px: 3,
        textAlign: "center",
        bgcolor: "rgba(0,0,0,0.55)",
        // Let clicks reach the LiveKit control bar underneath (mic/cam/leave).
        pointerEvents: "none",
      }}
    >
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress sx={{ color: "#fff" }} />
        <Typography sx={{ color: "#fff", fontWeight: 700 }}>
          Waiting for {otherLabel} to join…
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
          You&apos;ll connect automatically the moment they arrive.
        </Typography>
      </Stack>
    </Box>
  );
}

export function ConsultationRoom({ url, token, otherLabel, onLeave, onError }: ConsultationRoomProps) {
  const theme = useTheme();
  // Restyle LiveKit's control bar (mic / camera / screenshare / leave) to match
  // our theme — inline vars override the default-theme stylesheet. Leave stays
  // on the conventional danger red.
  const lkStyle: LkStyle = {
    height: "100%",
    "--lk-accent-bg": theme.palette.primary.main,
    "--lk-accent-fg": theme.palette.primary.contrastText,
    "--lk-control-active-bg": theme.palette.primary.main,
    "--lk-control-active-hover-bg": theme.palette.primary.dark,
    "--lk-danger": theme.palette.error.main,
    "--lk-danger-fg": theme.palette.error.contrastText,
    "--lk-border-radius": "10px",
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 480,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "#0b0b0f",
      }}
    >
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect
        audio
        video
        data-lk-theme="default"
        style={lkStyle}
        onDisconnected={onLeave}
        onError={(err) => onError?.(err)}
      >
        <WaitingOverlay otherLabel={otherLabel} />
        {/* Prebuilt conference: tiles, active-speaker, and the control bar with
            mic/camera/screenshare/leave. It renders its own audio, so no extra
            RoomAudioRenderer is added here. */}
        <VideoConference />
      </LiveKitRoom>
    </Box>
  );
}
