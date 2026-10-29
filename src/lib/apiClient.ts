import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from 'axios';
import { ApiError, type ApiErrorResponse, type ApiResponse } from '../types/api.types';
import type { AuthTokens } from '../types/auth.types';
import { tokenStorage } from './tokenStorage';
import { normalizeApiError } from './normalizeApiError';

const baseURL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/+$/, '');

const publicAuthPaths = new Set([
  '/auth/login',
  '/auth/google',
  '/auth/register',
  '/auth/confirm-register',
  '/auth/resend-confirmation',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
]);

const isPublicAuthRequest = (url = ''): boolean => {
  const pathname = url.split(/[?#]/)[0]?.replace(/\/+$/, '') || '';
  return [...publicAuthPaths].some((path) => pathname === path || pathname.endsWith(`/api${path}`));
};

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Gắn JWT access token của AWS Cognito vào header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomRequestConfig;
    customConfig._sessionRevision ??= tokenStorage.getRevision();
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) config.headers.delete('Content-Type');
    if (isPublicAuthRequest(config.url)) {
      config.headers.delete('Authorization');
    } else if (customConfig._explicitAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${customConfig._explicitAccessToken}`;
    } else {
      const token = tokenStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

let refreshInFlight: Promise<string> | null = null;

const endSession = (blocked = false) => {
  tokenStorage.notifyUnauthorized();
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/callback')
  ) {
    window.location.href = blocked ? '/login?accountBlocked=true' : '/login?sessionExpired=true';
  }
};

export interface RequestConfigWithAuth extends AxiosRequestConfig {
  _explicitAccessToken?: string;
  _skipAuthRefresh?: boolean;
}

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionRevision?: number;
  _explicitAccessToken?: string;
  _skipAuthRefresh?: boolean;
}

// Response Interceptor: Bóc data và tự động chuẩn hóa DTO từ Spring Boot backend
apiClient.interceptors.response.use(
  (response) => {
    const raw = response.data;
    // Nếu response đã có cấu trúc bọc { success, data }
    if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
      return raw;
    }
    // Nếu Spring Boot trả về DTO trực tiếp (List, Object, Void)
    return {
      success: true,
      data: raw,
      message: (raw && typeof raw === 'object' && 'message' in raw && typeof (raw as { message?: unknown }).message === 'string')
        ? (raw as { message: string }).message
        : 'Thành công',
      timestamp: new Date().toISOString(),
    };
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;
    const normalized = normalizeApiError(error);
    const publicRequest = isPublicAuthRequest(originalRequest?.url);
    const skipRefresh = Boolean(originalRequest?._skipAuthRefresh);
    if (originalRequest?._sessionRevision !== undefined && originalRequest._sessionRevision !== tokenStorage.getRevision()) {
      return Promise.reject(normalized);
    }
    if (normalized.errorCode === 'ACCOUNT_BLOCKED') {
      endSession(true);
      return Promise.reject(normalized);
    }
    if (originalRequest && !publicRequest && !skipRefresh && normalized.statusCode === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        endSession();
        return Promise.reject(normalized);
      }
      originalRequest._retry = true;
      if (!refreshInFlight) {
        const revision = tokenStorage.getRevision();
        refreshInFlight = (async () => {
          try {
            const response = await axios.post<AuthTokens>(
              baseURL + '/auth/refresh', { refreshToken },
              { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
            );
            if (revision !== tokenStorage.getRevision()) throw new ApiError({ message: 'Phiên đã kết thúc', errorCode: 'SESSION_ENDED' }, 401);
            if (!response.data.accessToken) throw new ApiError({ message: 'Phản hồi refresh không hợp lệ', errorCode: 'REFRESH_TOKEN_INVALID' }, 401);
            tokenStorage.setTokens(response.data);
            return response.data.accessToken;
          } catch (refreshError) {
            const failure = refreshError instanceof ApiError ? refreshError : normalizeApiError(refreshError);
            if (revision === tokenStorage.getRevision()) {
              if (failure.errorCode === 'ACCOUNT_BLOCKED') endSession(true);
              else if (failure.statusCode === 400 || failure.statusCode === 401) endSession();
            }
            throw failure;
          } finally {
            refreshInFlight = null;
          }
        })();
      }
      try {
        const token = await refreshInFlight;
        originalRequest.headers.Authorization = 'Bearer ' + token;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    if (!publicRequest && !skipRefresh && normalized.statusCode === 401) endSession();
    return Promise.reject(normalized);
  },
);

export const http = {
  get: <T>(url: string, params?: Record<string, unknown>, options?: RequestConfigWithAuth): Promise<ApiResponse<T>> =>
    apiClient.get(url, { ...options, params }) as unknown as Promise<ApiResponse<T>>,
  post: <T, B = unknown>(url: string, data?: B, options?: RequestConfigWithAuth): Promise<ApiResponse<T>> =>
    apiClient.post(url, data, options) as unknown as Promise<ApiResponse<T>>,
  put: <T, B = unknown>(url: string, data?: B, options?: RequestConfigWithAuth): Promise<ApiResponse<T>> =>
    apiClient.put(url, data, options) as unknown as Promise<ApiResponse<T>>,
  patch: <T, B = unknown>(url: string, data?: B, options?: RequestConfigWithAuth): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data, options) as unknown as Promise<ApiResponse<T>>,
  delete: <T = void>(url: string, options?: RequestConfigWithAuth): Promise<ApiResponse<T>> =>
    apiClient.delete(url, options) as unknown as Promise<ApiResponse<T>>,
};
