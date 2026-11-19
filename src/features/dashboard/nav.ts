import { ROUTES } from "@/constants/routes";
import type { UserRole } from "@/types/auth";

export interface DashNavItem {
  label: string;
  href: string;
  /** react-icons (Feather) name. */
  icon: string;
  /** Shorter label for the overview's shortcut cards (the sidebar keeps `label`). */
  shortLabel?: string;
  /**
   * Only shown once the doctor is LIVE (verification approved). Operational
   * features (bookings, earnings) are meaningless until the profile is public,
   * so they stay hidden through onboarding.
   */
  requiresLive?: boolean;
}

/** Sidebar items — doctor-only app, so the nav doesn't branch on role. */
export function dashboardNavForRole(role: UserRole): DashNavItem[] {
  void role;
  return [
    { label: "Overview", href: ROUTES.dashboard.root, icon: "FiGrid" },
    { label: "My Portfolio", href: ROUTES.dashboard.portfolio, icon: "FiUser" },
    // The EMR workbench: the doctor's working day + each patient's medical workspace.
    { label: "Patient Portal", href: ROUTES.dashboard.workbench, icon: "FiActivity", shortLabel: "Patient Portal", requiresLive: true },
    { label: "Appointments", href: ROUTES.dashboard.appointments, icon: "FiCalendar", requiresLive: true },
    { label: "My Patients", href: ROUTES.dashboard.patients, icon: "FiUsers", requiresLive: true },
    // The doctor's own follow-up categories (docs/follow-up-status) — sits next
    // to the two screens that render them.
    {
      label: "Follow-up options",
      shortLabel: "Follow-ups",
      href: ROUTES.dashboard.followUpOptions,
      icon: "FiTag",
      requiresLive: true,
    },
    { label: "Referrals to me", shortLabel: "Referrals", href: ROUTES.dashboard.referrals, icon: "FiShare2", requiresLive: true },
    { label: "Prescriptions", href: ROUTES.dashboard.prescriptions, icon: "FiFileText", requiresLive: true },
    { label: "My Medicines", href: ROUTES.dashboard.medicines, icon: "FiBookOpen", requiresLive: true },
    { label: "My Clinics", href: ROUTES.dashboard.clinics, icon: "FiMapPin" },
    { label: "Availability", href: ROUTES.dashboard.availability, icon: "FiClock" },
    { label: "Earnings", href: ROUTES.dashboard.earnings, icon: "FiTrendingUp", requiresLive: true },
    { label: "Settings", href: ROUTES.dashboard.settings, icon: "FiSettings" },
  ];
}

/** Filter the nav to what a doctor can see given their live (approved) status. */
export function visibleNav(items: DashNavItem[], isLive: boolean): DashNavItem[] {
  return items.filter((item) => !item.requiresLive || isLive);
}

export const roleLabel: Record<UserRole, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Administrator",
  staff: "Staff",
};
