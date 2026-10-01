export type UserRole = 'learner' | 'admin';

export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  status?: UserStatus;
  currentStreak?: number;
  createdAt?: string;
}

/**
 * Token do AWS Cognito cấp qua Backend API
 * - accessToken: Dùng làm Bearer token cho mọi API có xác thực
 * - refreshToken: Dùng để gọi POST /api/v1/auth/refresh khi accessToken hết hạn (60 phút)
 * - idToken: Không dùng làm Bearer token (backend từ chối)
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresIn: number;
}

export interface RegisterResponseData {
  email: string;
  codeDeliveryDestination: string;
  userConfirmed: boolean;
}
