import { beforeEach, expect, it, vi } from 'vitest';
import { http } from '../../../lib/apiClient';
import { gameSessionApi } from './gameSessionApi';
import type { BackendGameSessionResumeResponse, GameMode } from '../types/gameSession.types';

vi.mock('../../../lib/apiClient', () => ({ http: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
const envelope = <T,>(data: T) => ({ success: true, message: 'OK', timestamp: '2026-11-04T00:00:00Z', data });
const questions = [
  { vocabularyId: 7, meaningVi: 'Đường', scrambledLetters: ['S', 'U', 'G', 'A', 'R'], audioUrl: 'sugar.mp3', status: 'CURRENT', attemptsUsed: 1, correctlyAnswered: false },
  { vocabularyId: 8, meaningVi: 'Táo', scrambledLetters: ['A', 'P', 'P', 'L', 'E'], audioUrl: null, status: 'PENDING', attemptsUsed: 0, correctlyAnswered: false },
];
const resume = (overrides: Partial<BackendGameSessionResumeResponse> = {}): BackendGameSessionResumeResponse => ({
  sessionId: 10, topicId: 2, mode: 'FREE_PLAY', status: 'IN_PROGRESS', questionCount: 2,
  score: 13, resolvedQuestions: 0, currentVocabularyId: 7, maxAttemptsPerWord: 5,
  currentAttemptsUsed: 1, remainingAttempts: 4, questions, ...overrides,
});

it.each<GameMode>(['CHECKPOINT', 'FREE_PLAY', 'REVIEW'])('hydrates server rules and preserves audio for %s', async (mode) => {
  vi.mocked(http.post).mockResolvedValue(envelope({ sessionId: 10, topicId: 2, mode, questions }));
  vi.mocked(http.get).mockResolvedValue(envelope(resume({ mode })));
  const response = await gameSessionApi.createSession({ topicId: 2, mode });
  expect(response.data).toMatchObject({ mode, maxAttemptPerWord: 5, remainingAttempts: 4, currentScore: 13 });
  expect(response.data.words[0]).toMatchObject({ vocabId: 7, audioUrl: 'sugar.mp3', hasAudio: true, attemptsUsed: 1, remainingAttempts: 4 });
  expect(response.data.words[1]).toMatchObject({ vocabId: 8, audioUrl: null, hasAudio: false });
  expect(http.post).toHaveBeenCalledWith('/topics/2/game-sessions', { mode });
  expect(http.get).toHaveBeenCalledWith('/topics/2/game-sessions/active');
});

it('resumes the exact server cursor and preserves zero remaining attempts', async () => {
  vi.mocked(http.get).mockResolvedValue(envelope(resume({ currentVocabularyId: 8, remainingAttempts: 0 })));
  const response = await gameSessionApi.getActiveSession(2);
  expect(response.data).toMatchObject({ initialWordIndex: 1, currentVocabularyId: 8, remainingAttempts: 0 });
  expect(response.data?.words[1].remainingAttempts).toBe(0);
});

it.each([null, ''])('recognizes an empty active-session response %j', async (body) => {
  vi.mocked(http.get).mockResolvedValue(envelope(body));
  expect((await gameSessionApi.getActiveSession(2)).data).toBeNull();
});

it.each([401, 403, 500])('does not disguise status %s as no active session', async (statusCode) => {
  const failure = { statusCode, message: 'Request failed' };
  vi.mocked(http.get).mockRejectedValue(failure);
  await expect(gameSessionApi.getActiveSession(2)).rejects.toBe(failure);
});

it('does not guess a missing attempt limit', async () => {
  vi.mocked(http.get).mockResolvedValue(envelope(resume({ maxAttemptsPerWord: undefined as unknown as number })));
  await expect(gameSessionApi.getActiveSession(2)).rejects.toThrow('số lượt thử');
});

it('does not downgrade CHECKPOINT when backend rejects creation', async () => {
  const failure = { statusCode: 400, message: 'Learn all words first' };
  vi.mocked(http.post).mockRejectedValue(failure);
  await expect(gameSessionApi.createSession({ topicId: 2, mode: 'CHECKPOINT' })).rejects.toBe(failure);
  expect(http.post).toHaveBeenCalledTimes(1);
  expect(http.get).not.toHaveBeenCalled();
});

it('resumes a real creation conflict without changing the saved mode', async () => {
  vi.mocked(http.post).mockRejectedValue({ statusCode: 409, message: 'Active session exists' });
  vi.mocked(http.get).mockResolvedValue(envelope(resume({ mode: 'REVIEW' })));
  const response = await gameSessionApi.createSession({ topicId: 2, mode: 'CHECKPOINT' });
  expect(response.data.mode).toBe('REVIEW');
  expect(http.post).toHaveBeenCalledTimes(1);
});

it('propagates hydration failure after successful creation so callers can resume', async () => {
  const failure = new Error('Network error');
  vi.mocked(http.post).mockResolvedValue(envelope({ sessionId: 10 }));
  vi.mocked(http.get).mockRejectedValue(failure);
  await expect(gameSessionApi.createSession({ topicId: 2 })).rejects.toBe(failure);
  expect(http.post).toHaveBeenCalledTimes(1);
});

it('rejects hydration from a different active session', async () => {
  vi.mocked(http.post).mockResolvedValue(envelope({ sessionId: 10 }));
  vi.mocked(http.get).mockResolvedValue(envelope(resume({ sessionId: 11 })));
  await expect(gameSessionApi.createSession({ topicId: 2 })).rejects.toThrow('đồng bộ');
});

it('maps submitted results, absolute score and next word from backend', async () => {
  vi.mocked(http.post).mockResolvedValue(envelope({
    sessionId: 10, vocabularyId: 7, correct: false, attemptNumber: 5, remainingAttempts: 0,
    wordCompleted: true, sessionCompleted: true, sessionWon: false, pointsEarned: 0,
    totalScore: 13, nextVocabularyId: null, correctWord: 'SUGAR', currentStreak: 6,
  }));
  const result = await gameSessionApi.submitAttempt(10, { vocabId: 7, submittedLetters: 'SUGAR', timeMs: 342 });
  expect(http.post).toHaveBeenCalledWith('/game-sessions/10/attempts', {
    vocabularyId: 7, submittedLetters: ['S', 'U', 'G', 'A', 'R'], timeMs: 342,
  });
  expect(result.data).toEqual({
    isCorrect: false, attemptNo: 5, attemptsLeft: 0, wordDone: true, sessionDone: true,
    sessionWon: false, points: 0, sessionScore: 13, nextVocabularyId: null,
    correctWord: 'SUGAR', currentStreak: 6,
  });
});

it('does not score an attempt when its API call fails', async () => {
  const failure = new Error('Network error');
  vi.mocked(http.post).mockRejectedValue(failure);
  await expect(gameSessionApi.submitAttempt(10, { vocabId: 7, submittedLetters: 'SUGAR' })).rejects.toBe(failure);
});

it.each(['COMPLETED', 'FAILED'])('reads saved %s results instead of a fixed win or streak', async (status) => {
  vi.mocked(http.get).mockResolvedValue(envelope({ sessionId: 10, topicId: 2, status, won: false, score: 13 }));
  expect((await gameSessionApi.getSessionResult(10)).data).toEqual({ isWon: false, score: 13, currentStreak: null });
  expect(http.get).toHaveBeenCalledWith('/users/me/game-history/10');
  expect(http.post).not.toHaveBeenCalled();
});

it('keeps an unknown score unknown instead of inventing a value', async () => {
  vi.mocked(http.get).mockResolvedValue(envelope({ status: 'COMPLETED', won: true, score: null }));
  expect((await gameSessionApi.finishSession(10)).data.score).toBeNull();
});

it('does not show unfinished or abandoned history as a game result', async () => {
  vi.mocked(http.get).mockResolvedValue(envelope({ status: 'ABANDONED', won: false, score: 13 }));
  await expect(gameSessionApi.getSessionResult(10)).rejects.toThrow('chưa có kết quả');
});

it('renews audio by vocabulary ID rather than array position', async () => {
  vi.mocked(http.get).mockResolvedValue(envelope({ sessionId: 10, questions: [...questions].reverse() }));
  expect(await gameSessionApi.refreshAudioUrl(2, 10, 7)).toBe('sugar.mp3');
});

it('rejects audio from a different active session', async () => {
  vi.mocked(http.get).mockResolvedValue(envelope({ sessionId: 11, questions }));
  expect(await gameSessionApi.refreshAudioUrl(2, 10, 7)).toBeNull();
});
