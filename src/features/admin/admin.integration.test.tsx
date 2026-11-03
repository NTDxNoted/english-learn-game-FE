// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AuthContextType } from '../auth/types/auth.types';
import type { AdminConfig, AdminTopic, AdminUser } from './types/admin.types';
import { AdminGuard } from './components/AdminGuard';
import { TopicList } from './pages/TopicList';
import { UserList } from './pages/UserList';
import { ConfigPage } from './pages/ConfigPage';
import { AuditList } from './pages/AuditList';
import { VocabularyForm } from './components/VocabularyForm';
import { VocabularyList } from './pages/VocabularyList';
import { adminApi } from './api/adminApi';
import { ApiError } from '../../types/api.types';

const auth = vi.hoisted(() => ({ value: {} as AuthContextType }));
vi.mock('../auth/hooks/useAuth', () => ({ useAuth: () => auth.value }));
const topic: AdminTopic = { id: 1, name: 'Food', description: 'Food words', imageUrl: null, iconUrl: null, orderNo: 1, isActive: true };
const learner: AdminUser = { id: 7, email: 'learner@example.test', displayName: 'Learner', role: 'learner', status: 'ACTIVE', createdAt: '2026-11-03T07:15:00' };
const configRows: AdminConfig[] = ['max_attempt_per_word', 'checkpoint_pass_points', 'score_enabled', 'streak_enabled'].map((key) => ({
  configKey: key as AdminConfig['configKey'], topicId: 1, globalValue: key.endsWith('_enabled') ? 'true' : '3', globalActive: true,
  overrideValue: null, overrideActive: null, effectiveValue: 'true', source: 'GLOBAL', globalDescription: 'Description', overrideDescription: null,
}));

