"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FiArrowLeft, FiCheckCircle, FiFileText, FiMaximize2, FiMove, FiVideo } from "react-icons/fi";
import { toast } from "sonner";
import { ErrorState, Loading } from "@/components/feedback";
import { ConsultationRoom, useVideoToken } from "@/features/consultation";
import { useCompleteAppointment } from "@/features/appointments";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/utils/error";
import type { VideoToken } from "@/types/consultation";

/**
 * The doctor's video consultation room (docs/video-consultation). Fetches a
 * short-lived LiveKit join token for the booking, then renders the call with a
 * top action bar: the patient's Description (which
 * open in a new tab so the call keeps running), and a one-click "Mark as
 * complete" that finishes the appointment AND ends the call (leaving the page
 * disconnects the room).
 */
export default function AppointmentCallPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;
  const router = useRouter();
  const getToken = useVideoToken();
  const complete = useCompleteAppointment();

  const [grant, setGrant] = useState<VideoToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const join = useCallback(() => {
    if (!bookingId) return;
    setError(null);
    getToken
      .mutateAsync(bookingId)
      .then(setGrant)
      .catch((e) => setError(getErrorMessage(e)));
  }, [bookingId, getToken]);

  useEffect(() => {
    if (!bookingId || requested.current) return;
    requested.current = true;
    join();
  }, [bookingId, join]);

  const back = () => router.push(ROUTES.dashboard.appointments);
  const retry = () => {
    setGrant(null);
    join();
  };

  /**
   * Which side panel is open. `null` = the call fills the page.
   *
   * These used to open in a new TAB, because a same-tab navigation unmounts
   * ConsultationRoom and drops the live call. They now open IN PLACE and the
   * call shrinks to a draggable picture-in-picture instead — the doctor keeps
   * seeing the patient while reading their history.
   *
   * The critical constraint: the <Box> wrapping ConsultationRoom stays in the
   * SAME JSX slot in both modes and only its `sx` changes. React reconciles it
   * as the same element, so LiveKit's tracks are never torn down. Moving that
   * node in the tree — or rendering it from two different branches — would
   * remount it and end the call.
   */
  const [panel, setPanel] = useState<"history" | "description" | "prescription" | null>(null);
  /** PiP offset from its default corner, in px, set by dragging. */
  const [pip, setPip] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  /** Append `embed=1` so the iframe renders the page WITHOUT the dashboard chrome. */
  const embed = (url: string) => `${url}${url.includes("?") ? "&" : "?"}embed=1`;

  const panelUrl =
    panel === "history"
      ? embed(ROUTES.dashboard.patientHistory(bookingId ?? ""))
      : panel === "description"
        ? embed(ROUTES.dashboard.patientDescription(bookingId ?? ""))
        : panel === "prescription"
          ? embed(ROUTES.dashboard.writePrescription(bookingId ?? ""))
          : null;

  const onPipDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pip.x, oy: pip.y };
  };
  const onPipMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPip({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
  };
  const onPipUp = () => {
    dragRef.current = null;
  };

  /**
   * The panel tells us when a prescription has been signed, so the call goes
   * back to full screen on its own. Origin-checked: a message from anywhere
   * else is ignored.
   */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type !== "ihs:rx-finalized") return;
      setPanel(null);
      setPip({ x: 0, y: 0 });
      toast.success("Prescription signed — back to the call");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Mark complete → on success, leave the page (which unmounts the room and ends
  // the call) so the doctor finishes the consult in one click.
  const onComplete = () => {
    if (!bookingId || complete.isPending) return;
    complete.mutate(
      { id: bookingId, noShow: false },
      {
        onSuccess: () => {
          toast.success("Consultation completed");
          router.push(ROUTES.dashboard.appointments);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  if (error) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<FiArrowLeft />} onClick={back} sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}>
          Back to appointments
        </Button>
        <ErrorState title="Can't join the call" description={error} onRetry={retry} />
      </Stack>
    );
  }

  if (!grant || !bookingId) return <Loading label="Connecting to the consultation…" />;

  return (
    <Stack spacing={2} sx={{ height: { xs: "calc(100dvh - 168px)", md: "calc(100dvh - 140px)" }, minHeight: 520 }}>
      {/* Top action bar — available throughout the live consult. */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.primary" }}>
          <FiVideo />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Video consultation
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
          {/* The patient's full record. It carries the treatment history,
              the vitals and the documents, so it is the one panel worth a
              button during a live call. */}
          <Button
            variant="outlined"
            startIcon={<FiFileText />}
            onClick={() => setPanel(panel === "description" ? null : "description")}
            sx={{ textTransform: "none", fontWeight: 700 }}
            aria-label="Open the patient's details beside the call"
          >
            Description
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<FiCheckCircle />}
            loading={complete.isPending}
            onClick={onComplete}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Mark as complete
          </Button>
          <Button
            color="inherit"
            startIcon={<FiArrowLeft />}
            onClick={back}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Leave
          </Button>
        </Stack>
      </Stack>

      {/* The panel takes the page while a call is open; it is a same-origin
          iframe of the route that already exists, so History/Description/Rx
          behave exactly as they do standalone and none of their code has to
          know it is being shown beside a call. */}
      {panelUrl && (
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            borderRadius: 2,
            overflow: "hidden",
            border: (t) => `1px solid ${t.palette.divider}`,
            bgcolor: "background.paper",
          }}
        >
          <Box component="iframe" src={panelUrl} title="Patient records" sx={{ width: "100%", height: "100%", border: 0 }} />
        </Box>
      )}

      {/* SAME slot in both modes — only `sx` differs. Do not move this. */}
      <Box
        sx={
          panel
            ? {
                position: "fixed",
                right: 24,
                bottom: 24,
                width: { xs: 240, sm: 340 },
                height: { xs: 165, sm: 225 },
                transform: `translate(${pip.x}px, ${pip.y}px)`,
                zIndex: (t) => t.zIndex.drawer + 2,
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 12,
                touchAction: "none",
              }
            : { flexGrow: 1, minHeight: 0 }
        }
      >
        {panel && (
          <Stack
            direction="row"
            onPointerDown={onPipDown}
            onPointerMove={onPipMove}
            onPointerUp={onPipUp}
            onPointerCancel={onPipUp}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: 0.5,
              bgcolor: "rgba(0,0,0,0.55)",
              color: "#fff",
              cursor: "grab",
              "&:active": { cursor: "grabbing" },
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <FiMove size={14} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Drag to move
              </Typography>
            </Stack>
            <Tooltip title="Back to full screen">
              <IconButton
                size="small"
                onClick={() => {
                  setPanel(null);
                  setPip({ x: 0, y: 0 });
                }}
                sx={{ color: "#fff" }}
                aria-label="Close panel and return the call to full size"
              >
                <FiMaximize2 size={14} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        <ConsultationRoom
          url={grant.url}
          token={grant.token}
          otherLabel="the patient"
          onLeave={back}
          onError={(e) => setError(e.message)}
        />
      </Box>
    </Stack>
  );
}
