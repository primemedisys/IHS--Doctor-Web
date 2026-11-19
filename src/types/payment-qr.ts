/**
 * The doctor's own UPI QR for consultation payments (mirrors the backend's
 * payment-QR serializer, migration 044). A doctor who never set one up gets
 * every field null, `isActive: false` and `configured: false`.
 */
export interface PaymentQr {
  upiId: string | null;
  payeeName: string | null;
  qrImageUrl: string | null;
  isActive: boolean;
  updatedAt: string | null;
  /** Offered to patients right now: active AND carrying an image. */
  configured: boolean;
}

/** PUT /doctor/payment-qr — at least one key; "" or null clears a text field. */
export interface PaymentQrUpdate {
  upiId?: string | null;
  payeeName?: string | null;
  isActive?: boolean;
}
