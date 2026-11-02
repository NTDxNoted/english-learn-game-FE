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
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.types';

export const authApi = {
  /**
   * Đăng ký tài khoản người học qua AWS Cognito
   * POST /api/auth/register
   */
  register: (data: RegisterRequest): Promise<ApiResponse<RegisterResponseData>> =>
    http.post<RegisterResponseData, RegisterRequest>('/auth/register', data),

  /**
   * Xác minh mã OTP kích hoạt tài khoản
   * POST /api/auth/confirm-register
   */
  confirmRegister: (data: ConfirmRegisterRequest): Promise<ApiResponse<null>> =>
    http.post<null, ConfirmRegisterRequest>('/auth/confirm-register', data),

  /**
   * Gửi lại mã OTP qua email
   * POST /api/auth/resend-confirmation
   */
  resendCode: (data: ResendCodeRequest): Promise<ApiResponse<null>> =>
    http.post<null, ResendCodeRequest>('/auth/resend-confirmation', data),

  /**
   * Đăng nhập người dùng bằng AWS Cognito qua backend bridge
   * POST /api/auth/login
   */
  login: (data: LoginRequest): Promise<ApiResponse<AuthTokens>> =>
    http.post<AuthTokens, LoginRequest>('/auth/login', data),

  /**
   * Làm mới access token từ refresh token
   * POST /api/auth/refresh
   */
  refreshToken: (data: RefreshTokenRequest): Promise<ApiResponse<AuthTokens>> =>
    http.post<AuthTokens, RefreshTokenRequest>('/auth/refresh', data),

  /**
   * Đăng xuất tài khoản người dùng (thu hồi refresh token qua Cognito GlobalSignOut)
   * POST /api/auth/logout
   */
  logout: (): Promise<ApiResponse<null>> =>
    http.post<null>('/auth/logout'),

  /**
   * Lấy thông tin tài khoản người dùng hiện tại (profile & role)
   * GET /api/users/me
   */
  getMe: (): Promise<ApiResponse<UserProfile>> =>
    http.get<UserProfile>('/users/me'),

  /**
   * Đồng bộ thông tin người dùng từ Cognito vào database
   * POST /api/auth/sync
   */
  syncUser: (): Promise<ApiResponse<UserProfile>> =>
    http.post<UserProfile>('/auth/sync'),

  /**
   * Yêu cầu gửi mã OTP khôi phục mật khẩu qua email
   * POST /api/auth/forgot-password
   */
  forgotPassword: (data: ForgotPasswordRequest): Promise<ApiResponse<null>> =>
    http.post<null, ForgotPasswordRequest>('/auth/forgot-password', data),

  /**
   * Đặt lại mật khẩu bằng mã OTP Cognito và mật khẩu mới
   * POST /api/auth/reset-password
   */
  resetPassword: (data: ResetPasswordRequest): Promise<ApiResponse<null>> =>
    http.post<null, ResetPasswordRequest>('/auth/reset-password', data),
};
