/**
 * Định nghĩa chuẩn các cấu trúc API response theo hợp đồng Backend:
 * - Quy ước: JSON dùng camelCase, base path: /api/v1
 * - Múi giờ chuẩn: ISO-8601 kèm múi giờ (Asia/Ho_Chi_Minh)
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiFieldError {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors: ApiFieldError[];
  timestamp: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export type CommonErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'ACCOUNT_LOCKED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | (string & {});

export class ApiError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly errors: ApiFieldError[];
  public readonly timestamp?: string;

  constructor(errorResponse: Partial<ApiErrorResponse>, statusCode = 500) {
    super(errorResponse.message || 'Đã có lỗi xảy ra');
    this.name = 'ApiError';
    this.errorCode = errorResponse.errorCode || 'INTERNAL_ERROR';
    this.statusCode = statusCode;
    this.errors = errorResponse.errors || [];
    this.timestamp = errorResponse.timestamp;
  }
}
