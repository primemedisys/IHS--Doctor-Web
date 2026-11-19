import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { Medicine, MedicineCreate, MedicineUpdate, MedicineFilters } from "@/types/medicine";

export const medicineService = {
  list(filters: MedicineFilters = {}): Promise<Medicine[]> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null && v !== ""),
    );
    return requestData<Medicine[]>(
      api.get<ApiResponse<Medicine[]>>(API_ENDPOINTS.doctor.medicines, { params }),
    );
  },

  listAll(filters: MedicineFilters = {}): Promise<Medicine[]> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null && v !== ""),
    );
    return requestData<Medicine[]>(
      api.get<ApiResponse<Medicine[]>>(API_ENDPOINTS.doctor.medicinesAll, { params }),
    );
  },

  get(id: string): Promise<Medicine> {
    return requestData<Medicine>(
      api.get<ApiResponse<Medicine>>(API_ENDPOINTS.doctor.medicine(id)),
    );
  },

  create(body: MedicineCreate): Promise<Medicine> {
    return requestData<Medicine>(
      api.post<ApiResponse<Medicine>>(API_ENDPOINTS.doctor.medicines, body),
    );
  },

  update(id: string, body: MedicineUpdate): Promise<Medicine> {
    return requestData<Medicine>(
      api.patch<ApiResponse<Medicine>>(API_ENDPOINTS.doctor.medicine(id), body),
    );
  },

  remove(id: string): Promise<{ id: string }> {
    return requestData<{ id: string }>(
      api.delete<ApiResponse<{ id: string }>>(API_ENDPOINTS.doctor.medicine(id)),
    );
  },
};
