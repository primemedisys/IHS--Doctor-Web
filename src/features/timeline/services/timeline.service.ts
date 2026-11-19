import { api } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { DoctorPatientsResult, MyPatientsQuery, PatientStatus, TimelineFilters, TimelineResult } from "@/types/timeline";

const params = (f: TimelineFilters) => ({ year: f.year, month: f.month, sort: f.sort });

/**
 * A doctor's two ways into a patient's treatment history
 * (docs/treatment-timeline §5.3 / §5.4), plus the My Patients roster.
 *
 * The booking-keyed call takes NO patient id — the server derives the patient
 * from a booking the caller owns, so this path can't be pointed at anyone else.
 */
export const doctorTimelineService = {
  /** §5.3 — from an appointment or a live video consult. */
  async listByBooking(bookingId: string, filters: TimelineFilters = {}): Promise<TimelineResult> {
    const { data } = await api.get<ApiResponse<TimelineResult>>(
      API_ENDPOINTS.doctor.bookingPatientTimeline(bookingId),
      { params: params(filters) },
    );
    return data.data;
  },

  /** §5.4 — a named patient, reached from the roster. */
  async listByPatient(patientId: string, filters: TimelineFilters = {}): Promise<TimelineResult> {
    const { data } = await api.get<ApiResponse<TimelineResult>>(
      API_ENDPOINTS.doctor.patientTimeline(patientId),
      { params: params(filters) },
    );
    return data.data;
  },

  /** Everyone this doctor has consulted. */
  async myPatients(query?: MyPatientsQuery): Promise<DoctorPatientsResult> {
    const params = query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== "")) : undefined;
    const { data } = await api.get<ApiResponse<DoctorPatientsResult>>(API_ENDPOINTS.doctor.myPatients, { params });
    return data.data;
  },
  /** The doctor's manual status override for one of their patients. */
  async setPatientStatus(patientId: string, status: PatientStatus): Promise<void> {
    await api.patch(`${API_ENDPOINTS.doctor.myPatients}/${patientId}/status`, { status });
  },
};
