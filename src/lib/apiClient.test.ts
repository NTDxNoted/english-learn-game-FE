import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, http } from './apiClient';
import { tokenStorage } from './tokenStorage';

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  tokenStorage.clearTokens();
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), location: { pathname: '/login', href: '' } });
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

it('preserves FormData rather than serializing it as JSON', async () => {
  const form = new FormData(); form.append('name', 'Food');
  apiClient.defaults.adapter = async (config) => {
    expect(config.data).toBeInstanceOf(FormData);
    expect(config.headers.getContentType()).not.toBe('application/json');
    return { data: {}, status: 201, statusText: 'Created', headers: {}, config };
  };
  await http.post('/admin/topics', form);
});

it('accepts an empty 204 response without parsing JSON', async () => {
  apiClient.defaults.adapter = async (config) => ({ data: '', status: 204, statusText: 'No Content', headers: {}, config });
  expect((await http.delete('/admin/topics/1')).success).toBe(true);
});

it('shares one refresh for multiple simultaneous unauthorized requests', async () => {
  tokenStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-token' });
  let complete!: () => void;
  const refresh = vi.spyOn(axios, 'post').mockReturnValue(new Promise((resolve) => {
    complete = () => resolve({ data: { accessToken: 'new-token' } });
  }));
  apiClient.defaults.adapter = async (config) => {
    if (config.headers.Authorization === 'Bearer old-token') throw new AxiosError('Unauthorized', '', config, undefined, { data: {}, status: 401, statusText: '', headers: {}, config });
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  const requests = [http.get('/admin/topics'), http.get('/admin/users')];
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  complete(); await Promise.all(requests);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('does not loop if a retry is still unauthorized', async () => {
  tokenStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-token' });
  const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new-token' } });
  let attempts = 0;
  apiClient.defaults.adapter = async (config) => {
    attempts++;
    throw new AxiosError('Unauthorized', '', config, undefined, { data: {}, status: 401, statusText: '', headers: {}, config });
  };
  await expect(http.get('/admin/topics')).rejects.toMatchObject({ statusCode: 401 });
  expect(attempts).toBe(2); expect(refresh).toHaveBeenCalledTimes(1);
  expect(tokenStorage.hasAccessToken()).toBe(false);
});

it('keeps the session on a transient refresh service failure', async () => {
  tokenStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-token' });
  vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('Unavailable', '', undefined, undefined, { data: { message: 'Cognito unavailable' }, status: 503, statusText: '', headers: {}, config: { headers: new axios.AxiosHeaders() } }));
  apiClient.defaults.adapter = async (config) => { throw new AxiosError('Unauthorized', '', config, undefined, { data: {}, status: 401, statusText: '', headers: {}, config }); };
  await expect(http.get('/admin/topics')).rejects.toMatchObject({ statusCode: 503 });
  expect(tokenStorage.getRefreshToken()).toBe('refresh-token');
});

it('clears tokens on ACCOUNT_BLOCKED and does not refresh', async () => {
  tokenStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-token' });
  const refresh = vi.spyOn(axios, 'post');
  apiClient.defaults.adapter = async (config) => { throw new AxiosError('Forbidden', '', config, undefined, { data: { code: 'ACCOUNT_BLOCKED', message: 'Blocked' }, status: 403, statusText: '', headers: {}, config }); };
  await expect(http.get('/admin/topics')).rejects.toMatchObject({ errorCode: 'ACCOUNT_BLOCKED' });
  expect(tokenStorage.hasAccessToken()).toBe(false); expect(refresh).not.toHaveBeenCalled();
});

it('does not overwrite a new session when an old refresh finishes after logout', async () => {
  tokenStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-token' });
  let complete!: () => void;
  const refresh = vi.spyOn(axios, 'post').mockReturnValue(new Promise((resolve) => { complete = () => resolve({ data: { accessToken: 'stale-token' } }); }));
  apiClient.defaults.adapter = async (config) => { throw new AxiosError('Unauthorized', '', config, undefined, { data: {}, status: 401, statusText: '', headers: {}, config }); };
  const pending = http.get('/admin/topics');
  const rejected = expect(pending).rejects.toMatchObject({ errorCode: 'SESSION_ENDED' });
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  tokenStorage.clearTokens(); tokenStorage.setAccessToken('different-session-token');
  complete(); await rejected;
  expect(tokenStorage.getAccessToken()).toBe('different-session-token');
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('authentication requests', () => {
  it('uses the backend API prefix', () => {
    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it.each([
    '/auth/login', '/auth/register', '/auth/confirm-register',
    '/auth/resend-confirmation', '/auth/forgot-password',
    '/auth/reset-password', '/auth/refresh',
  ])('does not send an old bearer token to %s', async (path) => {
    tokenStorage.setAccessToken('expired-token');
    apiClient.defaults.adapter = async (config) => {
      expect(config.headers.has('Authorization')).toBe(false);
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await http.post(path, {});
  });

  it('sends the bearer token to protected endpoints', async () => {
    tokenStorage.setAccessToken('valid-token');
    apiClient.defaults.adapter = async (config) => {
      expect(config.headers.Authorization).toBe('Bearer valid-token');
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await http.post('/auth/sync');
  });

  it('reads a plain refresh DTO and retries with the new access token', async () => {
    tokenStorage.setTokens({ accessToken: 'old-token', refreshToken: 'refresh-token' });
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'new-token', refreshToken: 'refresh-token', expiresIn: 3600 },
    });
    let attempts = 0;
    apiClient.defaults.adapter = async (config) => {
      attempts++;
      if (attempts === 1) {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config,
        });
      }
      expect(config.headers.Authorization).toBe('Bearer new-token');
      return { data: { id: 7 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    const result = await http.get<{ id: number }>('/users/me');
    expect(result.data.id).toBe(7);
    expect(tokenStorage.getAccessToken()).toBe('new-token');
    expect(refresh).toHaveBeenCalledWith('/api/auth/refresh',
      { refreshToken: 'refresh-token' }, expect.objectContaining({ timeout: 15000 }));
    expect(attempts).toBe(2);
  });
});
