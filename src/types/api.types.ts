/**
 * Định nghĩa chuẩn các cấu trúc API response theo hợp đồng Backend:
 * - Quy ước: JSON dùng camelCase, base path: /api/v1
 * - Xác thực: AWS Cognito User Pool thông qua Backend bridge (Frontend KHÔNG gọi trực tiếp AWS SDK)
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

/**
 * Danh sách mã lỗi chuẩn hóa từ Backend và AWS Cognito
 */
export type CommonErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'ACCOUNT_LOCKED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  // AWS Cognito error mappings
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'TOO_MANY_REQUESTS'
  | 'COGNITO_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'PASSWORD_RESET_REQUIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'CHALLENGE_NOT_SUPPORTED'
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
