import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type {
  AcquisitionDetail,
  AnalyticsOverview,
  AnalyticsTrends,
  AppointmentsDetail,
  AppointmentsParams,
  DateRange,
  FinancialDetail,
  FinancialParams,
  PatientsDetail,
  PatientsParams,
  ProductivityDetail,
  QualityDetail,
  SeriesParams,
} from "../types";

/** Drop empty filters so the server applies its own defaults (and Joi doesn't reject ""). */
const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ""));

function get<T>(url: string, params: object): Promise<T> {
  return requestData<T>(api.get<ApiResponse<T>>(url, { params: clean(params) }));
}

const E = API_ENDPOINTS.doctor;

/** Doctor Dashboard 2.0 — `/doctor/analytics/*` (the doctor is pinned server-side). */
export const analyticsService = {
  overview: (range: DateRange) => get<AnalyticsOverview>(E.analyticsOverview, range),
  trends: (p: SeriesParams) => get<AnalyticsTrends>(E.analyticsTrends, p),
  patients: (p: PatientsParams) => get<PatientsDetail>(E.analyticsPatients, p),
  appointments: (p: AppointmentsParams) => get<AppointmentsDetail>(E.analyticsAppointments, p),
  financial: (p: FinancialParams) => get<FinancialDetail>(E.analyticsFinancial, p),
  quality: (p: SeriesParams) => get<QualityDetail>(E.analyticsQuality, p),
  productivity: (p: SeriesParams) => get<ProductivityDetail>(E.analyticsProductivity, p),
  acquisition: (p: SeriesParams) => get<AcquisitionDetail>(E.analyticsAcquisition, p),
};
