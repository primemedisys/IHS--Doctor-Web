import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  AvailabilityException,
  ClinicInput,
  ExceptionInput,
  OwnClinic,
  WeeklySlot,
  WeeklySlotInput,
} from "@/types/clinic";

const ENDPOINTS = API_ENDPOINTS.doctor;

/**
 * The doctor's own clinics + availability API. HTTP only, off the shared `api`
 * instance (auth header + refresh-on-401 apply). Mirrors the backend contract in
 * docs/clinics-availability/integration-plan.md.
 *
 * Weekly schedules are REPLACE-THE-SET: `setClinicAvailability` / `setOnline`
 * send the whole week; the server swaps it atomically.
 */
export const clinicService = {
  // ── Clinics ─────────────────────────────────────────────────────────────────
  list: () => api.get<ApiResponse<OwnClinic[]>>(ENDPOINTS.clinics).then((r) => r.data.data),

  create: (input: ClinicInput) =>
    api.post<ApiResponse<OwnClinic>>(ENDPOINTS.clinics, input).then((r) => r.data.data),

  update: (id: string, patch: Partial<ClinicInput>) =>
    api.patch<ApiResponse<OwnClinic>>(ENDPOINTS.clinic(id), patch).then((r) => r.data.data),

  remove: (id: string) => api.delete(ENDPOINTS.clinic(id)).then(() => id),

  // ── Availability (replace-the-set) ──────────────────────────────────────────
  getClinicAvailability: (id: string) =>
    api.get<ApiResponse<WeeklySlot[]>>(ENDPOINTS.clinicAvailability(id)).then((r) => r.data.data),

  setClinicAvailability: (id: string, slots: WeeklySlotInput[]) =>
    api
      .put<ApiResponse<WeeklySlot[]>>(ENDPOINTS.clinicAvailability(id), { slots })
      .then((r) => r.data.data),

  getOnline: () =>
    api.get<ApiResponse<WeeklySlot[]>>(ENDPOINTS.onlineAvailability).then((r) => r.data.data),

  setOnline: (slots: WeeklySlotInput[]) =>
    api
      .put<ApiResponse<WeeklySlot[]>>(ENDPOINTS.onlineAvailability, { slots })
      .then((r) => r.data.data),

  // ── Exceptions ──────────────────────────────────────────────────────────────
  listExceptions: () =>
    api.get<ApiResponse<AvailabilityException[]>>(ENDPOINTS.exceptions).then((r) => r.data.data),

  addException: (input: ExceptionInput) =>
    api
      .post<ApiResponse<AvailabilityException>>(ENDPOINTS.exceptions, {
        clinicId: input.clinicId,
        exceptionDate: input.exceptionDate,
        reason: input.reason || undefined,
      })
      .then((r) => r.data.data),

  removeException: (id: string) => api.delete(ENDPOINTS.exception(id)).then(() => id),
};
