import { useQuery } from '@tanstack/react-query';
import { progressApi } from '../api/progressApi';

export const progressKeys = {
  all: ['progress'] as const,
  streak: ['progress', 'streak'] as const,
  statistics: ['progress', 'statistics'] as const,
  topics: ['progress', 'topics'] as const,
  history: ['progress', 'history'] as const,
};

export function useMyStreak(userId?: number) {
  return useQuery({
    queryKey: [...progressKeys.streak, userId],
    queryFn: async ({ signal }) => (await progressApi.getMyStreak(signal)).data,
    enabled: userId !== undefined,
    staleTime: 30000,
    retry: false,
  });
}
