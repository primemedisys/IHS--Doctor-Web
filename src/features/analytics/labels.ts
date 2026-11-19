import type { BookingStatusKey, ConsultMode, PaymentMethodKey, PaymentStatusKey } from "./types";

type Tone = "default" | "success" | "warning" | "error" | "info";

/** Orange = pending/attention, red = cancelled/negative, green = done. */
export const BOOKING_STATUS: Record<BookingStatusKey, { label: string; tone: Tone }> = {
  pending_payment: { label: "Awaiting payment", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "error" },
  no_show: { label: "No-show", tone: "default" },
};

export const PAYMENT_STATUS: Record<PaymentStatusKey, { label: string; tone: Tone }> = {
  success: { label: "Paid", tone: "success" },
  pending_at_clinic: { label: "Due at clinic", tone: "warning" },
  initiated: { label: "Initiated", tone: "default" },
  failed: { label: "Failed", tone: "error" },
  refunded: { label: "Refunded", tone: "error" },
};

export const MODE_LABEL: Record<ConsultMode, string> = { clinic: "Clinic", video: "Video" };

export const METHOD_LABEL: Record<PaymentMethodKey, string> = { online: "Online", cash: "Cash", upi: "UPI QR" };

export const options = <K extends string>(rec: Record<K, string | { label: string }>) =>
  (Object.keys(rec) as K[]).map((value) => {
    const v = rec[value];
    return { value, label: typeof v === "string" ? v : v.label };
  });
