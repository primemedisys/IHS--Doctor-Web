import type { Metadata } from "next";
import { PortfolioPreview } from "@/features/doctor";

export const metadata: Metadata = { title: "My Portfolio" };

export default function PortfolioPage() {
  return <PortfolioPreview />;
}
