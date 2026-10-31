import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  CreateSessionRequest,
  GameSessionData,
  GameSessionWord,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  FinishSessionResponse,
  BackendGameSessionResponse,
  BackendGameSessionResumeResponse,
  BackendSubmitAttemptResponse,
} from '../types/gameSession.types';

export const gameSessionApi = {
  /**
   * Khôi phục phiên chơi đang dở dang trên backend (nếu có)
   * GET /api/topics/{topicId}/game-sessions/active
   */
  getActiveSession: async (topicId: number): Promise<ApiResponse<GameSessionData | null>> => {
    try {
      const res = await http.get<BackendGameSessionResumeResponse>(
        `/topics/${topicId}/game-sessions/active`,
      );

      const be = res.data;
      if (!be || !be.sessionId) {
        return {
          success: true,
          data: null,
          message: 'Không có phiên chơi dở dang',
          timestamp: new Date().toISOString(),
        };
      }

      const words: GameSessionWord[] = (be.questions || []).map((q, idx) => ({
        vocabId: q.vocabularyId,
        orderNo: idx + 1,
        meaningVi: q.meaningVi,
        ipa: '',
        wordLength: q.scrambledLetters ? q.scrambledLetters.length : 0,
        letters: q.scrambledLetters || [],
        hasAudio: false,
      }));

      // Tìm câu hỏi chưa giải xong đầu tiên để đặt con trỏ đúng vị trí
      const firstUnresolvedIndex = (be.questions || []).findIndex(
        (q) => !q.correctlyAnswered && (q.attemptsUsed ?? 0) < (be.maxAttemptsPerWord || 3),
      );

      const sessionData: GameSessionData = {
        sessionId: be.sessionId,
        topicId: be.topicId,
        status: be.status as any,
        totalWords: be.questionCount || words.length,
        maxAttemptPerWord: be.maxAttemptsPerWord || 3,
        sessionTimeoutMinutes: 30,
        words,
        initialWordIndex: firstUnresolvedIndex >= 0 ? firstUnresolvedIndex : 0,
        currentScore: be.score || 0,
      };

      return {
        success: true,
        data: sessionData,
        message: 'Khôi phục phiên chơi thành công',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        success: true,
        data: null,
        message: 'Không có phiên chơi dở dang',
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Tạo phiên chơi mới cho topic:
   * POST /api/topics/{topicId}/game-sessions
   */
  createSession: async (data: CreateSessionRequest): Promise<ApiResponse<GameSessionData>> => {
    const requestedMode = data.mode || 'FREE_PLAY';

    try {
      const res = await http.post<BackendGameSessionResponse>(
        `/topics/${data.topicId}/game-sessions`,
        { mode: requestedMode },
      );

      const beData = res.data;
      const words: GameSessionWord[] = (beData.questions || []).map((q, idx) => ({
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
        initialWordIndex: 0,
        currentScore: 0,
      };

      return {
        success: true,
        data: sessionData,
        message: res.message || 'Tạo phiên chơi thành công',
        timestamp: res.timestamp || new Date().toISOString(),
      };
    } catch (err: any) {
      // 1. Nếu đã có phiên chơi active trên topic này -> tự động resume phiên đó
      if (err?.message?.includes('already exists') || err?.statusCode === 409) {
        const activeRes = await gameSessionApi.getActiveSession(data.topicId);
        if (activeRes.data) {
          return activeRes as ApiResponse<GameSessionData>;
        }
      }

      // 2. Nếu mode CHECKPOINT báo chưa học đủ từ vựng -> tự động chuyển sang FREE_PLAY
      if (requestedMode === 'CHECKPOINT') {
        return gameSessionApi.createSession({ topicId: data.topicId, mode: 'FREE_PLAY' });
      }

      throw err;
    }
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
   * Kết thúc phiên chơi (Dùng khi hiển thị kết quả)
   */
  finishSession: (_sessionId: number): Promise<ApiResponse<FinishSessionResponse>> =>
    Promise.resolve({
      success: true,
      data: { isWon: true, score: 100, currentStreak: 1 },
      message: 'Phiên chơi hoàn thành',
      timestamp: new Date().toISOString(),
    }),
};
