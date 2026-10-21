import { useQuery } from '@tanstack/react-query';
import { gameConfigApi } from '../api/gameConfigApi';
import type { PublicGameConfig } from '../types/gameConfig.types';

export const DEFAULT_GAME_CONFIG: PublicGameConfig = {
  maxAttemptPerWord: 3,
  sessionTimeoutMinutes: 30,
  enableAudio: true,
  enableMouseMode: true,
  streakEnabled: true,
  wordsPerSession: 5,
};

export const useGameConfig = () => {
  const query = useQuery({
    queryKey: ['game-configs', 'public'],
    queryFn: async () => {
      const response = await gameConfigApi.getPublicConfig();
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10 phút cache
  });

  return {
    config: query.data || DEFAULT_GAME_CONFIG,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