function show(node: ReactNode, path = '/', pattern = '*') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path={pattern} element={node} /><Route path="/login" element={<p>LOGIN</p>} /></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  auth.value = { user: { id: 1, email: 'admin@example.test', displayName: 'Admin', role: 'admin', status: 'ACTIVE' }, isAuthenticated: true, isLoading: false, login: vi.fn(), logout: vi.fn(), refreshUser: vi.fn() };
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('allows an active admin and denies a learner', () => {
  const result = show(<AdminGuard>ADMIN CONTENT</AdminGuard>);
  expect(screen.getByText('ADMIN CONTENT')).toBeTruthy();
  result.unmount(); auth.value.user = { ...auth.value.user!, role: 'learner' };
  show(<AdminGuard>ADMIN CONTENT</AdminGuard>);
  expect(screen.queryByText('ADMIN CONTENT')).toBeNull();
  expect(screen.getByText('Bạn không có quyền quản trị')).toBeTruthy();
});
it('does not render admin while checking the session', () => {
  auth.value.isLoading = true;
  show(<AdminGuard>ADMIN CONTENT</AdminGuard>);
  expect(screen.queryByText('ADMIN CONTENT')).toBeNull();
  expect(screen.getByRole('status')).toBeTruthy();
});
it('does not render admin for a blocked profile', () => {
  auth.value.user = { ...auth.value.user!, status: 'BLOCKED' };
  show(<AdminGuard>ADMIN CONTENT</AdminGuard>);
  expect(screen.queryByText('ADMIN CONTENT')).toBeNull();
});
it('redirects an anonymous admin deep-link to login', async () => {
  auth.value.user = null; auth.value.isAuthenticated = false;
  show(<AdminGuard>ADMIN CONTENT</AdminGuard>, '/admin/users');
  expect(await screen.findByText('LOGIN')).toBeTruthy();
});
it('loads hidden topics as well as active topics and filters locally', async () => {
  vi.spyOn(adminApi, 'topics').mockResolvedValue([topic, { ...topic, id: 2, name: 'Travel', isActive: false }]);
  show(<TopicList />);
  expect(await screen.findByText('Travel')).toBeTruthy();
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái chủ đề'), 'false');
  expect(screen.queryByText('Food')).toBeNull();
  expect(screen.getByText('Travel')).toBeTruthy();
});
it('creates a topic with an actual file and FormData', async () => {
  vi.spyOn(adminApi, 'topics').mockResolvedValue([]);
  const save = vi.spyOn(adminApi, 'saveTopic').mockResolvedValue(topic);
  show(<TopicList />);
  await userEvent.click(screen.getByRole('button', { name: /Thêm chủ đề/ }));
  const dialog = screen.getByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('Tên chủ đề *'), 'Food');
  await userEvent.upload(within(dialog).getByLabelText('Ảnh *'), new File(['image'], 'food.png', { type: 'image/png' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu chủ đề' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].get('name')).toBe('Food');
  expect(save.mock.calls[0][0].get('image')).toBeInstanceOf(File);
});
it('does not send hide request when confirmation is canceled', async () => {
  vi.spyOn(adminApi, 'topics').mockResolvedValue([topic]);
  const hide = vi.spyOn(adminApi, 'hideTopic').mockResolvedValue();
  show(<TopicList />); await screen.findByText('Food');
  await userEvent.click(screen.getByRole('button', { name: 'Ẩn' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
  expect(hide).not.toHaveBeenCalled();
});
it('refetches local state after Cognito error and retries the same BLOCKED action', async () => {
  const blocked = { ...learner, status: 'BLOCKED' as const };
  vi.spyOn(adminApi, 'users').mockResolvedValueOnce({ content: [learner], page: 0, size: 20, totalElements: 1, totalPages: 1 })
    .mockResolvedValue({ content: [blocked], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  const patch = vi.spyOn(adminApi, 'userStatus').mockRejectedValueOnce(new ApiError({ errorCode: 'COGNITO_ACCESS_DENIED', message: 'Local block committed, AWS failed' }, 502)).mockResolvedValue(blocked);
  show(<UserList />); await screen.findByText(learner.email, { exact: false });
  await userEvent.click(await screen.findByRole('button', { name: 'Khóa tài khoản' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mở khóa' })).toBeTruthy());
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }));
  await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
  expect(patch.mock.calls.map((call) => call[1])).toEqual(['BLOCKED', 'BLOCKED']);
});
it('never offers status management on an admin row', async () => {
  vi.spyOn(adminApi, 'users').mockResolvedValue({ content: [{ ...learner, role: 'admin' }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  show(<UserList />); await screen.findByText(learner.email, { exact: false });
  expect(screen.queryByRole('button', { name: 'Khóa tài khoản' })).toBeNull();
});
it('serializes false feature value separately from disabled topic override', async () => {
  vi.spyOn(adminApi, 'topics').mockResolvedValue([topic]);
  vi.spyOn(adminApi, 'configs').mockResolvedValue(configRows);
  const save = vi.spyOn(adminApi, 'saveConfig').mockResolvedValue(configRows[2]);
  show(<ConfigPage />, '/admin/topics/1/game-configs', '/admin/topics/:topicId/game-configs');
  const label = await screen.findByText('Tính điểm'); const row = label.closest('tr')!;
  await userEvent.click(within(row).getByRole('button', { name: 'Sửa' }));
  const dialog = screen.getByRole('dialog');
  await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'false');
  await userEvent.click(within(dialog).getByRole('checkbox'));
  await userEvent.type(within(dialog).getByLabelText('Mô tả thay đổi *'), 'Stop override');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu cấu hình' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('score_enabled', { configValue: 'false', description: 'Stop override', active: false }, 1));
});
it('renders audit detail with a null before JSON and escaped data', async () => {
  const entry = { id: 5, operationId: 'e0520290-7d25-4915-8dab-bfe78436cf08', actorUserId: null, scope: 'GLOBAL' as const, topicId: null, configKey: 'score_enabled', action: 'INSERT' as const, oldValue: null, newValue: 'true', changedAt: '2026-11-03T00:00:00Z' };
  vi.spyOn(adminApi, 'audits').mockResolvedValue({ content: [entry], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  vi.spyOn(adminApi, 'audit').mockResolvedValue({ ...entry, beforeData: null, afterData: { description: '<script>unsafe</script>' } });
  show(<AuditList />);
  await userEvent.click(await screen.findByRole('button', { name: 'Xem JSON' }));
  const dialog = screen.getByRole('dialog');
  expect(await within(dialog).findByText('null')).toBeTruthy();
  expect(dialog.querySelector('script')).toBeNull();
});
it('discards IPA preview after the input word changes', async () => {
  let resolveIpa!: (value: { word: string; ipa: string }) => void;
  vi.spyOn(adminApi, 'ipa').mockImplementation(() => new Promise((resolve) => { resolveIpa = resolve; }));
  show(<VocabularyForm topicId={1} onClose={vi.fn()} onSaved={async () => {}} />);
  const word = screen.getByLabelText('Từ tiếng Anh *');
  await userEvent.type(word, 'sugar'); await userEvent.click(screen.getByRole('button', { name: 'Tra IPA' }));
  await userEvent.clear(word); await userEvent.type(word, 'apple');
  resolveIpa({ word: 'sugar', ipa: '/sugar-preview/' });
  await waitFor(() => expect(screen.queryByText('/sugar-preview/')).toBeNull());
});

it('reports partial backfill success and refetches vocabulary', async () => {
  vi.spyOn(adminApi, 'topics').mockResolvedValue([topic]);
  const list = vi.spyOn(adminApi, 'vocabularies').mockResolvedValue([]);
  vi.spyOn(adminApi, 'backfill').mockResolvedValue({ topicId: 1, totalMissing: 3, generated: 2, failed: 1, failedVocabularyIds: [9] });
  show(<VocabularyList />, '/admin/topics/1/vocabularies', '/admin/topics/:topicId/vocabularies');
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo âm thanh còn thiếu' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }));
  expect(await screen.findByText('Cần tạo: 3 · Thành công: 2 · Lỗi: 1')).toBeTruthy();
  expect(screen.getByText('ID từ bị lỗi: 9')).toBeTruthy();
  await waitFor(() => expect(list.mock.calls.length).toBeGreaterThanOrEqual(2));
});

it('sends user filters and pagination to the server and resets the page', async () => {
  const list = vi.spyOn(adminApi, 'users').mockResolvedValue({ content: [learner], page: 0, size: 20, totalElements: 40, totalPages: 2 });
  show(<UserList />);
  await userEvent.click(await screen.findByRole('button', { name: 'Sau' }));
  await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }), expect.any(AbortSignal)));
  await userEvent.selectOptions(screen.getByLabelText('Lọc trạng thái'), 'BLOCKED');
  await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 0, status: 'BLOCKED' }), expect.any(AbortSignal)));
});

it('shows a placeholder if the topic image cannot load', async () => {
  vi.spyOn(adminApi, 'topics').mockResolvedValue([{ ...topic, imageUrl: 'https://example.test/missing.png' }]);
  show(<TopicList />);
  const image = await screen.findByRole('img', { name: 'Food' });
  image.dispatchEvent(new Event('error'));
  expect(await screen.findByRole('img', { name: 'Chưa có ảnh cho Food' })).toBeTruthy();
});
