import axios from 'axios';
import { ApiError } from '../types/api.types';

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) return new ApiError({ message: error instanceof Error ? error.message : 'Đã có lỗi xảy ra' }, 500);
  const status = error.response?.status ?? 0;
  const body: unknown = error.response?.data;
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const fallback: Record<number, string> = {
    0: 'Không thể kết nối máy chủ. Kiểm tra kết nối rồi thử lại.',
    400: 'Dữ liệu gửi lên chưa hợp lệ.', 401: 'Phiên đăng nhập không hợp lệ.',
    403: 'Bạn không có quyền thực hiện thao tác này.', 404: 'Không tìm thấy dữ liệu.',
    409: 'Dữ liệu bị trùng hoặc trạng thái đã thay đổi.', 413: 'File vượt giới hạn tải lên.',
    429: 'Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.',
    502: 'Dịch vụ bên ngoài gặp lỗi. Vui lòng kiểm tra lại trạng thái dữ liệu.',
    503: 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại sau.',
  };
  const code = typeof data.code === 'string' ? data.code : typeof data.errorCode === 'string' ? data.errorCode : `HTTP_${status}`;
  const message = typeof data.message === 'string' ? data.message : typeof data.detail === 'string' ? data.detail :
    error.code === 'ECONNABORTED' ? 'Yêu cầu quá thời gian chờ. Máy chủ có thể vẫn đang xử lý; hãy tải lại dữ liệu trước khi gửi lại.' : fallback[status] ?? 'Máy chủ gặp lỗi. Vui lòng thử lại.';
  const errors = Array.isArray(data.errors) ? data.errors.filter((item): item is { field?: string; message: string } =>
    item !== null && typeof item === 'object' && typeof item.message === 'string') : [];
  return new ApiError({ message, errorCode: code, errors }, status);
}
