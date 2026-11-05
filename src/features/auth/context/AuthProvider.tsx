import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { authApi, resetGoogleOAuthCoordinator } from '../api/authApi';
import { tokenStorage } from '../../../lib/tokenStorage';
import { queryClient } from '../../../app/providers/queryClient';
import type { UserProfile, AuthTokens, AuthContextType } from '../types/auth.types';

const isOAuthCallbackBoot = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/callback')) return true;
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get('code') || params.get('error'));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(() => !isOAuthCallbackBoot());
  const [sessionError, setSessionError] = useState(false);
  const isAuthenticated = user?.status === 'ACTIVE';
  const refreshUser = useCallback(async () => {
    const revision = tokenStorage.getRevision();
    if (!tokenStorage.hasAccessToken()) return null;
    try {
      const response = await authApi.getMe();
      if (revision !== tokenStorage.getRevision()) return null;
      if (response.data.status !== 'ACTIVE') { tokenStorage.notifyUnauthorized(); return null; }
      setUser(response.data);
      setSessionError(false);
      return response.data;
    } catch {
      if (revision === tokenStorage.getRevision()) {
        setUser(null);
        setSessionError(tokenStorage.hasAccessToken());
      }
      return null;
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    const reset = () => {
      setUser(null);
      setSessionError(false);
      void queryClient.cancelQueries();
      queryClient.clear();
    };
    window.addEventListener('auth:unauthorized', reset);
    if (isOAuthCallbackBoot()) {
      tokenStorage.clearTokens();
    } else {
      void Promise.resolve().then(() => mounted ? refreshUser() : null)
        .finally(() => { if (mounted) setIsLoading(false); });
    }
    return () => { mounted = false; window.removeEventListener('auth:unauthorized', reset); };
  }, [refreshUser]);
  const login = useCallback((tokens: AuthTokens, profile?: UserProfile) => {
    tokenStorage.setTokens(tokens);
    setSessionError(false);
    if (profile?.status === 'ACTIVE') setUser(profile);
    else void refreshUser();
  }, [refreshUser]);
  const logout = useCallback(async () => {
    let logoutUrl: string | undefined;
    try {
      const res = await authApi.logout();
      if (res?.data && typeof res.data === 'object' && typeof res.data.logoutUrl === 'string') {
        logoutUrl = res.data.logoutUrl.trim();
      }
    }
    catch { /* Local logout must complete even if the remote service is unavailable. */ }
    finally {
      void logoutUrl;
      resetGoogleOAuthCoordinator();
      tokenStorage.notifyUnauthorized();
    }
  }, []);
  const value = useMemo<AuthContextType>(() => ({ user, isAuthenticated, isLoading, login, logout, refreshUser }),
    [user, isAuthenticated, isLoading, login, logout, refreshUser]);
  return <AuthContext.Provider value={value}>
    {isLoading ? <div role="status" style={{ padding: '4rem', textAlign: 'center' }}>Đang xác thực phiên đăng nhập…</div> :
      sessionError ? <div role="alert" style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Chưa thể xác thực tài khoản với máy chủ. Phiên hiện tại chưa bị xóa.</p>
        <button type="button" onClick={() => void refreshUser()}>Thử lại</button>
        <button type="button" onClick={() => tokenStorage.notifyUnauthorized()}>Về đăng nhập</button>
      </div> : children}
  </AuthContext.Provider>;
};
