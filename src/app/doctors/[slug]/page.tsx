import type { Metadata } from "next";
import { DoctorProfile } from "@/features/doctors";
import { MainLayout } from "@/layouts";

export const metadata: Metadata = { title: "Doctor Profile" };

export default async function DoctorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <MainLayout>
      <DoctorProfile slug={slug} />
    </MainLayout>
  );
}
