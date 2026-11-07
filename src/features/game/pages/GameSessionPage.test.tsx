// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { FinishSessionResponse, GameSessionData, GameSessionWord, SubmitAttemptResponse } from '../types/gameSession.types';
import { gameSessionApi } from '../api/gameSessionApi';
import { GameSessionPage } from './GameSessionPage';

const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }));
const input = vi.hoisted(() => ({
  mode: 'mouse', isStarting: false, inputError: null, statusText: '', fps: 0,
  isPermissionGateOpen: false, videoRef: { current: null }, canvasRef: { current: null },
  switchMode: vi.fn(), startCamera: vi.fn(),
}));
vi.mock('../../../app/providers/useToast', () => ({ useToast: () => toast }));
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 31 }, isAuthenticated: true }) }));
vi.mock('../../progress/hooks/useMyStreak', () => ({ progressKeys: { all: ['progress'] }, useMyStreak: () => ({ data: { currentStreak: 6 } }) }));
vi.mock('../input/hooks/useInputController', () => ({ useInputController: () => input }));
vi.mock('../input/components/CameraPermissionGate', () => ({ CameraPermissionGate: () => null }));
vi.mock('../input/components/CameraPreview', () => ({ CameraPreview: () => null }));
vi.mock('../input/components/HandCursorOverlay', () => ({ HandCursorOverlay: () => null }));
vi.mock('../hooks/useVocabularyAudio', () => ({ useVocabularyAudio: () => ({ speak: vi.fn(), isSpeaking: false }) }));
vi.mock('../components/GameResultModal', () => ({
  GameResultModal: ({ isOpen, result, onPlayAgain }: { isOpen: boolean; result: FinishSessionResponse | null; onPlayAgain: () => void }) => isOpen ? <div role="dialog">
    <output data-testid="result">{result ? JSON.stringify(result) : 'pending'}</output>
    <button type="button" onClick={onPlayAgain}>Chơi lại topic này</button>
  </div> : null,
}));
vi.mock('../api/gameSessionApi', () => ({ gameSessionApi: {
  getActiveSession: vi.fn(), createSession: vi.fn(), getSessionHistoryDetail: vi.fn(),
  getSessionResult: vi.fn(), submitAttempt: vi.fn(), refreshAudioUrl: vi.fn(), cancelSession: vi.fn(),
} }));

