import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../types/api.types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Không retry với lỗi 4xx của client (ví dụ 400, 401, 403, 404, 409)
        if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 phút mặc định cho cache
    },
    mutations: {
      retry: false,
    },
  },
});
