import type { Metadata } from "next";
import Stack from "@mui/material/Stack";
import { PaymentQrCard, PortfolioEditor } from "@/features/doctor";

export const metadata: Metadata = { title: "Profile & Portfolio" };

export default function SettingsPage() {
  return (
    <Stack spacing={3}>
      <PortfolioEditor />
      <PaymentQrCard />
    </Stack>
  );
}
