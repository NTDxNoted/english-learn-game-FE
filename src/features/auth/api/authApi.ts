import axios from 'axios';
import { http } from '../../../lib/apiClient';
import { ApiError, type ApiResponse } from '../../../types/api.types';
import type {
  RegisterRequest,
  RegisterResponseData,
  ConfirmRegisterRequest,
  ResendCodeRequest,
  LoginRequest,
  GoogleCodeExchangeRequest,
  RefreshTokenRequest,
  AuthTokens,
  UserProfile,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.types';

const DEFAULT_COGNITO_DOMAIN = 'https://us-east-1i2fjaym0t.auth.us-east-1.amazoncognito.com';
const DEFAULT_COGNITO_CLIENT_ID = '2ggkvcbqmfdbni8n7fe1g83sqm';
const DEFAULT_COGNITO_SCOPES = 'openid email profile aws.cognito.signin.user.admin';

export const GOOGLE_OAUTH_TX_STORAGE_KEY = 'signly_google_oauth_tx';
export const GOOGLE_OAUTH_TX_MAX_AGE_MS = 15 * 60 * 1000;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export interface GoogleOAuthTransaction {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
  returnTo?: string;
}

const getCognitoDomain = (): string =>
  ((import.meta.env.VITE_COGNITO_DOMAIN as string | undefined) || DEFAULT_COGNITO_DOMAIN).replace(/\/+$/, '');

const getCognitoClientId = (): string =>
  (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined) || DEFAULT_COGNITO_CLIENT_ID;

export const getCognitoRedirectUri = (): string => {
  const configured = (import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined)?.trim();
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/callback`;
  }
  return 'http://localhost:3000/callback';
};

export const getCognitoScopes = (): string => {
  const configured = (import.meta.env.VITE_COGNITO_SCOPES as string | undefined)
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  return configured || DEFAULT_COGNITO_SCOPES;
};

export const sanitizeReturnTo = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.startsWith('/login') ||
    trimmed.startsWith('/callback')
  ) {
    return undefined;
  }
  return trimmed;
};


const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const generateRandomBase64Url = (byteLength = 32): string => {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new ApiError(
      {
        message: 'Trình duyệt không hỗ trợ tạo mã bảo mật PKCE (Web Crypto API).',
        errorCode: 'PKCE_UNSUPPORTED',
      },
      400,
    );
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};


export const computeCodeChallengeS256 = async (codeVerifier: string): Promise<string> => {
  if (typeof globalThis.crypto?.subtle?.digest !== 'function') {
    throw new ApiError(
      {
        message: 'Trình duyệt không hỗ trợ mã hóa SHA-256 cho PKCE.',
        errorCode: 'PKCE_UNSUPPORTED',
      },
      400,
    );
  }
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
};


export const saveGoogleOAuthTransaction = (tx: GoogleOAuthTransaction): void => {
  if (typeof sessionStorage === 'undefined') {
    throw new ApiError(
      {
        message: 'Không thể lưu phiên giao dịch Google (sessionStorage bị tắt).',
        errorCode: 'STORAGE_UNAVAILABLE',
      },
      400,
    );
  }
  sessionStorage.setItem(GOOGLE_OAUTH_TX_STORAGE_KEY, JSON.stringify(tx));
};


export const readGoogleOAuthTransaction = (): GoogleOAuthTransaction | null => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(GOOGLE_OAUTH_TX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthTransaction>;
    if (
      typeof parsed?.state !== 'string' ||
      typeof parsed?.codeVerifier !== 'string' ||
      typeof parsed?.redirectUri !== 'string' ||
      typeof parsed?.createdAt !== 'number'
    ) {
      return null;
    }
    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      redirectUri: parsed.redirectUri,
      createdAt: parsed.createdAt,
      returnTo: sanitizeReturnTo(parsed.returnTo),
    };
  } catch {
    return null;
  }
};

export const clearGoogleOAuthTransaction = (): void => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(GOOGLE_OAUTH_TX_STORAGE_KEY);
    }
  } catch {
    // Ignore storage removal errors
  }
};


export interface GoogleLoginFlowResult {
  tokens: AuthTokens;
  profile: UserProfile;
  returnTo?: string;
}

const inFlightGoogleFlows = new Map<string, Promise<GoogleLoginFlowResult>>();
const completedGoogleFlows = new Map<string, GoogleLoginFlowResult>();

export const resetGoogleOAuthCoordinator = (): void => {
  inFlightGoogleFlows.clear();
  completedGoogleFlows.clear();
  clearGoogleOAuthTransaction();
};

interface CognitoOAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export const authApi = {
  /**
   * Tạo URL chuyển hướng đăng nhập với Google qua AWS Cognito Hosted UI OAuth2
   */
  getGoogleAuthorizeUrl: (
    redirectUri: string = getCognitoRedirectUri(),
    state?: string,
    codeChallenge?: string,
  ): string => {
    const params = new URLSearchParams({
      response_type: 'code',
      identity_provider: 'Google',
      client_id: getCognitoClientId(),
      redirect_uri: redirectUri,
      scope: getCognitoScopes(),
    });
    if (state) {
      params.set('state', state);
    }
    if (codeChallenge) {
      params.set('code_challenge_method', 'S256');
      params.set('code_challenge', codeChallenge);
    }
    return `${getCognitoDomain()}/oauth2/authorize?${params.toString()}`;
  },

  startGoogleLogin: async (returnTo?: string | null): Promise<string> => {
    resetGoogleOAuthCoordinator();
    const state = generateRandomBase64Url(24);
    const codeVerifier = generateRandomBase64Url(32);
    const codeChallenge = await computeCodeChallengeS256(codeVerifier);
    const redirectUri = getCognitoRedirectUri();

    saveGoogleOAuthTransaction({
      state,
      codeVerifier,
      redirectUri,
      createdAt: Date.now(),
      returnTo: sanitizeReturnTo(returnTo),
    });

    return authApi.getGoogleAuthorizeUrl(redirectUri, state, codeChallenge);
  },

  /**
   * Đổi OAuth2 authorization code từ Google/Cognito sang bộ AuthTokens
   * Ưu tiên gọi Backend POST /api/auth/google và fallback sang Cognito /oauth2/token
   */
  exchangeGoogleCode: async (data: GoogleCodeExchangeRequest): Promise<ApiResponse<AuthTokens>> => {
    try {
      return await http.post<AuthTokens, GoogleCodeExchangeRequest>('/auth/google', data);
    } catch {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: getCognitoClientId(),
        code: data.code,
        redirect_uri: data.redirectUri,
      });

      const response = await axios.post<CognitoOAuthTokenResponse>(
        `${getCognitoDomain()}/oauth2/token`,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        },
      );

      const payload = response.data;
      if (!payload?.access_token) {
        throw new ApiError(
          {
            message: payload?.error_description || 'Không nhận được access token từ Google OAuth.',
            errorCode: payload?.error || 'GOOGLE_AUTH_FAILED',
          },
          401,
        );
      }

      return {
        success: true,
        data: {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          idToken: payload.id_token,
          tokenType: payload.token_type || 'Bearer',
          expiresIn: payload.expires_in ?? 3600,
        },
        message: 'Đăng nhập Google thành công',
        timestamp: new Date().toISOString(),
      };
    }
  },

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
