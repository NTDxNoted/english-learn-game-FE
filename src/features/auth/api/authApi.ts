import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  RegisterRequest,
  RegisterResponseData,
  ConfirmRegisterRequest,
  ResendCodeRequest,
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
};
