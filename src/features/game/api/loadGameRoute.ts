import { gameSessionApi } from './gameSessionApi';
import type { FinishSessionResponse, GameMode, GameSessionData } from '../types/gameSession.types';

type LoadedGame = { kind: 'session'; session: GameSessionData } | { kind: 'history'; topicId: number; mode: GameMode; result: FinishSessionResponse };
const positiveId = (value: string | null | undefined) => value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

export async function loadGameRoute(sessionId: string | undefined, topicParam: string | null, modeParam: string | null): Promise<LoadedGame> {
  if (sessionId !== 'new') {
    const id = positiveId(sessionId);
    if (!id) throw new Error('Đường dẫn phiên chơi không hợp lệ. Hãy chọn lại chủ đề.');
    const topicId = positiveId(topicParam);
    if (topicId) {
      const { data: active } = await gameSessionApi.getActiveSession(topicId);
      if (active?.sessionId === id) return { kind: 'session', session: active };
    }
    // History is readable only for terminal sessions. A 409 remains actionable;
    // never guess topic 1 or create another game for a numeric session route.
    const { data: history } = await gameSessionApi.getSessionHistoryDetail(id);
    if (history.status !== 'COMPLETED' && history.status !== 'FAILED') throw new Error('Phiên chơi đã bị hủy hoặc không còn hoạt động. Hãy chọn lại chủ đề.');
    return { kind: 'history', topicId: history.topicId, mode: history.mode, result: { isWon: history.won, score: history.score, currentStreak: null } };
  }
  const topicId = positiveId(topicParam);
  if (!topicId) throw new Error('Thiếu chủ đề hợp lệ. Hãy chọn chủ đề trước khi chơi.');
  if (modeParam && !['CHECKPOINT', 'FREE_PLAY', 'REVIEW'].includes(modeParam)) throw new Error('Chế độ chơi không hợp lệ.');
  const mode = (modeParam || 'FREE_PLAY') as GameMode;
  const { data: active } = await gameSessionApi.getActiveSession(topicId);
  if (active) {
    if (!modeParam || active.mode === mode) return { kind: 'session', session: active };
    await gameSessionApi.cancelSession(topicId);
  }
  return { kind: 'session', session: (await gameSessionApi.createSession({ topicId, mode })).data };
}
