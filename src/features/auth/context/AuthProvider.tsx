import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Hand, Loader2 } from 'lucide-react';
import { AuthContext } from './AuthContext';
import { authApi } from '../api/authApi';
import { tokenStorage } from '../../../lib/tokenStorage';
import { queryClient } from '../../../app/providers/queryClient';
import { ApiError } from '../../../types/api.types';
import type { UserProfile, AuthTokens, AuthContextType } from '../types/auth.types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khôi phục hoặc cập nhật thông tin người dùng từ máy chủ
  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    if (!tokenStorage.hasAccessToken()) {
      setUser(null);
      setIsAuthenticated(false);
      return null;
    }

    try {
      const res = await authApi.getMe();
      setUser(res.data);
      setIsAuthenticated(true);
      return res.data;
    } catch (err: unknown) {
      // Trường hợp tài khoản Cognito vừa tạo nhưng chưa đồng bộ vào Database
      if (err instanceof ApiError && err.errorCode === 'USER_NOT_SYNCED') {
        try {
          const syncRes = await authApi.syncUser();
          setUser(syncRes.data);
          setIsAuthenticated(true);
          return syncRes.data;
        } catch {
          tokenStorage.clearTokens();
          setUser(null);
          setIsAuthenticated(false);
          return null;
        }
      }

      // Nếu lỗi 401 hoặc refresh token không hợp lệ
      if (err instanceof ApiError && (err.statusCode === 401 || err.errorCode === 'REFRESH_TOKEN_INVALID')) {
        tokenStorage.clearTokens();
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }

      return null;
    }
  }, []);

  // Khôi phục trạng thái khi người học mở trang hoặc F5 tải lại trang
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (!tokenStorage.hasAccessToken()) {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      await refreshUser();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    restoreSession();

    // Lắng nghe tín hiệu phiên làm việc hết hạn từ tokenStorage / apiClient
    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [refreshUser]);

  // Cập nhật trạng thái ngay lập tức khi đăng nhập thành công
  const login = useCallback((tokens: AuthTokens, profile?: UserProfile) => {
    tokenStorage.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    if (profile) {
      setUser(profile);
      setIsAuthenticated(true);
    } else {
      refreshUser();
    }
  }, [refreshUser]);

  // Đăng xuất: gọi Cognito GlobalSignOut qua backend bridge và dọn sạch dữ liệu client
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Dù API thất bại do mất mạng hoặc token hết hạn, client vẫn phải hoàn tất đăng xuất
    } finally {
      tokenStorage.clearTokens();
      queryClient.clear();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isAuthenticated, isLoading, login, logout, refreshUser],
  );

  // Màn hình Splash Loading phong cách Signly trong lúc khôi phục phiên AWS Cognito
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-canvas)',
          color: 'var(--color-brand-primary)',
          gap: '1.25rem',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-brand-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 0 var(--color-brand-shadow)',
          }}
        >
          <Hand size={32} className="stroke-[2.2]" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1rem', fontWeight: 700 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-brand-accent)' }} />
          <span>Đang đồng bộ dữ liệu Signly...</span>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
