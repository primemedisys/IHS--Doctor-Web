import type { Metadata } from "next";
import { EarningsView } from "@/features/dashboard";

export const metadata: Metadata = { title: "Earnings" };

export default function EarningsPage() {
  return <EarningsView />;
}
