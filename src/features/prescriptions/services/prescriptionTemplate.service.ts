import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  PrescriptionTemplate,
  PrescriptionTemplateSummary,
  TemplateAssetKind,
  TemplateUpdate,
} from "@/types/prescription";

/**
 * The doctor's letterhead templates (`/doctor/prescription-templates`).
 * Thin wrappers — no logic. The JSON blobs are replaced wholesale on PATCH.
 */
export const prescriptionTemplateService = {
  list(): Promise<PrescriptionTemplateSummary[]> {
    return requestData<PrescriptionTemplateSummary[]>(
      api.get<ApiResponse<PrescriptionTemplateSummary[]>>(API_ENDPOINTS.doctor.prescriptionTemplates),
    );
  },

  get(id: string): Promise<PrescriptionTemplate> {
    return requestData<PrescriptionTemplate>(
      api.get<ApiResponse<PrescriptionTemplate>>(API_ENDPOINTS.doctor.prescriptionTemplate(id)),
    );
  },

  create(body: TemplateUpdate & { name: string }): Promise<PrescriptionTemplate> {
    return requestData<PrescriptionTemplate>(
      api.post<ApiResponse<PrescriptionTemplate>>(API_ENDPOINTS.doctor.prescriptionTemplates, body),
    );
  },

  update(id: string, body: TemplateUpdate): Promise<PrescriptionTemplate> {
    return requestData<PrescriptionTemplate>(
      api.patch<ApiResponse<PrescriptionTemplate>>(API_ENDPOINTS.doctor.prescriptionTemplate(id), body),
    );
  },

  remove(id: string): Promise<{ id: string }> {
    return requestData<{ id: string }>(
      api.delete<ApiResponse<{ id: string }>>(API_ENDPOINTS.doctor.prescriptionTemplate(id)),
    );
  },

  setDefault(id: string): Promise<PrescriptionTemplate> {
    return requestData<PrescriptionTemplate>(
      api.post<ApiResponse<PrescriptionTemplate>>(API_ENDPOINTS.doctor.prescriptionTemplateDefault(id)),
    );
  },

  duplicate(id: string, body: { name: string; clinicId?: string | null }): Promise<PrescriptionTemplate> {
    return requestData<PrescriptionTemplate>(
      api.post<ApiResponse<PrescriptionTemplate>>(
        API_ENDPOINTS.doctor.prescriptionTemplateDuplicate(id),
        body,
      ),
    );
  },

  /**
   * Upload/replace a logo, watermark or signature. Content-Type is deliberately
   * NOT set — axios must add the multipart boundary itself (services/api.ts
   * strips the JSON default for FormData bodies).
   */
  putAsset(id: string, kind: TemplateAssetKind, file: File): Promise<PrescriptionTemplate> {
    const form = new FormData();
    /*
     * NOT compressed, deliberately.
     *
     * These are letterhead assets — a logo, a watermark, a signature — and the
     * compressor re-encodes to JPEG, which has no alpha channel. A signature
     * PNG would come back with a white box behind it and print that way on
     * every prescription. They are also small by nature, so there is nothing to
     * gain. Compression belongs on patient PHOTOS, not on brand artwork.
     */
    form.append("file", file);
    form.append("kind", kind);
    return requestData<PrescriptionTemplate>(
      api.post<ApiResponse<PrescriptionTemplate>>(API_ENDPOINTS.doctor.prescriptionTemplateAssets(id), form),
    );
  },

  removeAsset(id: string, kind: TemplateAssetKind): Promise<PrescriptionTemplate> {
    return requestData<PrescriptionTemplate>(
      api.delete<ApiResponse<PrescriptionTemplate>>(
        API_ENDPOINTS.doctor.prescriptionTemplateAsset(id, kind),
      ),
    );
  },

  /** The server-rendered letterhead with sample data — the authority on layout. */
  async previewPdf(id: string): Promise<Blob> {
    const res = await api.get(API_ENDPOINTS.doctor.prescriptionTemplatePreview(id), {
      responseType: "blob",
    });
    return res.data as Blob;
  },
};
