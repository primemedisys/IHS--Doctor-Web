import type { Metadata } from "next";
import { AvailabilityManager } from "@/features/doctor";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilityPage() {
  return <AvailabilityManager />;
}
