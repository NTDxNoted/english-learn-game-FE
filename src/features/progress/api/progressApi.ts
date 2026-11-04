import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';

export interface UserStreak {
  currentStreak: number;
  lastStreakDate?: string | null;
  completedToday: boolean;
  today?: string;
  timeZone?: string;
}

export interface GameStatistics {
  totalSessions: number;
  wonSessions: number;
  totalCheckpointScore: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
}

export interface TopicProgressItem {
  topicId: number;
  topicName: string;
  activeSessionId?: number;
  activeSessionMode?: string;
  totalVocabularies: number;
  furthestPosition: number;
  furthestVocabularyId?: number;
  reviewUnlocked: boolean;
}

export interface GameProgressData {
  topics: TopicProgressItem[];
}

export interface GameHistoryItem {
  sessionId: number;
  topicId: number;
  topicName: string;
  mode: string;
  status: string;
  score: number | null;
  isWon: boolean | null;
  startedAt: string;
  endedAt: string | null;
}

export interface GameHistoryPage {
  content: GameHistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const progressApi = {
  /**
   * Lấy chuỗi streak hiện tại của người dùng
   * GET /api/users/me/streak
   */
  getMyStreak: (signal?: AbortSignal): Promise<ApiResponse<UserStreak>> =>
    http.get<UserStreak>('/users/me/streak', undefined, { signal }),

  /**
   * Lấy thống kê chơi game tổng thể (tổng số màn, thắng, độ chính xác)
   * GET /api/users/me/game-statistics
   */
  getMyGameStatistics: (signal?: AbortSignal): Promise<ApiResponse<GameStatistics>> =>
    http.get<GameStatistics>('/users/me/game-statistics', undefined, { signal }),

  /**
   * Lấy tiến trình theo từng chủ đề
   * GET /api/users/me/progress
   */
  getMyProgress: (signal?: AbortSignal): Promise<ApiResponse<GameProgressData>> =>
    http.get<GameProgressData>('/users/me/progress', undefined, { signal }),

  /**
   * Lấy lịch sử các phiên chơi
   * GET /api/users/me/game-history
   */
  getMyGameHistory: (page = 0, size = 10, signal?: AbortSignal): Promise<ApiResponse<GameHistoryPage>> =>
    http.get<GameHistoryPage>('/users/me/game-history', { page, size }, { signal }),
};

