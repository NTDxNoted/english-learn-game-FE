// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { LoginForm } from './components/LoginForm';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import {
  authApi,
  clearGoogleOAuthTransaction,
  computeCodeChallengeS256,
  generateRandomBase64Url,
  readGoogleOAuthTransaction,
  resetGoogleOAuthCoordinator,
  saveGoogleOAuthTransaction,
} from './api/authApi';
import { tokenStorage } from '../../lib/tokenStorage';
import { queryClient } from '../../app/providers/queryClient';
import { ApiError } from '../../types/api.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../app/providers/useToast', () => ({ useToast: () => toast }));
const profile = { id: 1, email: 'admin@example.test', displayName: 'Admin', role: 'admin' as const, status: 'ACTIVE' as const };
const tokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 3600 };
const validVerifier = 'a'.repeat(43);
function dto<T>(data: T) { return { success: true, data, message: 'OK', timestamp: '' }; }
function form() {
  return render(<AuthProvider><MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginForm />} /><Route path="/admin" element={<p>ADMIN ROUTE</p>} /><Route path="/topics" element={<p>LEARNER ROUTE</p>} /></Routes></MemoryRouter></AuthProvider>);
}
async function submit() {
  await userEvent.type(await screen.findByLabelText('Email *'), profile.email);
  await userEvent.type(screen.getByLabelText('Mật khẩu *'), 'StrongPassword1!');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}
function Probe() {
  const { user, isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? user?.role : 'ANONYMOUS'}</p>;
}
beforeEach(() => {
  tokenStorage.clearTokens();
  clearGoogleOAuthTransaction();
  resetGoogleOAuthCoordinator();
  queryClient.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearGoogleOAuthTransaction();
  resetGoogleOAuthCoordinator();
  vi.restoreAllMocks();
  queryClient.clear();
});

it('enters Admin only after successful sync returns an active profile', async () => {
  vi.spyOn(authApi, 'login').mockResolvedValue(dto(tokens));
  vi.spyOn(authApi, 'syncUser').mockResolvedValue(dto(profile));
  form(); await submit();
  expect(await screen.findByText('ADMIN ROUTE')).toBeTruthy();
  expect(toast.success).toHaveBeenCalledTimes(1);
});
it('does not announce success or enter Admin after sync fails', async () => {
  vi.spyOn(authApi, 'login').mockResolvedValue(dto(tokens));
  vi.spyOn(authApi, 'syncUser').mockRejectedValue(new ApiError({ message: 'Sync service unavailable', errorCode: 'HTTP_503' }, 503));
  form(); await submit();
  expect(await screen.findByText('Sync service unavailable')).toBeTruthy();
  expect(screen.queryByText('ADMIN ROUTE')).toBeNull();
  expect(toast.success).not.toHaveBeenCalled();
  expect(tokenStorage.hasAccessToken()).toBe(false);
});
it('clears the old session and stops before sync when login reports blocked', async () => {
  vi.spyOn(authApi, 'login').mockRejectedValue(new ApiError({ message: 'Blocked account', errorCode: 'ACCOUNT_BLOCKED' }, 403));
  const sync = vi.spyOn(authApi, 'syncUser');
  form(); await submit();
  await waitFor(() => expect(screen.queryByText('ADMIN ROUTE')).toBeNull());
  expect(sync).not.toHaveBeenCalled(); expect(tokenStorage.hasAccessToken()).toBe(false);
  expect(toast.success).not.toHaveBeenCalled();
});
it('reloads the profile from the backend and clears cached admin data on session end', async () => {
  tokenStorage.setTokens(tokens);
  vi.spyOn(authApi, 'getMe').mockResolvedValue(dto(profile));
  queryClient.setQueryData(['admin', 'users'], ['private-data']);
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByText('admin')).toBeTruthy();
  tokenStorage.notifyUnauthorized();
  expect(await screen.findByText('ANONYMOUS')).toBeTruthy();
  expect(queryClient.getQueryData(['admin', 'users'])).toBeUndefined();
});
it('keeps tokens and offers retry when profile lookup has a transient failure', async () => {
  tokenStorage.setTokens(tokens);
  vi.spyOn(authApi, 'getMe').mockRejectedValue(new ApiError({ message: 'Service unavailable' }, 503));
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeTruthy();
  expect(tokenStorage.getRefreshToken()).toBe('refresh');
});
it('renders Google sign-in button and removes the Cognito footer note on LoginPage', async () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
  expect(await screen.findByRole('button', { name: 'Tiếp tục với Google' })).toBeTruthy();
  expect(screen.queryByText(/Xác thực bảo mật qua AWS Cognito User Pool/i)).toBeNull();
});
it('exchanges Google OAuth code with PKCE + state, syncs temporary token, and navigates to topics', async () => {
  const learnerProfile = { ...profile, role: 'learner' as const };
  saveGoogleOAuthTransaction({
    state: 'state_valid_123',
    codeVerifier: validVerifier,
    redirectUri: 'http://localhost:3000/callback',
    createdAt: Date.now(),
  });
  const exchangeSpy = vi.spyOn(authApi, 'loginWithGoogle').mockResolvedValue(dto(tokens));
  const syncSpy = vi.spyOn(authApi, 'syncUser').mockResolvedValue(dto(learnerProfile));

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/callback?code=google_oauth_code_123&state=state_valid_123']}>
        <Routes>
          <Route path="/callback" element={<LoginForm />} />
          <Route path="/topics" element={<p>LEARNER ROUTE</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  expect(await screen.findByText('LEARNER ROUTE')).toBeTruthy();
  expect(exchangeSpy).toHaveBeenCalledWith({
    code: 'google_oauth_code_123',
    redirectUri: 'http://localhost:3000/callback',
    codeVerifier: validVerifier,
  });
  expect(tokenStorage.getAccessToken()).toBe('access');
  expect(toast.success).toHaveBeenCalledTimes(1);
});
