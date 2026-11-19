"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/error";
import { useBookingReferrals, useCancelReferral } from "../hooks";
import type { ReferralStatus } from "@/types/referral";

const STATUS_META: Record<
  ReferralStatus,
  { label: string; color: "default" | "warning" | "info" | "success" | "error" }
> = {
  pending: { label: "Awaiting booking", color: "warning" },
  booked: { label: "Booked", color: "info" },
  completed: { label: "Completed", color: "success" },
  cancelled: { label: "Cancelled", color: "default" },
  declined: { label: "Declined", color: "error" },
};

/**
 * The referrals already made from THIS consultation — one compact row each,
 * with a status chip and a Cancel action while still pending. Empty state reads
 * as a quiet line so the doctor is never left staring at a blank panel.
 */
export function ReferralsList({ bookingId }: { bookingId: string }) {
  const { data: referrals = [], isLoading } = useBookingReferrals(bookingId);
  const cancel = useCancelReferral(bookingId);

  const onCancel = (id: string) => {
    cancel.mutate(id, {
      onSuccess: () => toast.success("Referral cancelled"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading referrals…
      </Typography>
    );
  }

  if (referrals.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No referrals from this consultation yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {referrals.map((r) => {
        const meta = STATUS_META[r.status];
        return (
          <Box
            key={r.id}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              p: 1.5,
              border: (t) => `1px solid ${t.palette.divider}`,
              borderRadius: (t) => `${t.tokens.radius.md}px`,
            }}
          >
            <Avatar src={r.toDoctor?.photo ?? undefined} sx={{ width: 38, height: 38 }}>
              {(r.toDoctor?.name ?? "?").charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {r.toDoctor?.name ?? "Doctor"}
                </Typography>
                {r.toDoctor?.specialization && (
                  <Typography variant="caption" color="text.secondary">
                    {r.toDoctor.specialization}
                  </Typography>
                )}
                <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {r.reason}
              </Typography>
            </Box>
            {r.status === "pending" && (
              <Button
                size="small"
                color="inherit"
                onClick={() => onCancel(r.id)}
                disabled={cancel.isPending}
                sx={{ textTransform: "none", flexShrink: 0 }}
              >
                Cancel
              </Button>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
