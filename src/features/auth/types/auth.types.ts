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

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresIn: number;
}

// Request & Response payload cho AUTH-01
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterResponseData {
  email: string;
  codeDeliveryDestination: string;
  userConfirmed: boolean;
}

export interface ConfirmRegisterRequest {
  email: string;
  code: string;
}

export interface ResendCodeRequest {
  email: string;
}

// Request & Response payload cho AUTH-02
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Context type cho AUTH-03
export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokens, profile?: UserProfile) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
}

// Request & Response payload cho AUTH-04
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}
