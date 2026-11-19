import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { ApiResponse } from "@/types/common";
import type { Appointment } from "@/types/appointment";
import type {
  DoctorDashboardSummary,
  EarningsSeries,
  EarningsSummary,
  LedgerPage,
  Period,
} from "@/types/dashboard";

/** Drop undefined bounds so the server applies its own defaults. */
const periodParams = (p: Period) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ""));

export const dashboardService = {
  /** The doctor's tiles. `averageRating` is always null until reviews exist. */
  getSummary(): Promise<DoctorDashboardSummary> {
    return requestData<DoctorDashboardSummary>(
      api.get<ApiResponse<DoctorDashboardSummary>>(API_ENDPOINTS.doctor.dashboardSummary),
    );
  },

  /** Today's schedule (IST), confirmed + completed. */
  getToday(): Promise<Appointment[]> {
    return requestData<Appointment[]>(
      api.get<ApiResponse<Appointment[]>>(API_ENDPOINTS.doctor.dashboardToday),
    );
  },
};

export const earningsService = {
  /** Period totals. `gross === commission + net` always holds. */
  getSummary(period: Period): Promise<EarningsSummary> {
    return requestData<EarningsSummary>(
      api.get<ApiResponse<EarningsSummary>>(API_ENDPOINTS.doctor.earningsSummary, {
        params: periodParams(period),
      }),
    );
  },

  /**
   * The chart series. Already zero-filled by the server: a bucket with no
   * payments is present with zeros, so never fill gaps or sort client-side.
   */
  getSeries(period: Period): Promise<EarningsSeries> {
    return requestData<EarningsSeries>(
      api.get<ApiResponse<EarningsSeries>>(API_ENDPOINTS.doctor.earningsSeries, {
        params: periodParams(period),
      }),
    );
  },

  /** The paginated ledger. Summing `net` across all pages equals summary.net. */
  getTransactions(period: Period, page: number, limit = 20): Promise<LedgerPage> {
    return requestData<LedgerPage>(
      api.get<ApiResponse<LedgerPage>>(API_ENDPOINTS.doctor.earningsTransactions, {
        params: { ...periodParams(period), page, limit },
      }),
    );
  },
};
