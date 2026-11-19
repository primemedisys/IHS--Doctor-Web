import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { Insurance, Language, Specialization, SubSpecialization } from "@/types/doctor-portfolio";

/**
 * Public lookup lists (no auth). These feed the specialty/language pickers in
 * the wizard and the discovery filters. Rarely change → cached with a long
 * staleTime by the consuming hook.
 */
export const catalogService = {
  getSpecializations: () =>
    api
      .get<ApiResponse<Specialization[]>>(API_ENDPOINTS.catalog.specializations)
      .then((r) => r.data.data),

  /** Omit `specializationId` for the whole list (pickers filter by parent). */
  getSubSpecializations: (specializationId?: number) =>
    api
      .get<ApiResponse<SubSpecialization[]>>(API_ENDPOINTS.catalog.subSpecializations, {
        params: specializationId ? { specializationId } : undefined,
      })
      .then((r) => r.data.data),

  /** Find-or-create a shared sub-specialty (auth: doctor). `created` is false when it already existed. */
  createSubSpecialization: (input: { specializationId: number; name: string }) =>
    api
      .post<ApiResponse<SubSpecialization>>(API_ENDPOINTS.doctor.createSubSpecialization, input)
      .then((r) => ({ subSpecialization: r.data.data, created: r.status === 201 })),

  getLanguages: () =>
    api.get<ApiResponse<Language[]>>(API_ENDPOINTS.catalog.languages).then((r) => r.data.data),

  getInsurances: () =>
    api.get<ApiResponse<Insurance[]>>(API_ENDPOINTS.catalog.insurances).then((r) => r.data.data),
};
