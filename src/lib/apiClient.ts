import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ApiError, type ApiErrorResponse, type ApiResponse } from '../types/api.types';
import { tokenStorage } from './tokenStorage';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Gắn JWT token vào header
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

// Response Interceptor: Bóc data và chuẩn hóa lỗi thành ApiError
apiClient.interceptors.response.use(
  (response) => {
    // Trả về response.data là ApiResponse<T>
    return response.data;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Khi nhận 401 (TOKEN_EXPIRED hoặc UNAUTHORIZED): xóa token, thông báo và điều hướng về /login
    if (status === 401) {
      tokenStorage.notifyUnauthorized();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?sessionExpired=true';
      }
    }

    if (errorData && typeof errorData === 'object' && 'errorCode' in errorData) {
      return Promise.reject(new ApiError(errorData, status ?? 500));
    }

    // Trường hợp lỗi mạng (Network Error) hoặc server crash không trả về format chuẩn
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

/**
 * Helper types và methods thuận tiện cho việc gọi API có kiểu dữ liệu an toàn
 */
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
