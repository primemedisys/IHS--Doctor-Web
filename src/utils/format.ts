import { format, formatDistanceToNow, parseISO } from "date-fns";

/** Format an ISO date for display, e.g. "01 Jul 2026". */
export function formatDate(value: string | Date, pattern = "dd MMM yyyy"): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}

/** Format an ISO datetime, e.g. "01 Jul 2026, 3:45 PM". */
export function formatDateTime(value: string | Date): string {
  return formatDate(value, "dd MMM yyyy, h:mm a");
}

/** Relative time, e.g. "3 hours ago". */
export function formatRelative(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Indian Rupee currency formatting. */
export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
}

/** Compact number, e.g. 12500 -> "12.5K". */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact" }).format(value);
}

/** Initials from a name, e.g. "Arya Sunirmal" -> "AS". */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
