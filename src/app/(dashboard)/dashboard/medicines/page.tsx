import type { Metadata } from "next";
import { MedicineManager } from "@/features/medicines";

export const metadata: Metadata = { title: "My Medicines" };

export default function MedicinesPage() {
  return <MedicineManager />;
}
