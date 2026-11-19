/** Cross-cutting types shared by every feature's service/hook layer. */

/** Standard envelope returned by the backend for a single resource. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Page metadata for list endpoints. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Standard envelope for paginated collections. */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

/** Common query params accepted by list endpoints. */
export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Normalized API error shape produced by our axios error interceptor. */
export interface ApiError {
  status: number;
  message: string;
  /** Field-level validation messages, keyed by form field. */
  errors?: Record<string, string[]>;
}

/** ISO-8601 timestamp string. */
export type ISODateString = string;

/** An entity with the usual audit fields. */
export interface BaseEntity {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type Nullable<T> = T | null;