const envelope = <T,>(data: T) => ({ success: true, message: 'OK', timestamp: '2026-11-04T00:00:00Z', data });
const word = (vocabId: number, meaningVi: string, letters: string[]): GameSessionWord => ({
  vocabId, orderNo: vocabId - 6, meaningVi, letters, wordLength: letters.length,
  audioUrl: null, hasAudio: false, attemptsUsed: 0, remainingAttempts: 5,
  correctlyAnswered: false, status: 'PENDING',
});
const session = (overrides: Partial<GameSessionData> = {}): GameSessionData => ({
  sessionId: 10, topicId: 2, mode: 'CHECKPOINT', status: 'IN_PROGRESS',
  totalWords: 3, maxAttemptPerWord: 5, initialWordIndex: 0, currentVocabularyId: 7,
  remainingAttempts: 2, currentScore: 13,
  words: [
    { ...word(7, 'Con mèo', ['C', 'A', 'T']), attemptsUsed: 3, remainingAttempts: 2, status: 'CURRENT' },
    word(8, 'Con chó', ['D', 'O', 'G']), word(9, 'Con heo', ['P', 'I', 'G']),
  ], ...overrides,
});
const attempt = (overrides: Partial<SubmitAttemptResponse> = {}): SubmitAttemptResponse => ({
  isCorrect: true, attemptNo: 4, attemptsLeft: 1, points: 0, wordDone: true,
  correctWord: null, sessionDone: false, sessionScore: 17, sessionWon: null,
  currentStreak: null, nextVocabularyId: 9, ...overrides,
});
function show(path = '/game/new?topicId=2&mode=CHECKPOINT') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/game/:sessionId" element={<GameSessionPage />} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return { ...view, client };
}
function fill(letters = ['C', 'A', 'T']) {
  for (const letter of letters) fireEvent.click(screen.getByRole('button', { name: `Khối chữ cái ${letter}` }));
}
async function confirm() {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Xác nhận từ' })); });
}
async function advance(milliseconds: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValue(envelope(session()));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('locks submission after an uncertain failure, then recovers server attempts, score and next vocabulary', async () => {
  vi.mocked(gameSessionApi.submitAttempt)
    .mockRejectedValueOnce(new Error('Mất kết nối'))
    .mockResolvedValueOnce(envelope(attempt()));
  show();
  await screen.findByText('Con mèo');
  expect(screen.getByText('2 / 5')).toBeTruthy();
  expect(screen.getByText('13')).toBeTruthy();
  vi.useFakeTimers();
  fill();
  await confirm();
  expect(screen.getByText(/Mất kết nối.*đồng bộ phiên/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Xác nhận từ' }) as HTMLButtonElement).disabled).toBe(true);
  await confirm();
  await advance(5000);
  expect(gameSessionApi.submitAttempt).toHaveBeenCalledTimes(1);
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByText('Con mèo')).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();

  const synced = session({ remainingAttempts: 1, currentScore: 17 });
  synced.words[0] = { ...synced.words[0], attemptsUsed: 4, remainingAttempts: 1 };
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValueOnce(envelope(synced));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Đồng bộ phiên để tiếp tục' })); });
  expect(screen.getByText('1 / 5')).toBeTruthy();
  expect(screen.getByText('17')).toBeTruthy();
  fill();
  await confirm();
  expect(gameSessionApi.submitAttempt).toHaveBeenCalledTimes(2);
  await advance(1200);
  expect(screen.getByText('Con heo')).toBeTruthy();
  expect(screen.queryByText('Con chó')).toBeNull();
  expect(screen.getByText('17')).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('obeys early failed session completion and blocks another submit during the feedback delay', async () => {
  vi.mocked(gameSessionApi.submitAttempt).mockResolvedValue(envelope(attempt({
    isCorrect: false, attemptNo: 5, attemptsLeft: 0, sessionDone: true,
    sessionWon: false, sessionScore: 0, currentStreak: null,
    correctWord: 'CAT', nextVocabularyId: null,
  })));
  show();
  await screen.findByText('Con mèo');
  vi.useFakeTimers();
  fill();
  await confirm();
  await confirm();
  await advance(1799);
  expect(gameSessionApi.submitAttempt).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).toBeNull();
  await advance(1);
  expect(JSON.parse(screen.getByTestId('result').textContent!)).toEqual({ isWon: false, score: 0, currentStreak: 6 });
  expect(screen.queryByText('Con chó')).toBeNull();
  expect(gameSessionApi.getSessionResult).not.toHaveBeenCalled();
});

it('blocks exiting while an attempt is pending and through the resulting word transition', async () => {
  let resolveAttempt!: (value: Awaited<ReturnType<typeof gameSessionApi.submitAttempt>>) => void;
  vi.mocked(gameSessionApi.submitAttempt).mockReturnValueOnce(new Promise((resolve) => { resolveAttempt = resolve; }));
  show();
  await screen.findByText('Con mèo');
  const exit = screen.getByRole('button', { name: 'Thoát phiên' }) as HTMLButtonElement;
  expect(exit.disabled).toBe(false);
  vi.useFakeTimers();
  fill();
  await confirm();
  expect(gameSessionApi.submitAttempt).toHaveBeenCalledTimes(1);
  expect(exit.disabled).toBe(true);
  fireEvent.click(exit);
  expect(gameSessionApi.cancelSession).not.toHaveBeenCalled();

  await act(async () => { resolveAttempt(envelope(attempt())); });
  expect(exit.disabled).toBe(true);
  await advance(1199);
  fireEvent.click(exit);
  expect(gameSessionApi.cancelSession).not.toHaveBeenCalled();
  expect(exit.disabled).toBe(true);
  await advance(1);
  expect(screen.getByText('Con heo')).toBeTruthy();
  expect(exit.disabled).toBe(false);
});

it('recovers an attempt committed before a timeout from saved results without creating another game', async () => {
  vi.mocked(gameSessionApi.submitAttempt).mockRejectedValueOnce(new Error('Timeout'));
  show();
  await screen.findByText('Con mèo');
  fill();
  await confirm();
  vi.mocked(gameSessionApi.getActiveSession).mockResolvedValueOnce(envelope(null));
  vi.mocked(gameSessionApi.getSessionResult).mockResolvedValueOnce(envelope({ isWon: true, score: 42, currentStreak: null }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Đồng bộ phiên để tiếp tục' })); });
  expect(JSON.parse(screen.getByTestId('result').textContent!)).toEqual({ isWon: true, score: 42, currentStreak: 6 });
  expect(gameSessionApi.getSessionResult).toHaveBeenCalledWith(10);
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});

it('starts a new backend session when replaying and submits its actual ID', async () => {
  vi.mocked(gameSessionApi.submitAttempt).mockResolvedValueOnce(envelope(attempt({
    sessionDone: true, sessionWon: true, sessionScore: 42, currentStreak: 8, nextVocabularyId: null,
  }))).mockResolvedValueOnce(envelope(attempt({ wordDone: false, attemptsLeft: 4, sessionScore: 0 })));
  vi.mocked(gameSessionApi.createSession).mockResolvedValueOnce(envelope(session({
    sessionId: 21, currentScore: 0, remainingAttempts: 5,
    words: session().words.map((item) => ({ ...item, remainingAttempts: 5, attemptsUsed: 0 })),
  })));
  show();
  await screen.findByText('Con mèo');
  vi.useFakeTimers();
  fill();
  await confirm();
  await advance(1200);
  expect(JSON.parse(screen.getByTestId('result').textContent!)).toMatchObject({ isWon: true, currentStreak: 8 });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Chơi lại topic này' })); });
  expect(gameSessionApi.createSession).toHaveBeenCalledWith({ topicId: 2, mode: 'CHECKPOINT' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('5 / 5')).toBeTruthy();
  fill();
  await confirm();
  expect(gameSessionApi.submitAttempt).toHaveBeenLastCalledWith(21, { vocabId: 7, submittedLetters: ['C', 'A', 'T'] });
});

it('shows initialization errors with retry and never fabricates a word or session', async () => {
  vi.mocked(gameSessionApi.getActiveSession).mockRejectedValueOnce(new Error('Backend chưa sẵn sàng'));
  show();
  await screen.findByRole('heading', { name: 'Chưa thể mở phiên chơi' });
  expect(screen.getByText('Backend chưa sẵn sàng')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Khối chữ cái/ })).toBeNull();
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
  expect(gameSessionApi.submitAttempt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByText('Con mèo');
  expect(gameSessionApi.createSession).not.toHaveBeenCalled();
});
