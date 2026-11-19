"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { prescriptionTemplateService } from "../services/prescriptionTemplate.service";
import type { TemplateAssetKind, TemplateUpdate } from "@/types/prescription";

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.prescriptionTemplates.list(),
    queryFn: () => prescriptionTemplateService.list(),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.prescriptionTemplates.detail(id),
    queryFn: () => prescriptionTemplateService.get(id),
    enabled: !!id,
  });
}

/** Invalidate the detail (always) and the list (when a summary field moved). */
function useTemplateInvalidator() {
  const qc = useQueryClient();
  return (id?: string) => {
    if (id) qc.invalidateQueries({ queryKey: queryKeys.prescriptionTemplates.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.prescriptionTemplates.list() });
  };
}

export function useCreateTemplate() {
  const invalidate = useTemplateInvalidator();
  return useMutation({
    mutationFn: (body: TemplateUpdate & { name: string }) => prescriptionTemplateService.create(body),
    onSuccess: (t) => invalidate(t.id),
  });
}

/**
 * The editor's autosave target. `onSuccess` writes the server's canonical row
 * straight into the cache instead of invalidating: an invalidate would refetch
 * mid-typing and yank the form back to a stale value.
 */
export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TemplateUpdate) => prescriptionTemplateService.update(id, body),
    onSuccess: (t) => {
      qc.setQueryData(queryKeys.prescriptionTemplates.detail(id), t);
      qc.invalidateQueries({ queryKey: queryKeys.prescriptionTemplates.list() });
    },
  });
}

export function useDeleteTemplate() {
  const invalidate = useTemplateInvalidator();
  return useMutation({
    mutationFn: (id: string) => prescriptionTemplateService.remove(id),
    onSuccess: () => invalidate(),
  });
}

export function useSetDefaultTemplate() {
  const invalidate = useTemplateInvalidator();
  return useMutation({
    mutationFn: (id: string) => prescriptionTemplateService.setDefault(id),
    onSuccess: (t) => invalidate(t.id),
  });
}

export function useDuplicateTemplate() {
  const invalidate = useTemplateInvalidator();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; clinicId?: string | null }) =>
      prescriptionTemplateService.duplicate(id, body),
    onSuccess: (t) => invalidate(t.id),
  });
}

export function useUploadAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, file }: { kind: TemplateAssetKind; file: File }) =>
      prescriptionTemplateService.putAsset(id, kind, file),
    onSuccess: (t) => {
      qc.setQueryData(queryKeys.prescriptionTemplates.detail(id), t);
      qc.invalidateQueries({ queryKey: queryKeys.prescriptionTemplates.list() });
    },
  });
}

export function useRemoveAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: TemplateAssetKind) => prescriptionTemplateService.removeAsset(id, kind),
    onSuccess: (t) => qc.setQueryData(queryKeys.prescriptionTemplates.detail(id), t),
  });
}

/**
 * The server-rendered preview. Keyed on `updatedAt`, so clicking Preview right
 * after an autosave lands fetches a fresh render, and clicking it twice with no
 * edits serves from cache — each render costs a Chromium page.
 */
export function useTemplatePreview(id: string, updatedAt: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.prescriptionTemplates.preview(id, updatedAt),
    queryFn: () => prescriptionTemplateService.previewPdf(id),
    enabled: enabled && !!id,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
}
