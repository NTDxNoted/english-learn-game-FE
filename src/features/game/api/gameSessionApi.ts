import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  CreateSessionRequest,
  GameSessionData,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  FinishSessionResponse,
} from '../types/gameSession.types';

export const gameSessionApi = {
  /**
   * Bắt đầu một phiên chơi mới cho topic
   * POST /api/v1/game-sessions
   */
  createSession: (data: CreateSessionRequest): Promise<ApiResponse<GameSessionData>> =>
    http.post<GameSessionData, CreateSessionRequest>('/game-sessions', data),

  /**
   * Lấy phiên chơi đang hoạt động (nếu có) để khôi phục khi F5
   * GET /api/v1/game-sessions/current
   */
  getCurrentSession: (): Promise<ApiResponse<GameSessionData | null>> =>
    http.get<GameSessionData | null>('/game-sessions/current'),

  /**
   * Hủy phiên chơi khi người học chủ động thoát giữa chừng
   * POST /api/v1/game-sessions/{id}/cancel
   */
  cancelSession: (sessionId: number): Promise<ApiResponse<null>> =>
    http.post<null>(`/game-sessions/${sessionId}/cancel`),

  /**
   * Nộp lượt ghép từ để chấm điểm
   * POST /api/v1/game-sessions/{id}/attempts
   */
  submitAttempt: (sessionId: number, data: SubmitAttemptRequest): Promise<ApiResponse<SubmitAttemptResponse>> =>
    http.post<SubmitAttemptResponse, SubmitAttemptRequest>(`/game-sessions/${sessionId}/attempts`, data),

  /**
   * Kết thúc phiên chơi, tính điểm tổng, cập nhật chuỗi streak
   * POST /api/v1/game-sessions/{id}/finish
   */
  finishSession: (sessionId: number): Promise<ApiResponse<FinishSessionResponse>> =>
    http.post<FinishSessionResponse>(`/game-sessions/${sessionId}/finish`),
};
