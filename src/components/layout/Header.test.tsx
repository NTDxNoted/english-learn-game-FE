// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthContextType } from '../../features/auth/types/auth.types';
import { Header } from './Header';

const auth = vi.hoisted(() => ({ value: {} as AuthContextType }));
const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn() }));
const getMyStreak = vi.hoisted(() => vi.fn());
vi.mock('../../features/progress/api/progressApi', () => ({ progressApi: { getMyStreak } }));
vi.mock('../../features/auth/hooks/useAuth', () => ({ useAuth: () => auth.value }));
vi.mock('../../app/providers/useToast', () => ({ useToast: () => toast }));
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><Header /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  auth.value = { user: null, isAuthenticated: false, isLoading: false, login: vi.fn(), logout: vi.fn(async () => {}), refreshUser: vi.fn(async () => null) };
  vi.clearAllMocks();
  getMyStreak.mockResolvedValue({ data: { currentStreak: 7, completedToday: true } });
});
afterEach(() => cleanup());

it('opens and closes mobile navigation with the menu button', async () => {
  show();
  const toggle = screen.getByRole('button', { name: 'Mở menu điều hướng' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  await userEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('navigation').classList.contains('is-open')).toBe(true);
  await userEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});
it('closes the menu on Escape and returns focus to the toggle', async () => {
  show();
  const toggle = screen.getByRole('button', { name: 'Mở menu điều hướng' });
  await userEvent.click(toggle);
  await userEvent.keyboard('{Escape}');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(toggle);
});
it('closes navigation when a route is selected', async () => {
  show();
  await userEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
  await userEvent.click(screen.getByRole('link', { name: 'Chủ đề' }));
  expect(screen.getByRole('button', { name: 'Mở menu điều hướng' }).getAttribute('aria-expanded')).toBe('false');
});
it('offers the Admin navigation link only for an active admin profile', () => {
  auth.value.user = { id: 1, email: 'admin@example.test', displayName: 'Admin', role: 'admin', status: 'ACTIVE' };
  auth.value.isAuthenticated = true;
  const first = show();
  expect(screen.getByRole('link', { name: 'Quản trị' })).toBeTruthy();
  first.unmount(); auth.value.user = { ...auth.value.user, role: 'learner' };
  show();
  expect(screen.queryByRole('link', { name: 'Quản trị' })).toBeNull();
});
it('prevents duplicate logout clicks and announces its pending state', async () => {
  let finish!: () => void;
  auth.value.user = { id: 1, email: 'learner@example.test', displayName: 'Learner', role: 'learner', status: 'ACTIVE' };
  auth.value.isAuthenticated = true;
  const logout = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  auth.value.logout = logout;
  show();
  const button = screen.getByRole('button', { name: 'Đăng xuất' });
  await userEvent.click(button); await userEvent.click(button);
  expect(logout).toHaveBeenCalledTimes(1);
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect((button as HTMLButtonElement).disabled).toBe(true);
  finish();
  await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'));
  expect(toast.success).toHaveBeenCalledTimes(1);
});
it('loads streak from its API instead of the profile and does not query for guests', async () => {
  const guest = show();
  expect(getMyStreak).not.toHaveBeenCalled();
  guest.unmount();
  auth.value.user = { id: 9, email: 'learner@example.test', displayName: 'Learner', role: 'learner', currentStreak: 99 };
  auth.value.isAuthenticated = true;
  show();
  expect(await screen.findByText('7 ngày liên tiếp')).toBeTruthy();
  expect(screen.queryByText('99 ngày liên tiếp')).toBeNull();
  expect(getMyStreak).toHaveBeenCalledTimes(1);
});
it('shows a retry action when streak fails instead of claiming zero days', async () => {
  auth.value.user = { id: 10, email: 'learner@example.test', displayName: 'Learner', role: 'learner' };
  auth.value.isAuthenticated = true;
  getMyStreak.mockRejectedValueOnce(new Error('network'));
  show();
  await userEvent.click(await screen.findByRole('button', { name: 'Tải lại chuỗi streak' }));
  expect(await screen.findByText('7 ngày liên tiếp')).toBeTruthy();
  expect(screen.queryByText('0 ngày liên tiếp')).toBeNull();
});
