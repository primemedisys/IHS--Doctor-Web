import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  Prescription,
  PrescriptionFilters,
  PrescriptionSummary,
  PrescriptionUpdate,
} from "@/types/prescription";

/**
 * Prescriptions the doctor writes (`/doctor/prescriptions`).
 *
 * `finalize` is idempotent server-side, and it may return `pdfUrl: null` when
 * the render failed — the record is still signed and valid, and `pdf()` will
 * rebuild it. Callers must not treat that as an error.
 */
export const prescriptionService = {
  list(filters: PrescriptionFilters = {}): Promise<PrescriptionSummary[]> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null && v !== ""),
    );
    return requestData<PrescriptionSummary[]>(
      api.get<ApiResponse<PrescriptionSummary[]>>(API_ENDPOINTS.doctor.prescriptions, { params }),
    );
  },

  get(id: string): Promise<Prescription> {
    return requestData<Prescription>(
      api.get<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.prescription(id)),
    );
  },

  /** The Rx for a booking, or a 404 if none — drives "Write Rx" vs "View Rx". */
  getByBooking(bookingId: string): Promise<Prescription> {
    return requestData<Prescription>(
      api.get<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.bookingPrescription(bookingId)),
    );
  },

  create(body: { bookingId: string; templateId?: string }): Promise<Prescription> {
    return requestData<Prescription>(
      api.post<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.prescriptions, body),
    );
  },

  update(id: string, body: PrescriptionUpdate): Promise<Prescription> {
    return requestData<Prescription>(
      api.patch<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.prescription(id), body),
    );
  },

  remove(id: string): Promise<{ id: string }> {
    return requestData<{ id: string }>(
      api.delete<ApiResponse<{ id: string }>>(API_ENDPOINTS.doctor.prescription(id)),
    );
  },

  /** Sign, number, freeze the letterhead and render. Safe to call twice. */
  finalize(id: string, emailPatient = false): Promise<Prescription> {
    return requestData<Prescription>(
      api.post<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.prescriptionFinalize(id), { emailPatient }),
    );
  },

  /** Refill a draft from its Patient Workbench consultation; returns it with `clinicalSnapshot`. */
  syncWorkbench(id: string): Promise<Prescription> {
    return requestData<Prescription>(
      api.post<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.prescriptionSyncWorkbench(id)),
    );
  },

  /** Supersede a finalized Rx; returns the pre-filled v(n+1) draft. */
  amend(id: string, reason: string): Promise<Prescription> {
    return requestData<Prescription>(
      api.post<ApiResponse<Prescription>>(API_ENDPOINTS.doctor.prescriptionAmend(id), { reason }),
    );
  },

  async pdf(id: string): Promise<Blob> {
    const res = await api.get(API_ENDPOINTS.doctor.prescriptionPdf(id), { responseType: "blob" });
    return res.data as Blob;
  },
};
