import type { Metadata } from "next";
import { AboutPageContent } from "@/features/about";
import { MainLayout } from "@/layouts";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <MainLayout>
      <AboutPageContent />
    </MainLayout>
  );
}
