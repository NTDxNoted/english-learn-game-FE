import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type { PublicGameConfig } from '../types/gameConfig.types';

export const gameConfigApi = {
  /**
   * Đọc cấu hình game công khai (luật game, số lần thử, chế độ chuột)
   * GET /api/v1/game-configs/public
   */
  getPublicConfig: (): Promise<ApiResponse<PublicGameConfig>> =>
    http.get<PublicGameConfig>('/game-configs/public'),
};
