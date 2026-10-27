import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  CreateSessionRequest,
  GameSessionData,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  FinishSessionResponse,
  BackendGameSessionResponse,
  BackendSubmitAttemptResponse,
} from '../types/gameSession.types';

export const gameSessionApi = {
  /**
   * Bắt đầu một phiên chơi mới cho topic kết nối Spring Boot Backend:
   * POST /api/topics/{topicId}/game-sessions
   */
  /**
   * Khôi phục phiên chơi đang dở (nếu có)
   */
  getCurrentSession: (): Promise<ApiResponse<GameSessionData | null>> =>
    Promise.resolve({
      success: true,
      data: null,
      message: 'Không có phiên chơi dở dang',
      timestamp: new Date().toISOString(),
    }),

  createSession: async (data: CreateSessionRequest): Promise<ApiResponse<GameSessionData>> => {
    const res = await http.post<BackendGameSessionResponse>(
      `/topics/${data.topicId}/game-sessions`,
      { mode: data.mode || 'CHECKPOINT' },
    );

    const beData = res.data;
    // Chuẩn hóa danh sách câu hỏi từ Spring Boot sang GameSessionWord[]
    const words = (beData.questions || []).map((q, idx) => ({
      vocabId: q.vocabularyId,
      orderNo: idx + 1,
      meaningVi: q.meaningVi,
      ipa: '',
      wordLength: q.scrambledLetters ? q.scrambledLetters.length : 0,
      letters: q.scrambledLetters || [],
      hasAudio: false,
    }));

    const sessionData: GameSessionData = {
      sessionId: beData.sessionId,
      topicId: beData.topicId,
      status: beData.status as any,
      totalWords: beData.totalQuestions || words.length,
      maxAttemptPerWord: 3,
      sessionTimeoutMinutes: 30,
      words,
    };

    return {
      success: true,
      data: sessionData,
      message: res.message || 'Tạo phiên chơi thành công',
      timestamp: res.timestamp || new Date().toISOString(),
    };
  },

  /**
   * Hủy bỏ phiên chơi đang active trên Spring Boot:
   * DELETE /api/topics/{topicId}/game-sessions/active
   */
  cancelSession: (topicId: number): Promise<ApiResponse<null>> =>
    http.delete<null>(`/topics/${topicId}/game-sessions/active`),

  /**
   * Nộp lượt ghép từ để chấm điểm:
   * POST /api/game-sessions/{sessionId}/attempts
   */
  submitAttempt: async (
    sessionId: number,
    data: SubmitAttemptRequest,
  ): Promise<ApiResponse<SubmitAttemptResponse>> => {
    const lettersArray = Array.isArray(data.submittedLetters)
      ? data.submittedLetters
      : data.submittedLetters.split('');

    const res = await http.post<BackendSubmitAttemptResponse>(
      `/game-sessions/${sessionId}/attempts`,
      {
        vocabularyId: data.vocabId,
        submittedLetters: lettersArray,
        timeMs: data.timeMs || 0,
      },
    );

    const be = res.data;
    const mapped: SubmitAttemptResponse = {
      isCorrect: be.correct,
      attemptNo: be.attemptNumber,
      attemptsLeft: be.remainingAttempts,
      points: be.pointsEarned,
      wordDone: be.wordCompleted,
      correctWord: be.correctWord || null,
      sessionDone: be.sessionCompleted,
      sessionScore: be.totalScore,
      sessionWon: be.sessionWon,
      currentStreak: be.currentStreak,
    };

    return {
      success: true,
      data: mapped,
      message: res.message || (mapped.isCorrect ? 'Chính xác!' : 'Chưa đúng, hãy thử lại!'),
      timestamp: res.timestamp || new Date().toISOString(),
    };
  },

  /**
   * Kết thúc phiên chơi
   */
  finishSession: (_sessionId: number): Promise<ApiResponse<FinishSessionResponse>> =>
    Promise.resolve({
      success: true,
      data: { isWon: true, score: 100, currentStreak: 1 },
      message: 'Phiên chơi hoàn thành',
      timestamp: new Date().toISOString(),
    }),
};
