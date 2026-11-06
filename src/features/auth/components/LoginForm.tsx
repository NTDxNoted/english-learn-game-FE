import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Clock,
  KeyRound,
} from 'lucide-react';
import { loginSchema, type LoginFormData } from '../schemas/loginSchema';
import { authApi, getCognitoRedirectUri } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../../../app/providers/useToast';
import { ApiError } from '../../../types/api.types';
import { tokenStorage } from '../../../lib/tokenStorage';
import type { AuthTokens, UserProfile } from '../types/auth.types';

const formatOAuthProviderError = (error: string, errorDesc?: string | null): string => {
  if (error === 'access_denied') {
    return 'Bạn đã hủy đăng nhập bằng Google.';
  }
  const normalizedDesc = (errorDesc || '').toLowerCase();
  if (error === 'invalid_scope' || normalizedDesc.includes('invalid_scope')) {
    return 'Cấu hình quyền truy cập Google (scope) trên Cognito chưa đồng bộ. Vui lòng liên hệ quản trị viên.';
  }
  if (normalizedDesc.includes('disabled')) {
    return 'Tài khoản của bạn đã bị vô hiệu hóa trên hệ thống xác thực.';
  }
  return 'Đăng nhập bằng Google không thành công. Vui lòng thử lại.';
};

const GoogleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
    />
  </svg>
);

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordResetRequired, setPasswordResetRequired] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(searchParams.get('accountBlocked') === 'true');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const initialEmail = searchParams.get('email') || '';
  const initialOAuthError = searchParams.get('error');
  const initialOAuthErrorDesc = searchParams.get('error_description');

  const [generalError, setGeneralError] = useState<string | null>(() => {
    if (!initialOAuthError) return null;
    return formatOAuthProviderError(initialOAuthError, initialOAuthErrorDesc);
  });
  const processedOAuthRef = useRef(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialEmail,
      password: '',
    },
  });

  const completeAuthenticatedSession = useCallback(
    async (tokens: AuthTokens, preferredRedirect?: string | null) => {
      tokenStorage.setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      const syncRes = await authApi.syncUser();
      const userProfile: UserProfile = syncRes.data;
      if (userProfile.status !== 'ACTIVE') {
        throw new ApiError({ message: 'Tài khoản không hoạt động.', errorCode: 'ACCOUNT_BLOCKED' }, 403);
      }

      authLogin(tokens, userProfile);
      toastSuccess('Đăng nhập thành công! Chào mừng bạn quay trở lại.', 'Xác thực tài khoản');

      const redirectUrl = preferredRedirect ?? searchParams.get('redirect');
      if (
        redirectUrl &&
        redirectUrl.startsWith('/') &&
        !redirectUrl.startsWith('//') &&
        !redirectUrl.startsWith('/login')
      ) {
        navigate(redirectUrl);
      } else if (userProfile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/topics');
      }
    },
    [authLogin, navigate, searchParams, toastSuccess],
  );

  // Xử lý callback khi quay về từ Google OAuth (?code=... hoặc #access_token=... hoặc ?error=...)
  useEffect(() => {
    if (processedOAuthRef.current) return;

    const oauthError = searchParams.get('error');
    const oauthErrorDesc = searchParams.get('error_description');
    const oauthCode = searchParams.get('code');
    const oauthState = searchParams.get('state');
    const hashString = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const hashParams = new URLSearchParams(hashString);
    const hashAccessToken = hashParams.get('access_token');

    if (!oauthError && !oauthCode && !hashAccessToken) {
      return;
    }

    processedOAuthRef.current = true;

    const cleanUrl = () => {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (oauthError) {
      cleanUrl();
      const message =
        oauthError === 'access_denied'
          ? 'Bạn đã hủy đăng nhập bằng Google.'
          : oauthErrorDesc || 'Đăng nhập bằng Google không thành công. Vui lòng thử lại.';
      toastError(message, 'Đăng nhập Google');
      return;
    }

    const runOAuthCallback = async () => {
      setIsGoogleLoading(true);
      setGeneralError(null);
      setIsLocked(false);
      tokenStorage.notifyUnauthorized();

      try {
        let tokens: AuthTokens;
        if (oauthCode) {
          const redirectUri = getCognitoRedirectUri();
          const exchangeRes = await authApi.exchangeGoogleCode({
            code: oauthCode,
            redirectUri,
          });
          tokens = exchangeRes.data;
        } else {
          tokens = {
            accessToken: hashAccessToken!,
            refreshToken: hashParams.get('refresh_token') || undefined,
            idToken: hashParams.get('id_token') || undefined,
            tokenType: hashParams.get('token_type') || 'Bearer',
            expiresIn: Number(hashParams.get('expires_in')) || 3600,
          };
        }

        cleanUrl();
        const redirectTarget = oauthState || hashParams.get('state') || searchParams.get('redirect');
        await completeAuthenticatedSession(tokens, redirectTarget);
      } catch (err: unknown) {
        cleanUrl();
        tokenStorage.notifyUnauthorized();
        if (err instanceof ApiError && err.errorCode === 'ACCOUNT_BLOCKED') {
          setIsLocked(true);
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : 'Không thể hoàn tất đăng nhập với Google. Vui lòng thử lại.';
        setGeneralError(message);
        toastError(message, 'Lỗi đăng nhập Google');
      } finally {
        setIsGoogleLoading(false);
      }
    };

    void runOAuthCallback();
  }, [completeAuthenticatedSession, searchParams, toastError]);

  const handleGoogleLogin = () => {
    if (isSubmitting || isGoogleLoading) return;
    setGeneralError(null);
    setIsLocked(false);
    setIsGoogleLoading(true);

    const redirectUri = getCognitoRedirectUri();
    const redirectTarget = searchParams.get('redirect') || undefined;
    const authorizeUrl = authApi.getGoogleAuthorizeUrl(redirectUri, redirectTarget);

    if (typeof window !== 'undefined') {
      window.location.assign(authorizeUrl);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    // Reset mọi thông báo lỗi trước đó
    setUnverifiedEmail(null);
    setPasswordResetRequired(null);
    setIsLocked(false);
    setIsRateLimited(false);
    setGeneralError(null);

    tokenStorage.notifyUnauthorized();
    try {
      // 1. Gọi backend POST /api/auth/login (Cognito InitiateAuth)
      const response = await authApi.login({
        email: data.email.trim(),
        password: data.password,
      });

      // 2. Lưu token, gọi /api/auth/sync và điều hướng
      await completeAuthenticatedSession(response.data);
    } catch (err: unknown) {
      tokenStorage.notifyUnauthorized();
      if (err instanceof ApiError) {
        const code = err.errorCode;

        // Xử lý các mã lỗi đặc thù từ AWS Cognito & Backend
        if (code === 'ACCOUNT_NOT_VERIFIED') {
          setUnverifiedEmail(data.email.trim());
          return;
        }

        if (code === 'PASSWORD_RESET_REQUIRED') {
          setPasswordResetRequired(data.email.trim());
          return;
        }

        if (code === 'ACCOUNT_BLOCKED') {
          setIsLocked(true);
          return;
        }

        if (code === 'TOO_MANY_REQUESTS') {
          setIsRateLimited(true);
          return;
        }

        if (code === 'INVALID_CREDENTIALS') {
          setGeneralError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
          return;
        }

        // Lỗi theo từng trường nếu backend trả về danh sách errors
        if (err.errors && err.errors.length > 0) {
          err.errors.forEach((fieldErr) => {
            if (fieldErr.field && (fieldErr.field === 'email' || fieldErr.field === 'password')) {
              setError(fieldErr.field as keyof LoginFormData, {
                type: 'server',
                message: fieldErr.message,
              });
            }
          });
          return;
        }

        setGeneralError(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
        toastError(err.message || 'Đăng nhập thất bại', 'Lỗi đăng nhập');
      } else {
        setGeneralError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
        toastError('Lỗi kết nối máy chủ', 'Lỗi hệ thống');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate aria-busy={isSubmitting}>
      {/* Cảnh báo tài khoản chưa xác minh OTP (ACCOUNT_NOT_VERIFIED) */}
      {unverifiedEmail && (
        <div
          style={{
            backgroundColor: 'var(--color-pastel-peach-light)',
            border: '1.5px solid var(--color-pastel-peach-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: 'var(--color-pastel-peach-text)',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <div style={{ fontWeight: 700 }}>Tài khoản của bạn chưa được xác minh</div>
            <div style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>
              Bạn cần xác minh mã OTP gửi qua email trước khi đăng nhập.{' '}
              <Link
                to={`/verify-register?email=${encodeURIComponent(unverifiedEmail)}`}
                style={{ fontWeight: 800, textDecoration: 'underline' }}
              >
                Nhập mã OTP kích hoạt tại đây
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo yêu cầu đặt lại mật khẩu (PASSWORD_RESET_REQUIRED) */}
      {passwordResetRequired && (
        <div
          style={{
            backgroundColor: 'var(--color-pastel-yellow)',
            border: '1.5px solid var(--color-pastel-yellow-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: 'var(--color-pastel-yellow-text)',
            fontSize: '0.875rem',
          }}
        >
          <KeyRound size={18} className="shrink-0 mt-0.5" />
          <div>
            <div style={{ fontWeight: 700 }}>Yêu cầu đặt lại mật khẩu</div>
            <div style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>
              Mật khẩu của bạn cần được đặt lại theo chính sách an toàn.{' '}
              <Link
                to={`/reset-password?email=${encodeURIComponent(passwordResetRequired)}`}
                style={{ fontWeight: 800, textDecoration: 'underline' }}
              >
                Đặt lại mật khẩu tại đây
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo tài khoản bị khóa (ACCOUNT_BLOCKED) */}
      {isLocked && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1.5px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <div style={{ fontWeight: 700 }}>Tài khoản của bạn đã bị khóa</div>
            <div style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>
              Tài khoản này đã bị tạm dừng hoạt động bởi Quản trị viên. Vui lòng liên hệ ban quản trị để được hỗ trợ mở khóa.
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo giới hạn tần suất gửi yêu cầu (TOO_MANY_REQUESTS) */}
      {isRateLimited && (
        <div
          style={{
            backgroundColor: 'var(--color-pastel-peach-light)',
            border: '1.5px solid var(--color-pastel-peach-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            color: 'var(--color-pastel-peach-text)',
            fontSize: '0.875rem',
          }}
        >
          <Clock size={18} className="shrink-0 mt-0.5" />
          <div>
            <div style={{ fontWeight: 700 }}>Quá nhiều lần đăng nhập không thành công</div>
            <div style={{ marginTop: '0.25rem', lineHeight: 1.4 }}>
              Hệ thống bảo mật đã tạm thời giới hạn yêu cầu. Vui lòng đợi trong giây lát rồi thử lại.
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo sai thông tin đăng nhập hoặc lỗi chung */}
      {generalError && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1.5px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#991b1b',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Trường Email */}
      <div className="form-group">
        <label className="form-label" htmlFor="login-email">
          Email <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <input
          id="login-email"
          required
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="username"
          className="form-input"
          placeholder="learner@example.com"
          {...register('email')}
          style={errors.email ? { borderColor: 'var(--color-error)' } : undefined}
        />
        {errors.email && (
          <span id="login-email-error" className="form-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
            {errors.email.message}
          </span>
        )}
      </div>

      {/* Trường Mật khẩu */}
      <div className="form-group">
        <div className="flex items-center justify-between">
          <label className="form-label" htmlFor="login-password">
            Mật khẩu <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
          </label>
          <Link
            to="/forgot-password"
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-brand-primary)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
          required
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="form-input"
            placeholder="••••••••"
            {...register('password')}
            style={errors.password ? { borderColor: 'var(--color-error)', paddingRight: '2.5rem' } : { paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
            className="auth-password-toggle"
            aria-controls="login-password"
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <span id="login-password-error" className="form-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
            {errors.password.message}
          </span>
        )}
      </div>

      {/* Nút Đăng nhập 3D */}
      <button
        type="submit"
        className="btn-3d w-full mt-2"
        disabled={isSubmitting || isGoogleLoading}
        style={isSubmitting || isGoogleLoading ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <>
            <LogIn size={18} />
            <span>Đăng nhập</span>
          </>
        )}
      </button>

      {/* Phân cách phương thức đăng nhập */}
      <div className="auth-divider" role="separator" aria-label="Hoặc tiếp tục với">
        <span>Hoặc tiếp tục với</span>
      </div>

      {/* Nút Đăng nhập bằng Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isSubmitting || isGoogleLoading}
        className="btn-google-auth"
      >
        {isGoogleLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Đang kết nối với Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon />
            <span>Tiếp tục với Google</span>
          </>
        )}
      </button>
    </form>
  );
};
