// Shared, app-wide API response shapes. These mirror the backend contract
// described in PROJECT.md (section 6) and CLAUDE.md (TypeScript Guidelines).

export interface IApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface IPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: IPagination;
}
