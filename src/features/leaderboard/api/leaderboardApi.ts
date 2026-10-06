import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';

export interface LeaderboardEntry {
  userId: number;
  displayName: string;
  rank: number;
  totalScore: number;
}

export interface WeeklyLeaderboardData {
  weekStart: string;
  weekEndExclusive: string;
  timeZone: string;
  entries: LeaderboardEntry[];
  me?: LeaderboardEntry | null;
}

export const leaderboardApi = {
  /**
   * Lấy bảng xếp hạng tuần
   * GET /api/leaderboard/weekly
   */
  getWeeklyLeaderboard: (limit = 10): Promise<ApiResponse<WeeklyLeaderboardData>> =>
    http.get<WeeklyLeaderboardData>(`/leaderboard/weekly?limit=${limit}`),
};

