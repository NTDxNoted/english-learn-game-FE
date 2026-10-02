import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiError, type ApiErrorResponse, type ApiResponse } from '../types/api.types';
import type { AuthTokens } from '../types/auth.types';
import { tokenStorage } from './tokenStorage';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

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
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Hàng đợi xử lý làm mới token (Token Refresh Mutex / Queue)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Response Interceptor: Bóc data và tự động làm mới token Cognito khi hết hạn
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorCode = errorData?.errorCode;
    const requestUrl = originalRequest?.url || '';

    // Không kích hoạt cơ chế refresh token hoặc session expired cho các endpoint công khai auth
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/confirm-register') ||
      requestUrl.includes('/auth/resend-code') ||
      requestUrl.includes('/auth/refresh');

    // Kiểm tra nếu là lỗi hết hạn token (TOKEN_EXPIRED hoặc 401 khi đã có token)
    const isTokenExpired =
      !isAuthEndpoint &&
      status === 401 &&
      (errorCode === 'TOKEN_EXPIRED' || tokenStorage.hasAccessToken());

    if (originalRequest && isTokenExpired && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefreshToken();

      // Nếu không có refresh token thì chuyển hướng thẳng về login
      if (!refreshToken) {
        tokenStorage.notifyUnauthorized();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?sessionExpired=true';
        }
        return Promise.reject(
          new ApiError(errorData || { message: 'Phiên đăng nhập đã hết hạn', errorCode: 'TOKEN_EXPIRED' }, 401),
        );
      }

      if (isRefreshing) {
        // Nếu đang trong tiến trình làm mới token, đẩy request vào hàng đợi
        return new Promise<unknown>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi backend refresh token (AWS Cognito via backend bridge)
        const refreshResponse = await axios.post<ApiResponse<AuthTokens>>(
          `${baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const newTokens = refreshResponse.data.data;
        // TUYỆT ĐỐI CHỈ LƯU accessToken & refreshToken, KHÔNG LƯU idToken
        tokenStorage.setAccessToken(newTokens.accessToken);
        if (newTokens.refreshToken) {
          tokenStorage.setRefreshToken(newTokens.refreshToken);
        }

        processQueue(null, newTokens.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.notifyUnauthorized();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?sessionExpired=true';
        }
        return Promise.reject(
          new ApiError(
            {
              success: false,
              message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
              errorCode: 'REFRESH_TOKEN_INVALID',
              errors: [],
              timestamp: new Date().toISOString(),
            },
            401,
          ),
        );
      } finally {
        isRefreshing = false;
      }
    }

    // Các lỗi 401 khác mà không thể refresh (ngoại trừ các endpoint auth công khai)
    if (!isAuthEndpoint && status === 401 && !originalRequest?._retry) {
      tokenStorage.notifyUnauthorized();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?sessionExpired=true';
      }
    }

    if (errorData && typeof errorData === 'object' && 'errorCode' in errorData) {
      return Promise.reject(new ApiError(errorData, status ?? 500));
    }

    const fallbackError: Partial<ApiErrorResponse> = {
      success: false,
      message: error.message || 'Lỗi kết nối tới máy chủ',
      errorCode: status === 403 ? 'FORBIDDEN' : 'NETWORK_ERROR',
      errors: [],
      timestamp: new Date().toISOString(),
    };

    return Promise.reject(new ApiError(fallbackError, status ?? 500));
  },
);

export const http = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }) as unknown as Promise<ApiResponse<T>>,

  post: <T, B = unknown>(url: string, data?: B): Promise<ApiResponse<T>> =>
    apiClient.post(url, data) as unknown as Promise<ApiResponse<T>>,

  put: <T, B = unknown>(url: string, data?: B): Promise<ApiResponse<T>> =>
    apiClient.put(url, data) as unknown as Promise<ApiResponse<T>>,

  patch: <T, B = unknown>(url: string, data?: B): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data) as unknown as Promise<ApiResponse<T>>,

  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url) as unknown as Promise<ApiResponse<T>>,
};
