export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
  timestamp?: number;
}

export const createSuccessResponse = <T>(data: T, message = 'success'): ApiResponse<T> => ({
  code: 0,
  message,
  data,
});

export const isApiResponse = <T = unknown>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'number' && typeof record.message === 'string' && 'data' in record;
};

export const unwrapApiResponse = <T>(response: ApiResponse<T>): T => response.data;

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  pages?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
