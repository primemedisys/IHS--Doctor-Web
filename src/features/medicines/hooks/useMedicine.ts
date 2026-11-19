"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { medicineService } from "../services/medicine.service";
import type { MedicineCreate, MedicineFilters, MedicineUpdate } from "@/types/medicine";

export function useMedicines(filters: MedicineFilters = {}) {
  return useQuery({
    queryKey: queryKeys.medicines.list(filters as Record<string, string | undefined>),
    queryFn: () => medicineService.list(filters),
  });
}

export function useAllMedicines(filters: MedicineFilters = {}) {
  return useQuery({
    queryKey: queryKeys.medicines.listAll(filters as Record<string, string | undefined>),
    queryFn: () => medicineService.listAll(filters),
  });
}

export function useMedicine(id: string) {
  return useQuery({
    queryKey: queryKeys.medicines.detail(id),
    queryFn: () => medicineService.get(id),
    enabled: !!id,
  });
}

export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MedicineCreate) => medicineService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all() });
    },
  });
}

export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MedicineUpdate }) =>
      medicineService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all() });
    },
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicineService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.medicines.all() });
    },
  });
}
