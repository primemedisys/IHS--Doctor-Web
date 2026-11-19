import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { PaymentQr, PaymentQrUpdate } from "@/types/payment-qr";

const ENDPOINTS = API_ENDPOINTS.doctor;

/**
 * The doctor's consultation payment QR. Every call returns the same
 * `PaymentQr` shape, so the cache can be replaced straight from a response.
 *
 * The image is sent as-is — no `compressImage`: re-encoding a QR code is the
 * one way to make it unscannable, and the 2 MB cap is checked client-side.
 * Don't set Content-Type on the FormData; the browser adds the boundary.
 */
export const paymentQrService = {
  get: () => api.get<ApiResponse<PaymentQr>>(ENDPOINTS.paymentQr).then((r) => r.data.data),

  update: (patch: PaymentQrUpdate) =>
    api.put<ApiResponse<PaymentQr>>(ENDPOINTS.paymentQr, patch).then((r) => r.data.data),

  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ApiResponse<PaymentQr>>(ENDPOINTS.paymentQrImage, fd).then((r) => r.data.data);
  },

  remove: () => api.delete<ApiResponse<PaymentQr>>(ENDPOINTS.paymentQr).then((r) => r.data.data),
};
