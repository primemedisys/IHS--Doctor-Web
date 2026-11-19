import type { ReactNode } from "react";
import { DashboardShell } from "@/features/dashboard";

/** Wraps every /dashboard route in the role-aware shell. Access is enforced by
 * src/middleware.ts (cookie) and the shell (context bootstrap). */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
