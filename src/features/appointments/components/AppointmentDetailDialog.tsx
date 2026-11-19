"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiCreditCard,
  FiDollarSign,
  FiExternalLink,
  FiHeart,
  FiLock,
  FiMapPin,
  FiPhone,
  FiUserPlus,
  FiUserX,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";
import { Loading, ErrorState } from "@/components/feedback";
import { ROUTES } from "@/constants/routes";
import { FollowUpPanel } from "@/features/follow-ups";
import { PrescriptionActionButton } from "@/features/prescriptions";
// Deep imports, not the `@/features/referrals` barrel: that barrel pulls in the
// referral inbox, which opens THIS dialog — importing it here would be a cycle.
import { ReferDoctorDialog } from "@/features/referrals/components/ReferDoctorDialog";
import { RescheduleDialog } from "./RescheduleDialog";
import { ReferralContextPanel } from "@/features/referrals/components/ReferralContextPanel";
import { getErrorMessage } from "@/utils/error";
import { formatCurrency, getInitials } from "@/utils/format";
import { useAppointment, useCompleteAppointment, useMarkPaid } from "../hooks";
import { STATUS_META, timeLabel, dateLabel, paymentLabel, isUpiQrPayment } from "./appointment-format";
import type { IncomingReferral } from "@/types/referral";

export interface AppointmentDetailDialogProps {
  appointmentId: string | null;
  open: boolean;
  onClose: () => void;
  /**
   * Set when this appointment was reached from the referral inbox. It changes
   * nothing about the flow — same facts, same actions, same theme — it only adds
   * the context panel: who referred the patient, why, and what they prescribed.
   */
  referral?: IncomingReferral;
}

/** The four accents the dialog paints with, resolved once per use. */
type Accent = "primary" | "secondary" | "success" | "warning" | "error";
const soft = (t: Theme, c: Accent) => alpha(t.palette[c].main, t.palette.mode === "dark" ? 0.2 : 0.1);
const line = (t: Theme, c: Accent) => alpha(t.palette[c].main, t.palette.mode === "dark" ? 0.4 : 0.28);
const ink = (t: Theme, c: Accent) => (t.palette.mode === "dark" ? t.palette[c].light : t.palette[c].dark);

/** A status/mode pill. Soft fill, coloured ink — never a solid block of colour. */
function Pill({
  accent,
  icon,
  dot,
  children,
}: {
  accent: Accent;
  icon?: React.ReactNode;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="span"
      sx={(t) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: `${t.tokens.radius.pill}px`,
        border: 1,
        borderColor: line(t, accent),
        bgcolor: soft(t, accent),
        color: ink(t, accent),
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      })}
    >
      {dot && (
        <Box
          component="span"
          sx={(t) => ({ width: 7, height: 7, borderRadius: "50%", bgcolor: t.palette[accent].main })}
        />
      )}
      {icon}
      {children}
    </Box>
  );
}

/** One fact in the Appointment panel: tinted icon tile, quiet label, loud value. */
function InfoRow({
  accent,
  icon,
  label,
  children,
}: {
  accent: Accent;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        py: 1.25,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0, pb: 0 },
        "&:first-of-type": { pt: 0 },
      }}
    >
      <Box
        sx={(t) => ({
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: `${t.tokens.radius.sm}px`,
          bgcolor: t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.06) : t.palette.grey[100],
          color: ink(t, accent),
        })}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.disabled" }}
        >
          {label}
        </Typography>
        <Box sx={{ mt: 0.25, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {children}
        </Box>
      </Box>
    </Stack>
  );
}

/** A panel in the two-column body. */
function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box
      sx={(t) => ({
        height: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: `${t.tokens.radius.lg}px`,
        p: 2,
      })}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "text.disabled",
          mb: 1,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** One tile in the clinical snapshot strip. */
