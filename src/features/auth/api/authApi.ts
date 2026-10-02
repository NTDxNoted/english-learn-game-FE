import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  RegisterRequest,
  RegisterResponseData,
  ConfirmRegisterRequest,
  ResendCodeRequest,
  LoginRequest,
  RefreshTokenRequest,
  AuthTokens,
  UserProfile,
} from '../types/auth.types';

export const authApi = {
  /**
   * Đăng ký tài khoản người học qua AWS Cognito
   * POST /api/v1/auth/register
   */
  register: (data: RegisterRequest): Promise<ApiResponse<RegisterResponseData>> =>
    http.post<RegisterResponseData, RegisterRequest>('/auth/register', data),

  /**
   * Xác minh mã OTP kích hoạt tài khoản
   * POST /api/v1/auth/confirm-register
   */
  confirmRegister: (data: ConfirmRegisterRequest): Promise<ApiResponse<null>> =>
    http.post<null, ConfirmRegisterRequest>('/auth/confirm-register', data),

  /**
   * Gửi lại mã OTP qua email
   * POST /api/v1/auth/resend-code
   */
  resendCode: (data: ResendCodeRequest): Promise<ApiResponse<null>> =>
    http.post<null, ResendCodeRequest>('/auth/resend-code', data),

  /**
   * Đăng nhập người dùng bằng AWS Cognito qua backend bridge
   * POST /api/v1/auth/login
   */
  login: (data: LoginRequest): Promise<ApiResponse<AuthTokens>> =>
    http.post<AuthTokens, LoginRequest>('/auth/login', data),

  /**
   * Làm mới access token từ refresh token
   * POST /api/v1/auth/refresh
   */
  refreshToken: (data: RefreshTokenRequest): Promise<ApiResponse<AuthTokens>> =>
    http.post<AuthTokens, RefreshTokenRequest>('/auth/refresh', data),

  /**
   * Lấy thông tin tài khoản người dùng hiện tại (profile & role)
   * GET /api/v1/users/me
   */
  getMe: (): Promise<ApiResponse<UserProfile>> =>
    http.get<UserProfile>('/users/me'),

  /**
   * Đồng bộ thông tin người dùng từ Cognito vào database
   * POST /api/v1/auth/sync
   */
  syncUser: (): Promise<ApiResponse<UserProfile>> =>
    http.post<UserProfile>('/auth/sync'),
};
