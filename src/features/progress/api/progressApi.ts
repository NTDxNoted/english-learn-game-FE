import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';

export interface UserStreak {
  currentStreak: number;
  lastStreakDate?: string;
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
  score: number;
  won: boolean;
  startedAt: string;
  finishedAt?: string;
}

export interface GameHistoryPage {
  items: GameHistoryItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export const progressApi = {
  /**
   * Lấy chuỗi streak hiện tại của người dùng
   * GET /api/users/me/streak
   */
  getMyStreak: (): Promise<ApiResponse<UserStreak>> =>
    http.get<UserStreak>('/users/me/streak'),

  /**
   * Lấy thống kê chơi game tổng thể (tổng số màn, thắng, độ chính xác)
   * GET /api/users/me/game-statistics
   */
  getMyGameStatistics: (): Promise<ApiResponse<GameStatistics>> =>
    http.get<GameStatistics>('/users/me/game-statistics'),

  /**
   * Lấy tiến trình theo từng chủ đề
   * GET /api/users/me/progress
   */
  getMyProgress: (): Promise<ApiResponse<GameProgressData>> =>
    http.get<GameProgressData>('/users/me/progress'),

  /**
   * Lấy lịch sử các phiên chơi
   * GET /api/users/me/game-history
   */
  getMyGameHistory: (page = 0, size = 10): Promise<ApiResponse<GameHistoryPage>> =>
    http.get<GameHistoryPage>(`/users/me/game-history?page=${page}&size=${size}`),
};

