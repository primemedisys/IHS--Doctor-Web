import type { Metadata } from "next";
import { FollowUpOptionsView } from "@/features/follow-ups";

export const metadata: Metadata = { title: "Follow-up options" };

/**
 * The doctor's own follow-up categories (docs/follow-up-status) — the labels
 * they tag patients with on the prescription page, and the colour each one
 * wears on the appointment board.
 */
export default function FollowUpOptionsPage() {
  return <FollowUpOptionsView />;
}
