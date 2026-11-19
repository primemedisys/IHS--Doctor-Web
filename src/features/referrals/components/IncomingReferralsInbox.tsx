"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { FiInbox } from "react-icons/fi";
import { ErrorState, Loading } from "@/components/feedback";
import { useIncomingReferrals } from "../hooks";
import { ReferralCaseDialog } from "./ReferralCaseDialog";
import type { IncomingReferral, ReferralStatus } from "@/types/referral";

const STATUS_META: Record<
  ReferralStatus,
  { label: string; color: "default" | "warning" | "info" | "success" | "error" }
> = {
  pending: { label: "New — not yet booked", color: "warning" },
  booked: { label: "Patient booked you", color: "info" },
  completed: { label: "Completed", color: "success" },
  cancelled: { label: "Withdrawn", color: "default" },
  declined: { label: "Declined", color: "error" },
};

/**
 * The signed-in doctor's inbox of referrals sent TO them — "Dr. A referred
 * <patient> to you". Each card opens the shared case (the referring doctor's
 * notes + prescription). `compact` (for the dashboard) trims to the first few.
 */
export function IncomingReferralsInbox({ compact = false, limit }: { compact?: boolean; limit?: number }) {
  const { data: referrals = [], isLoading, isError, refetch } = useIncomingReferrals();
  const [selected, setSelected] = useState<IncomingReferral | null>(null);

  if (isLoading) return <Loading label="Loading referrals to you…" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (referrals.length === 0) {
    return (
      <Box sx={{ textAlign: "center", color: "text.secondary", py: compact ? 2 : 5 }}>
        <FiInbox size={compact ? 22 : 30} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          No referrals from other doctors yet.
        </Typography>
      </Box>
    );
  }

  const shown = limit ? referrals.slice(0, limit) : referrals;

  return (
    <>
      <Stack spacing={1.5}>
        {shown.map((r) => (
          <ReferralRow key={r.id} referral={r} onOpen={() => setSelected(r)} />
        ))}
      </Stack>
      {selected && (
        <ReferralCaseDialog open={!!selected} onClose={() => setSelected(null)} referral={selected} />
      )}
    </>
  );
}

function ReferralRow({ referral: r, onOpen }: { referral: IncomingReferral; onOpen: () => void }) {
  const meta = STATUS_META[r.status];
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.25 }, borderRadius: (t) => `${t.tokens.radius.lg}px` }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", minWidth: 0 }}>
          <Avatar src={r.fromDoctor?.photo ?? undefined} sx={{ width: 44, height: 44, fontWeight: 700 }}>
            {(r.fromDoctor?.name ?? "?").charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {r.fromDoctor?.name ?? "A doctor"}
              </Typography>
              {r.fromDoctor?.specialization && (
                <Typography variant="caption" color="text.secondary">
                  {r.fromDoctor.specialization}
                </Typography>
              )}
              <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              referred <b>{r.patient.name ?? "a patient"}</b> to you
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              “{r.reason}”
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          size="small"
          onClick={onOpen}
          sx={{ flexShrink: 0, textTransform: "none", fontWeight: 700, alignSelf: { xs: "stretch", sm: "center" } }}
        >
          View shared case
        </Button>
      </Stack>
    </Paper>
  );
}