function SnapTile({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Box
      sx={(t) => ({
        height: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: `${t.tokens.radius.md}px`,
        bgcolor: alpha(t.palette.text.primary, t.palette.mode === "dark" ? 0.05 : 0.025),
        p: 1.75,
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.25, color: "text.disabled" }}>
        {icon}
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

/**
 * Booking facts + the patient snapshot + the doctor's lifecycle actions.
 *
 * The layout answers the three questions in the order they get asked: WHO is
 * this (the hero), WHAT was booked (left panel), WHAT DO I DO NOW (right
 * panel) — then the clinical snapshot underneath, which is what a doctor scans
 * before prescribing. The right column used to be near-empty with a single
 * button in it; it now carries the actions, and the snapshot fills the width.
 *
 * The full patient record (flowsheets, history, notes) is a dedicated PAGE
 * behind "View patient details", not a second screen inside this modal.
 *
 * A referred consultation is an ordinary one: pass `referral` and the same
 * screen gains the referring doctor's context on top.
 */
export function AppointmentDetailDialog({ appointmentId, open, onClose, referral }: AppointmentDetailDialogProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useAppointment(appointmentId ?? "");
  const markPaid = useMarkPaid();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const complete = useCompleteAppointment();
  const [referOpen, setReferOpen] = useState(false);

  const booking = data?.booking;
  const snapshot = data?.patient;
  const status = booking ? STATUS_META[booking.status] : null;
  const isVideo = booking?.mode === "video";

  const canComplete = booking?.status === "confirmed";
  // A confirmed video consult can be joined (the backend also gates the time window).
  const canJoinVideo = isVideo && booking?.status === "confirmed";
  // "Mark complete" now settles the at-clinic cash in the same action (one
  // click), so a standalone "Mark as paid" is only a fallback for an ALREADY
  // completed booking whose payment was never recorded.
  //
  // A UPI-QR payment is different: completing the consult is NOT proof the
  // transfer arrived, so it never auto-settles. The doctor checks their UPI app
  // and marks it paid themselves — before or after the visit.
  const isUpiQr = booking ? isUpiQrPayment(booking.paymentMode, booking.payment) : false;
  const paymentPending = booking?.paymentMode === "offline" && booking?.payment?.status === "pending_at_clinic";
  const canMarkPaid =
    paymentPending &&
    (booking?.status === "completed" || (isUpiQr && booking?.status === "confirmed"));
  const canPrescribe = booking?.status === "confirmed" || booking?.status === "completed";

  const onMarkPaid = () => {
    if (!appointmentId) return;
    markPaid.mutate(appointmentId, {
      onSuccess: () => toast.success("Payment recorded"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };
  const onComplete = (noShow: boolean) => {
    if (!appointmentId) return;
    complete.mutate(
      { id: appointmentId, noShow },
      {
        onSuccess: () => toast.success(noShow ? "Marked as no-show" : "Marked complete"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const demo = snapshot
    ? ([
        snapshot.age != null ? `${snapshot.age} yrs` : null,
        snapshot.gender,
        snapshot.bloodGroup && snapshot.bloodGroup !== "unknown" ? snapshot.bloodGroup : null,
        [snapshot.city, snapshot.state].filter(Boolean).join(", ") || null,
      ].filter(Boolean) as string[])
    : [];

  const payment = booking ? paymentLabel(booking.paymentMode, booking.payment?.status, booking.payment) : null;
  const paymentSettled = booking?.payment?.status === "success";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        scroll="body"
        slotProps={{ paper: { sx: (t: Theme) => ({ borderRadius: `${t.tokens.radius.xl ?? 22}px` }) } }}
      >
        {/*
          Close only. The title said "Appointment details" on a dialog that
          opens from a row you just clicked, and repeated a booking id nobody
          reads — so the patient IS the heading now, and their card starts at
          the top. When the dialog is opened from the referral inbox, the
          <ReferralContextPanel> below already names the referring doctor in
          full, which the title was only echoing.

          The button stays in the flow rather than floating over the corner:
          the card's own status chips live exactly where an absolute one would
          land.
        */}
        <Stack direction="row" sx={{ justifyContent: "flex-end", px: 2, pt: 2, pb: 0 }}>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            sx={(t) => ({
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: `${t.tokens.radius.sm}px`,
              border: 1,
              borderColor: "divider",
              color: "text.secondary",
            })}
          >
            <FiX size={16} />
          </IconButton>
        </Stack>

        <DialogContent sx={{ pt: 1 }}>
          {isLoading ? (
            <Loading label="Loading appointment…" />
          ) : isError || !booking ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <Stack spacing={2.5}>
              {/* The only thing a referred consult adds: who sent the patient,
                  why, and what they already prescribed + recorded. */}
              {referral && <ReferralContextPanel referral={referral} />}

              {/* ── Who ──────────────────────────────────────────────────── */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={(t) => ({
                  alignItems: { sm: "center" },
                  p: 2.25,
                  borderRadius: `${t.tokens.radius.lg}px`,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.04) : t.palette.grey[50],
                })}
              >
                <Avatar
                  src={booking.patient.photoUrl ?? undefined}
                  alt={booking.patient.name ?? "Patient"}
                  variant="rounded"
                  sx={(t) => ({
                    width: 62,
                    height: 62,
                    flexShrink: 0,
                    borderRadius: `${t.tokens.radius.md}px`,
                    fontSize: 21,
                    fontWeight: 700,
                    bgcolor: "grey.100",
                    color: "text.primary",
                    border: 1,
                    borderColor: "divider",
                  })}
                >
                  {getInitials(booking.patient.name ?? "P")}
                </Avatar>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 700, lineHeight: 1.15 }}>
                    {booking.patient.name ?? "Patient"}
                  </Typography>
                  {demo.length > 0 && (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.875, my: 1 }} useFlexGap>
                      {demo.map((d) => (
                        <Box
                          key={d}
                          component="span"
                          sx={(t) => ({
                            px: 1.25,
                            py: 0.375,
                            borderRadius: `${t.tokens.radius.pill}px`,
                            border: 1,
                            borderColor: "divider",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "text.secondary",
                          })}
                        >
                          {d}
                        </Box>
                      ))}
                    </Stack>
                  )}
                  {snapshot?.phone && (
                    <Stack direction="row" spacing={0.875} sx={{ alignItems: "center" }}>
                      <Box sx={{ color: "primary.main", display: "grid", placeItems: "center" }}>
                        <FiPhone size={14} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {snapshot.phone}
                      </Typography>
                    </Stack>
                  )}
                  {/* Who arranged it — absent on a booking the patient made themselves. */}
                  {booking.bookedBy && (
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                      Booked by {booking.bookedBy.name}
                      {booking.bookedBy.phone ? ` · ${booking.bookedBy.phone}` : ""}
                    </Typography>
                  )}
                </Box>

                <Stack spacing={1.5} sx={{ alignItems: { sm: "flex-end" }, flexShrink: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }} useFlexGap>
                    <Pill
                      accent={
                        booking.status === "completed"
                          ? "success"
                          : booking.status === "confirmed"
                            ? "primary"
                            : booking.status === "pending_payment"
                              ? "warning"
                              : "error"
                      }
                      dot
                    >
                      {status?.label}
                    </Pill>
                    <Pill accent={isVideo ? "secondary" : "primary"} icon={isVideo ? <FiVideo size={12} /> : <FiMapPin size={12} />}>
                      {isVideo ? "Video" : "Hospital"}
                    </Pill>
                  </Stack>
                  {snapshot && (
                    <Button
                      variant="contained"
                      startIcon={<FiExternalLink />}
                      onClick={() => router.push(ROUTES.dashboard.patientDescription(booking.id))}
                      sx={(t) => ({
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: `${t.tokens.radius.md}px`,
                        px: 2,
                        py: 1.25,
                        bgcolor: "primary.main",
                        "&:hover": { bgcolor: "primary.dark", boxShadow: "none" },
                        boxShadow: "none",
                      })}
                    >
                      View patient details
                    </Button>
                  )}
                </Stack>
              </Stack>

              {/* ── What was booked · what to do now ─────────────────────── */}
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Panel label="Appointment">
                    <InfoRow accent="primary" icon={<FiCalendar size={18} />} label="When">
                      {dateLabel(booking.date)}
                      {booking.startTime ? ` · ${timeLabel(booking.startTime)}` : ""}
                      {booking.endTime && (
                        <Box component="span" sx={{ color: "text.disabled", fontWeight: 600 }}>
                          · to {timeLabel(booking.endTime)}
                        </Box>
                      )}
                    </InfoRow>
                    <InfoRow
                      accent="secondary"
                      icon={isVideo ? <FiVideo size={18} /> : <FiMapPin size={18} />}
                      label="Mode"
                    >
                      {isVideo ? "Video consultation" : `Hospital visit${booking.clinic ? ` · ${booking.clinic.name}` : ""}`}
                    </InfoRow>
                    <InfoRow accent="success" icon={<FiCreditCard size={18} />} label="Amount">
                      <Box component="span" sx={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(booking.amount)}
                      </Box>
                    </InfoRow>
                    <InfoRow accent="warning" icon={<FiDollarSign size={18} />} label="Payment">
                      {payment ? (
                        <Pill accent={paymentSettled ? "success" : "warning"} dot>
                          {payment}
                        </Pill>
                      ) : (
                        <Box component="span" sx={{ color: "text.disabled" }}>
                          —
                        </Box>
                      )}
                    </InfoRow>
                  </Panel>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Panel label="Actions">
                    <Stack spacing={1.25}>
                      {canJoinVideo && (
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<FiVideo />}
                          onClick={() => router.push(ROUTES.dashboard.call(booking.id))}
                          sx={{ textTransform: "none", fontWeight: 700, py: 1.25 }}
                        >
                          Join video call
                        </Button>
                      )}

                      {canPrescribe && (
                        <>
                          <PrescriptionActionButton bookingId={booking.id} bookingStatus={booking.status} patientId={booking.patient.id} />
                          <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<FiUserPlus />}
                            onClick={() => setReferOpen(true)}
                            sx={{ textTransform: "none", fontWeight: 700, py: 1.25 }}
                          >
                            Refer to another doctor
                          </Button>
                        </>
                      )}

                      {(canMarkPaid || canComplete) && <Divider sx={{ my: 0.25 }} />}

                      {canMarkPaid && (
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<FiDollarSign />}
                          onClick={onMarkPaid}
                          loading={markPaid.isPending}
                          sx={{ textTransform: "none", fontWeight: 700, py: 1.25 }}
                        >
                          Mark as paid
                        </Button>
                      )}
                      {canMarkPaid && isUpiQr && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
                          Paid to your UPI QR — verify the amount in your UPI app, then mark it paid.
                        </Typography>
                      )}

                      {canComplete && (
                        <>
                          {/* Closing the visit and recording an absence are the
                              same decision point, so they sit on one row — but
                              never with equal weight. */}
                          <Box sx={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 1.25 }}>
                            <Button
                              variant="contained"
                              startIcon={<FiCheck />}
                              onClick={() => onComplete(false)}
                              loading={complete.isPending}
                              sx={{ textTransform: "none", fontWeight: 700, py: 1.25 }}
                            >
                              Mark complete
                            </Button>
                            <Button
                              variant="text"
                              color="inherit"
                              startIcon={<FiUserX />}
                              onClick={() => onComplete(true)}
                              loading={complete.isPending}
                              sx={{ textTransform: "none", fontWeight: 700, color: "text.secondary" }}
                            >
                              No-show
                            </Button>
                          </Box>

                          {/* The doctor can't make this slot → move it rather
                              than cancelling on the patient. Confirmed only: a
                              completed or cancelled appointment has no future
                              time to change. */}
                          <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<FiCalendar />}
                            onClick={() => setRescheduleOpen(true)}
                            sx={{ textTransform: "none", fontWeight: 700, py: 1.25 }}
                          >
                            Reschedule
                          </Button>
                        </>
                      )}

                      {!canPrescribe && !canComplete && !canMarkPaid && !canJoinVideo && (
                        <Typography variant="body2" color="text.secondary">
                          Nothing to do on this appointment — it is {status?.label.toLowerCase()}.
                        </Typography>
                      )}

                      {/* Where this patient goes next.
                          It sits inside Actions, in the space the buttons leave
                          behind: on a completed consult the column is otherwise
                          empty, and "when am I seeing them again" is the last
                          decision of the visit — the same beat as the buttons
                          above it, not a separate errand further down the page.
                          Auto-saves; a status picked but not committed would
                          make the roster lie. */}
                      {canPrescribe && (
                        <>
                          <Divider sx={{ my: 0.25 }}>
                            <Typography
                              sx={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                letterSpacing: "0.09em",
                                textTransform: "uppercase",
                                color: "text.disabled",
                              }}
                            >
                              Follow-up
                            </Typography>
                          </Divider>
                          <FollowUpPanel bookingId={booking.id} />
                        </>
                      )}
                    </Stack>
                  </Panel>
                </Grid>
              </Grid>

              {/* ── What to know before prescribing ──────────────────────── */}
              {snapshot ? (
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5, color: "text.disabled" }}>
                    <FiHeart size={13} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>
                      Clinical snapshot
                    </Typography>
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <SnapTile icon={<FiAlertTriangle size={13} />} title="Allergies">
                        {snapshot.allergies.length ? (
                          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }} useFlexGap>
                            {snapshot.allergies.map((a) => (
                              <Pill key={a.name} accent="error" icon={<FiAlertTriangle size={11} />}>
                                {a.name}
                                {a.severity ? ` · ${a.severity}` : ""}
                              </Pill>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            None known
                          </Typography>
                        )}
                      </SnapTile>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <SnapTile icon={<FiActivity size={13} />} title="Conditions">
                        {snapshot.conditions.length ? (
                          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }} useFlexGap>
                            {snapshot.conditions.map((c) => (
                              <Pill key={c.name} accent="secondary">
                                {c.name}
                                {c.diagnosedYear ? ` · ${c.diagnosedYear}` : ""}
                              </Pill>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            None recorded
                          </Typography>
                        )}
                      </SnapTile>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      {/* The prototype's third tile was "last vitals"; this
                          endpoint carries no vitals, and a tile that needs a
                          second request to say anything would hold the whole
                          modal. Medications answer the same question a doctor
                          asks here — what is this patient already on. */}
                      <SnapTile icon={<FiHeart size={13} />} title="Current medications">
                        {snapshot.currentMedications.length ? (
                          <Stack spacing={0.5}>
                            {snapshot.currentMedications.map((m) => (
                              <Stack
                                key={m.medicineName}
                                direction="row"
                                sx={{ justifyContent: "space-between", gap: 1.25, fontSize: 13 }}
                              >
                                <Box component="span" sx={{ color: "text.secondary" }}>
                                  {m.medicineName}
                                </Box>
                                <Box component="span" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                                  {[m.dosage, m.frequency].filter(Boolean).join(" · ") || "—"}
                                </Box>
                              </Stack>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            None recorded
                          </Typography>
                        )}
                      </SnapTile>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Stack
                  spacing={1}
                  sx={(t) => ({
                    alignItems: "center",
                    textAlign: "center",
                    color: "text.secondary",
                    borderRadius: `${t.tokens.radius.md}px`,
                    bgcolor: "action.hover",
                    p: 3,
                  })}
                >
                  <FiLock size={22} />
                  <Typography variant="body2">Patient details unlock once the booking is confirmed.</Typography>
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {booking && (
        <ReferDoctorDialog
          open={referOpen}
          onClose={() => setReferOpen(false)}
          bookingId={booking.id}
          sourceClinicId={booking.clinic?.id ?? null}
          patientName={booking.patient.name}
        />
      )}
      {/* Sibling of the dialog, not a child of its content: nesting a Dialog
          inside another Dialog's scroll container traps focus in the wrong
          layer. */}
      {booking && (
        <RescheduleDialog
          appointment={booking}
          open={rescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
        />
      )}
    </>
  );
}
