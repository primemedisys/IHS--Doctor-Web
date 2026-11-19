import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  Appointment,
  AppointmentDetail,
  AppointmentFilters,
  ClinicalNote,
  ClinicalNoteInput,
  PatientVitalsInput,
  VitalsMatrix,
} from "@/types/appointment";

/**
 * The doctor's appointments API (`/doctor/bookings`). The patient snapshot on
 * the detail endpoint is only populated by the backend for confirmed/completed
 * bookings (README §5.2); the actions flip payment/lifecycle state.
 */
export const appointmentService = {
  /** The doctor's appointments, filtered by status/date/clinic. */
  listAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null && v !== ""),
    );
    return requestData<Appointment[]>(
      api.get<ApiResponse<Appointment[]>>(API_ENDPOINTS.doctor.bookings, { params }),
    );
  },

  /** One appointment + the patient snapshot (null until confirmed/completed). */
  getAppointment(id: string): Promise<AppointmentDetail> {
    return requestData<AppointmentDetail>(
      api.get<ApiResponse<AppointmentDetail>>(API_ENDPOINTS.doctor.booking(id)),
    );
  },

  /** Record an at-clinic cash payment: pending_at_clinic → success. */
  markPaid(id: string): Promise<Appointment> {
    return requestData<Appointment>(
      api.post<ApiResponse<Appointment>>(API_ENDPOINTS.doctor.bookingMarkPaid(id)),
    );
  },

  /** Mark a confirmed booking completed (or a no-show). */
  complete(id: string, noShow = false): Promise<Appointment> {
    return requestData<Appointment>(
      api.post<ApiResponse<Appointment>>(API_ENDPOINTS.doctor.bookingComplete(id), { noShow }),
    );
  },

  /**
   * Move a confirmed appointment to another time. Only the time changes — the
   * server reads mode, clinic, patient and fee off the existing booking and
   * validates the new slot exactly as a patient booking is validated.
   */
  reschedule(id: string, body: { date: string; startTime: string; reason?: string | null }) {
    return requestData<{ booking: Appointment; from: { date: string; startTime: string } }>(
      api.post<ApiResponse<{ booking: Appointment; from: { date: string; startTime: string } }>>(
        API_ENDPOINTS.doctor.bookingReschedule(id),
        body,
      ),
    );
  },

  /**
   * Free slot start times the doctor offers on a date — the reschedule picker.
   *
   * Translates the app's booking vocabulary to the availability endpoint's:
   * the app says `video`, availability says `online`. And `clinicId` is
   * FORBIDDEN by that endpoint when the mode is online (not merely optional),
   * so it is omitted rather than sent as null — sending it 422s.
   */
  availableSlots(
    doctorId: string,
    params: { mode: "clinic" | "video"; date: string; clinicId?: string | null },
  ) {
    const isOnline = params.mode === "video";
    return requestData<{ slots: string[] }>(
      api.get<ApiResponse<{ slots: string[] }>>(API_ENDPOINTS.doctors.slots(doctorId), {
        params: {
          mode: isOnline ? "online" : "clinic",
          date: params.date,
          ...(isOnline ? {} : { clinicId: params.clinicId }),
        },
      }),
    );
  },

  /** Every clinical note for this booking's patient, newest first. */
  listClinicalNotes(bookingId: string): Promise<ClinicalNote[]> {
    return requestData<ClinicalNote[]>(
      api.get<ApiResponse<ClinicalNote[]>>(API_ENDPOINTS.doctor.bookingClinicalNotes(bookingId)),
    );
  },

  /** Append a new clinical note to this booking's patient. */
  addClinicalNote(bookingId: string, body: ClinicalNoteInput): Promise<ClinicalNote> {
    return requestData<ClinicalNote>(
      api.post<ApiResponse<ClinicalNote>>(API_ENDPOINTS.doctor.bookingClinicalNotes(bookingId), body),
    );
  },

  /** The patient's self-recorded vitals timeline (the record-table matrix). */
  getPatientVitals(bookingId: string): Promise<VitalsMatrix> {
    return requestData<VitalsMatrix>(
      api.get<ApiResponse<VitalsMatrix>>(API_ENDPOINTS.doctor.bookingPatientVitals(bookingId)),
    );
  },

  /** Append a doctor-recorded reading; returns the refreshed matrix. */
  addPatientVitals(bookingId: string, body: PatientVitalsInput): Promise<VitalsMatrix> {
    return requestData<VitalsMatrix>(
      api.post<ApiResponse<VitalsMatrix>>(API_ENDPOINTS.doctor.bookingPatientVitals(bookingId), body),
    );
  },

  /**
   * Correct the DATE a patient's document speaks for (a prescription uploaded
   * today may be dated weeks back). Date only — the file and its label stay
   * the uploader's.
   */
  updatePatientRecordDate(bookingId: string, recordId: string, recordDate: string) {
    return requestData<unknown>(
      api.patch<ApiResponse<unknown>>(
        API_ENDPOINTS.doctor.bookingPatientRecord(bookingId, recordId),
        { recordDate },
      ),
    );
  },
};
