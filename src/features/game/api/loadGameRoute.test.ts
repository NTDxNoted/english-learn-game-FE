import { beforeEach, expect, it, vi } from 'vitest';
import { loadGameRoute } from './loadGameRoute';
import { gameSessionApi } from './gameSessionApi';

vi.mock('./gameSessionApi', () => ({ gameSessionApi: {
  getActiveSession: vi.fn(), createSession: vi.fn(), cancelSession: vi.fn(), getSessionHistoryDetail: vi.fn(),
} }));
const envelope = <T,>(data: T) => ({ success: true, message: 'OK', timestamp: '2026-11-04T00:00:00Z', data });
beforeEach(() => vi.resetAllMocks());

it.each([null, '', '0', '-1', 'abc', '2.4', '9007199254740992'])('rejects missing or invalid topic %j without making requests', async (topicId) => {
  await expect(loadGameRoute('new', topicId, null)).rejects.toThrow('chủ đề');
  expect(gameSessionApi.getActiveSession).not.toHaveBeenCalled();
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('rejects an unsupported mode before any request', async () => {
  await expect(loadGameRoute('new', '2', 'UNKNOWN')).rejects.toThrow('Chế độ');
  expect(gameSessionApi.getActiveSession).not.toHaveBeenCalled();
});

it('resumes the existing session when its mode matches the requested mode', async () => {
  const active = { sessionId: 12, topicId: 2, mode: 'CHECKPOINT' };
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValue(envelope(active) as never);
  expect(await loadGameRoute('new', '2', 'CHECKPOINT')).toEqual({ kind: 'session', session: active });
  expect(gameSessionApi.cancelSession).not.toHaveBeenCalled();
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('cancels a mismatched active session and creates the requested mode (e.g. CHECKPOINT after learning)', async () => {
  const active = { sessionId: 12, topicId: 2, mode: 'FREE_PLAY' };
  const created = { sessionId: 15, topicId: 2, mode: 'CHECKPOINT' };
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValue(envelope(active) as never);
  vi.mocked(gameSessionApi.cancelSession).mockResolvedValue(envelope(null));
  vi.mocked(gameSessionApi.createSession).mockResolvedValue(envelope(created) as never);
  expect(await loadGameRoute('new', '2', 'CHECKPOINT')).toEqual({ kind: 'session', session: created });
  expect(gameSessionApi.cancelSession).toHaveBeenCalledWith(2);
  expect(gameSessionApi.createSession).toHaveBeenCalledWith({ topicId: 2, mode: 'CHECKPOINT' });
});

it('creates exactly the requested mode when no active session exists', async () => {
  const created = { sessionId: 12, topicId: 2, mode: 'CHECKPOINT' };
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValue(envelope(null));
  vi.mocked(gameSessionApi.createSession).mockResolvedValue(envelope(created) as never);
  expect(await loadGameRoute('new', '2', 'CHECKPOINT')).toEqual({ kind: 'session', session: created });
  expect(gameSessionApi.createSession).toHaveBeenCalledWith({ topicId: 2, mode: 'CHECKPOINT' });
});

it('does not create a game when resume fails', async () => {
  const failure = new Error('Unauthorized');
  vi.mocked(gameSessionApi.getActiveSession).mockRejectedValue(failure);
  await expect(loadGameRoute('new', '2', 'FREE_PLAY')).rejects.toBe(failure);
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('resumes only the numeric session requested on the given topic', async () => {
  const active = { sessionId: 12, topicId: 2, mode: 'REVIEW' };
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValue(envelope(active) as never);
  expect(await loadGameRoute('12', '2', null)).toEqual({ kind: 'session', session: active });
  expect(gameSessionApi.getSessionHistoryDetail).not.toHaveBeenCalled();
});

it('reads a saved result for a numeric route without guessing a topic', async () => {
  vi.mocked(gameSessionApi.getSessionHistoryDetail).mockResolvedValue(envelope({
    sessionId: 12, topicId: 9, mode: 'CHECKPOINT', status: 'FAILED', won: false, score: 0,
  }) as never);
  expect(await loadGameRoute('12', null, null)).toEqual({
    kind: 'history', topicId: 9, mode: 'CHECKPOINT', result: { isWon: false, score: 0, currentStreak: null },
  });
  expect(gameSessionApi.getActiveSession).not.toHaveBeenCalled();
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('keeps a different active session intact when opening history', async () => {
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValue(envelope({ sessionId: 99 }) as never);
  vi.mocked(gameSessionApi.getSessionHistoryDetail).mockResolvedValue(envelope({
    sessionId: 12, topicId: 2, mode: 'FREE_PLAY', status: 'COMPLETED', won: true, score: 0,
  }) as never);
  const loaded = await loadGameRoute('12', '2', null);
  expect(loaded.kind).toBe('history');
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('does not turn abandoned history into a completed result', async () => {
  vi.mocked(gameSessionApi.getSessionHistoryDetail).mockResolvedValue(envelope({
    sessionId: 12, topicId: 2, mode: 'REVIEW', status: 'ABANDONED', won: false, score: 0,
  }) as never);
  await expect(loadGameRoute('12', null, null)).rejects.toThrow();
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('preserves an in-progress history error instead of creating topic 1', async () => {
  const failure = { statusCode: 409, message: 'Use resume API' };
  vi.mocked(gameSessionApi.getSessionHistoryDetail).mockRejectedValue(failure);
  await expect(loadGameRoute('12', null, null)).rejects.toBe(failure);
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
  expect(gameSessionApi.getActiveSession).not.toHaveBeenCalled();
});
