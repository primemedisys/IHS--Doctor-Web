import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { IncomingReferralsInbox } from "@/features/referrals";

export const metadata: Metadata = { title: "Referrals to me" };

/**
 * Referrals other doctors have sent to the signed-in doctor. Each opens the
 * shared case — the referring doctor's notes and prescription for the patient.
 */
export default function ReferralsPage() {
  return (
    <Box sx={{ maxWidth: 860, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Referrals to me
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        When another doctor refers a patient to you, it appears here with their reason, notes and
        prescription — so you have the full picture before you consult.
      </Typography>
      <IncomingReferralsInbox />
    </Box>
  );
}
