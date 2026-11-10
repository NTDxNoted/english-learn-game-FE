// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopicListPage } from './TopicListPage';

const getTopics = vi.hoisted(() => vi.fn());
const getMyProgress = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const setSearchParams = vi.hoisted(() => vi.fn());
const searchParamsState = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock('../api/topicApi', () => ({ topicApi: { getTopics } }));
vi.mock('../../progress/api/progressApi', () => ({ progressApi: { getMyProgress } }));
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 42 } }) }));
vi.mock('../../../app/providers/useToast', () => ({ useToast: () => ({ success: vi.fn() }) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [searchParamsState.current, setSearchParams],
}));
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><TopicListPage /></QueryClientProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  searchParamsState.current = new URLSearchParams();
  getTopics.mockResolvedValue({ data: [{ id: 73, name: 'Animals', description: 'Động vật' }] });
  getMyProgress.mockResolvedValue({ data: { topics: [{ topicId: 73, totalVocabularies: 17, furthestPosition: 6 }] } });
});
afterEach(() => cleanup());
it('preserves an empty API list without invented default topics or a count of ten', async () => {
  getTopics.mockResolvedValue({ data: [] });
  show();
  expect(await screen.findByText('Chưa có chủ đề nào được mở.')).toBeTruthy();
  expect(screen.getByText('0 Chủ đề')).toBeTruthy();
  expect(screen.queryByText('Food')).toBeNull();
  expect(screen.queryByText('10 Chủ đề')).toBeNull();
  expect(screen.queryByRole('button', { name: /Vào học ngay/ })).toBeNull();
});
it('shows API failure and retries real topics instead of silently showing fallback IDs', async () => {
  getTopics.mockRejectedValueOnce(new Error('unavailable'));
  show();
  const retry = await screen.findByRole('button', { name: 'Tải lại danh sách chủ đề' });
  expect(screen.queryByText('Food')).toBeNull();
  await userEvent.click(retry);
  const topic = await screen.findByRole('button', { name: /Động vật Animals/ });
  await userEvent.click(topic);
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: /Chơi ngay/ }));
  expect(navigate).toHaveBeenCalledWith('/game/new?topicId=73&mode=FREE_PLAY');
});
it('opens the Learn vs Play choice modal and navigates to /topics/:id/learn when choosing Học', async () => {
  show();
  const topic = await screen.findByRole('button', { name: /Động vật Animals/ });
  await userEvent.click(topic);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Học từ vựng')).toBeTruthy();
  expect(within(dialog).getByText('Chơi ghép chữ')).toBeTruthy();
  await userEvent.click(within(dialog).getByRole('button', { name: /Học 5 từ & Chơi/ }));
  expect(navigate).toHaveBeenCalledWith('/topics/73/learn');
});
it('uses actual progress matched by topic ID', async () => {
  show();
  const topic = await screen.findByRole('button', { name: /Động vật Animals/ });
  expect(await screen.findByText('6 / 17 từ')).toBeTruthy();
  expect(within(topic).getByText('6/17 từ')).toBeTruthy();
  expect(within(topic).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('35');
});
it('keeps topic selection available when progress fails and hides unavailable counts', async () => {
  getMyProgress.mockRejectedValueOnce(new Error('unavailable'));
  show();
  const topic = await screen.findByRole('button', { name: /Động vật Animals/ });
  const retry = await screen.findByRole('button', { name: 'Tải lại tiến trình' });
  expect(within(topic).queryByRole('progressbar')).toBeNull();
  expect(screen.queryByText('0 / 0 từ')).toBeNull();
  await userEvent.click(retry);
  expect(await screen.findByText('6 / 17 từ')).toBeTruthy();
});
it('does not borrow counts from a different topic', async () => {
  getMyProgress.mockResolvedValue({ data: { topics: [{ topicId: 1, totalVocabularies: 20, furthestPosition: 8 }] } });
  show();
  const topic = await screen.findByRole('button', { name: /Động vật Animals/ });
  expect(within(topic).queryByRole('progressbar')).toBeNull();
  expect(screen.queryByText('8 / 20 từ')).toBeNull();
});
it.each(['CHECKPOINT', 'REVIEW'])('preserves the selected %s mode when opening a topic and clicking play', async (mode) => {
  show();
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chế độ chơi' }), mode);
  await userEvent.click(await screen.findByRole('button', { name: /Động vật Animals/ }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: /Chơi ngay/ }));
  expect(navigate).toHaveBeenCalledWith(`/game/new?topicId=73&mode=${mode}`);
});
it('resumes an existing session and shows its actual mode despite another selection', async () => {
  getMyProgress.mockResolvedValue({ data: { topics: [{ topicId: 73, totalVocabularies: 17, furthestPosition: 6, activeSessionId: 105, activeSessionMode: 'CHECKPOINT', reviewUnlocked: false }] } });
  show();
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chế độ chơi' }), 'REVIEW');
  const topic = await screen.findByRole('button', { name: /Tiếp tục Thử thách \(CHECKPOINT\)/ });
  await userEvent.click(topic);
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: /Tiếp tục Thử thách 5 từ \(CHECKPOINT\)/ }));
  expect(navigate).toHaveBeenCalledWith('/game/105?topicId=73&mode=CHECKPOINT');
});

it('opens the Learn vs Play modal automatically when ?select=<topicId> is present', async () => {
  searchParamsState.current = new URLSearchParams('select=73');
  show();
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Động vật')).toBeTruthy();
  expect(within(dialog).getByRole('button', { name: /Học 5 từ & Chơi/ })).toBeTruthy();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng hộp thoại chọn chế độ' }));
  expect(setSearchParams).toHaveBeenCalled();
});
