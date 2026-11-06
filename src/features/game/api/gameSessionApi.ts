import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  CreateSessionRequest,
  GameSessionData,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
  FinishSessionResponse,
  BackendGameSessionResponse,
  BackendGameSessionResumeResponse,
  BackendSubmitAttemptResponse,
  BackendGameHistoryDetailResponse,
} from '../types/gameSession.types';

const mapResume = (be: BackendGameSessionResumeResponse): GameSessionData => {
  // Use the rules frozen for this session instead of a global default.
  if (!Number.isInteger(be.maxAttemptsPerWord) || be.maxAttemptsPerWord <= 0) {
    throw new Error('Phiên chơi chưa có thông tin số lượt thử hợp lệ. Vui lòng tải lại phiên.');
  }
  const initialWordIndex = be.questions.findIndex((q) => q.vocabularyId === be.currentVocabularyId);
  if (be.status === 'IN_PROGRESS' && initialWordIndex < 0) {
    throw new Error('Không tìm thấy câu hỏi hiện tại trong phiên chơi. Vui lòng tải lại phiên.');
  }
  return {
    sessionId: be.sessionId,
    topicId: be.topicId,
    mode: be.mode,
    status: be.status,
    totalWords: be.questionCount,
    maxAttemptPerWord: be.maxAttemptsPerWord,
    words: be.questions.map((q, idx) => ({
      vocabId: q.vocabularyId,
      orderNo: idx + 1,
      meaningVi: q.meaningVi,
      wordLength: q.scrambledLetters.length,
      letters: q.scrambledLetters,
      audioUrl: q.audioUrl ?? null,
      hasAudio: Boolean(q.audioUrl?.trim()),
      status: q.status,
      attemptsUsed: q.attemptsUsed,
      correctlyAnswered: q.correctlyAnswered,
      remainingAttempts: q.vocabularyId === be.currentVocabularyId
        ? be.remainingAttempts
        : Math.max(0, be.maxAttemptsPerWord - q.attemptsUsed),
    })),
    initialWordIndex,
    currentVocabularyId: be.currentVocabularyId,
    remainingAttempts: be.remainingAttempts,
    currentScore: be.score ?? 0,
  };
};

const getSessionHistoryDetail = (sessionId: number): Promise<ApiResponse<BackendGameHistoryDetailResponse>> =>
  http.get<BackendGameHistoryDetailResponse>(`/users/me/game-history/${sessionId}`);

const getSessionResult = async (sessionId: number): Promise<ApiResponse<FinishSessionResponse>> => {
  const res = await getSessionHistoryDetail(sessionId);
  if (res.data.status !== 'COMPLETED' && res.data.status !== 'FAILED') {
    throw new Error('Phiên chơi chưa có kết quả hoàn tất.');
  }
  return {
    ...res,
    data: { isWon: res.data.won, score: res.data.score, currentStreak: null },
  };
};

export const gameSessionApi = {
  // Renew only this vocabulary's URL, without replacing the current board.
  refreshAudioUrl: async (topicId: number, sessionId: number, vocabularyId: number): Promise<string | null> => {
    const res = await http.get<BackendGameSessionResumeResponse | null>(
      `/topics/${topicId}/game-sessions/active`,
    );
    if (res.data?.sessionId !== sessionId) return null;
    return res.data.questions.find((question) => question.vocabularyId === vocabularyId)?.audioUrl ?? null;
  },

  getActiveSession: async (topicId: number): Promise<ApiResponse<GameSessionData | null>> => {
    // Axios represents an empty 204 body as ''. Auth/network failures must reject.
    const res = await http.get<BackendGameSessionResumeResponse | null | ''>(
      `/topics/${topicId}/game-sessions/active`,
    );
    if (res.data == null || res.data === '') return { ...res, data: null };
    return { ...res, data: mapResume(res.data) };
  },

  createSession: async (data: CreateSessionRequest): Promise<ApiResponse<GameSessionData>> => {
    let created: ApiResponse<BackendGameSessionResponse>;
    try {
      created = await http.post<BackendGameSessionResponse>(
        `/topics/${data.topicId}/game-sessions`,
        { mode: data.mode ?? 'FREE_PLAY' },
      );
    } catch (err: unknown) {
      // Concurrent starts may race. Resume only an actual server conflict.
      if (typeof err === 'object' && err !== null && 'statusCode' in err && err.statusCode === 409) {
        const active = await gameSessionApi.getActiveSession(data.topicId);
        if (active.data) return { ...active, data: active.data };
      }
      throw err;
    }

    // POST omits rules/progress; hydrate the saved snapshot before allowing play.
    const active = await gameSessionApi.getActiveSession(data.topicId);
    if (!active.data || active.data.sessionId !== created.data.sessionId) {
      throw new Error('Không thể đồng bộ phiên vừa tạo. Vui lòng tải lại phiên chơi.');
    }
    return { ...active, data: active.data };
  },

  cancelSession: (topicId: number): Promise<ApiResponse<null>> =>
    http.delete<null>(`/topics/${topicId}/game-sessions/active`),

  submitAttempt: async (
    sessionId: number,
    data: SubmitAttemptRequest,
  ): Promise<ApiResponse<SubmitAttemptResponse>> => {
    const lettersArray = Array.isArray(data.submittedLetters)
      ? data.submittedLetters
      : Array.from(data.submittedLetters);
    const res = await http.post<BackendSubmitAttemptResponse>(
      `/game-sessions/${sessionId}/attempts`,
      { vocabularyId: data.vocabId, submittedLetters: lettersArray, timeMs: data.timeMs ?? 0 },
    );
    const be = res.data;
    return {
      ...res,
      data: {
        isCorrect: be.correct,
        attemptNo: be.attemptNumber,
        attemptsLeft: be.remainingAttempts,
        points: be.pointsEarned,
        wordDone: be.wordCompleted,
        correctWord: be.correctWord,
        sessionDone: be.sessionCompleted,
        sessionScore: be.totalScore,
        sessionWon: be.sessionWon,
        currentStreak: be.currentStreak,
        nextVocabularyId: be.nextVocabularyId,
      },
    };
  },

  getSessionHistoryDetail,
  getSessionResult,
  // Attempts finish games in BE. This compatibility alias only reads the result.
  finishSession: getSessionResult,
};
