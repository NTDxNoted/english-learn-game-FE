// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProgressPage } from './ProgressPage';
import { progressKeys } from '../hooks/useMyStreak';

const api = vi.hoisted(() => ({ getMyStreak: vi.fn(), getMyGameStatistics: vi.fn(), getMyProgress: vi.fn(), getMyGameHistory: vi.fn() }));
const auth = vi.hoisted(() => ({ isAuthenticated: true, user: { id: 42 } }));
vi.mock('../api/progressApi', () => ({ progressApi: api }));
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => auth }));
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><ProgressPage /></QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.resetAllMocks();
  api.getMyStreak.mockResolvedValue({ data: { currentStreak: 8, completedToday: true } });
  api.getMyGameStatistics.mockResolvedValue({ data: { totalSessions: 6, wonSessions: 2, totalCheckpointScore: 80, totalAttempts: 10, correctAttempts: 0, accuracyRate: 0 } });
  api.getMyProgress.mockResolvedValue({ data: { topics: [{ topicId: 5, totalVocabularies: 15, furthestPosition: 4 }] } });
  api.getMyGameHistory.mockResolvedValue({ data: { content: [{ sessionId: 101, topicName: 'Animals', mode: 'CHECKPOINT', status: 'COMPLETED', score: 20, isWon: true, startedAt: '2026-11-01T10:00:00Z', endedAt: '2026-11-01T10:05:00Z' }], totalElements: 1, totalPages: 1, page: 0, size: 5 } });
});
afterEach(() => cleanup());
it('renders actual win/streak/history DTO values and preserves zero accuracy', async () => {
  show();
  expect(await screen.findByText('8 Ngày')).toBeTruthy();
  expect(await screen.findByText('Đã thắng: 2 / 6 phiên chơi')).toBeTruthy();
  expect(screen.getByText('Độ chính xác ghép từ: 0%')).toBeTruthy();
  expect(screen.queryByText(/100%/)).toBeNull();
  expect(await screen.findByText('Animals')).toBeTruthy();
  expect(screen.getByText('Chiến thắng')).toBeTruthy();
  expect(screen.getByText('4 / 15')).toBeTruthy();
  expect(api.getMyGameHistory).toHaveBeenCalledWith(0, 5, expect.any(AbortSignal));
});
it('keeps successful sections and lets failed history retry without a false empty state', async () => {
  api.getMyGameHistory.mockRejectedValueOnce(new Error('unavailable'));
  show();
  const retry = await screen.findByRole('button', { name: 'Tải lại lịch sử phiên chơi' });
  expect(screen.queryByText(/Bạn chưa có phiên chơi nào/)).toBeNull();
  expect(screen.getByText('8 Ngày')).toBeTruthy();
  await userEvent.click(retry);
  expect(await screen.findByText('Animals')).toBeTruthy();
  expect(api.getMyGameStatistics).toHaveBeenCalledTimes(1);
});
it('does not substitute fabricated zeros or 100% when a statistics request fails', async () => {
  api.getMyGameStatistics.mockRejectedValue(new Error('unavailable'));
  show();
  expect(await screen.findByRole('button', { name: 'Tải lại thống kê chơi game' })).toBeTruthy();
  const stats = screen.getByRole('region', { name: 'Thống kê chiến thắng' });
  expect(within(stats).queryByText(/Đã thắng: 0/)).toBeNull();
  expect(within(stats).queryByText(/100%/)).toBeNull();
});
it('refreshes the displayed streak after game completion invalidates progress queries', async () => {
  const client = show();
  expect(await screen.findByText('8 Ngày')).toBeTruthy();
  api.getMyStreak.mockResolvedValue({ data: { currentStreak: 9, completedToday: true } });
  await client.invalidateQueries({ queryKey: progressKeys.all });
  expect(await screen.findByText('9 Ngày')).toBeTruthy();
});
