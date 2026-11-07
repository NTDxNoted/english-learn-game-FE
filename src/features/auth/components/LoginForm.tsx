import React, { useCallback, useEffect, useState } from 'react';
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
import {
  authApi,
  clearGoogleOAuthTransaction,
  sanitizeReturnTo,
} from '../api/authApi';
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

const resolveGoogleFlowError = (
  err: unknown,
): { locked?: boolean; rateLimited?: boolean; message?: string } => {
  if (err instanceof ApiError) {
    const code = err.errorCode;
    if (code === 'ACCOUNT_BLOCKED') {
      return { locked: true };
    }
    if (code === 'TOO_MANY_REQUESTS' || err.statusCode === 429) {
      return { rateLimited: true };
    }
    if (
      code === 'EMAIL_ALREADY_EXISTS' ||
      code === 'GOOGLE_ACCOUNT_EMAIL_CONFLICT' ||
      err.statusCode === 409
    ) {
      return {
        message: 'Email đã thuộc tài khoản khác. Vui lòng đăng nhập bằng phương thức đã đăng ký.',
      };
    }
    if (code === 'ACCOUNT_INACTIVE') {
      return { message: 'Tài khoản của bạn hiện không ở trạng thái hoạt động.' };
    }
    if (code === 'OAUTH_CODE_INVALID') {
      return {
        message: 'Phiên đăng nhập Google không còn hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      };
    }
    if (code === 'OAUTH_STATE_INVALID') {
      return {
        message: 'Phiên xác thực Google không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập lại.',
      };
    }
    if (code === 'OAUTH_REDIRECT_URI_INVALID' || code === 'COGNITO_OAUTH_CONFIG_ERROR') {
      return {
        message: 'Cấu hình đăng nhập Google chưa đồng bộ. Vui lòng liên hệ quản trị viên.',
      };
    }
    if (code === 'COGNITO_OAUTH_FORBIDDEN') {
      return {
        message: 'Yêu cầu đăng nhập Google đã bị từ chối bởi chính sách bảo mật.',
      };
    }
    if (code === 'COGNITO_UNAVAILABLE' || err.statusCode === 503) {
      return {
        message: 'Dịch vụ xác thực Google tạm thời gián đoạn. Vui lòng thử lại sau giây lát.',
      };
    }
    return {
      message: err.message || 'Không thể hoàn tất đăng nhập với Google. Vui lòng thử lại.',
    };
  }
  return {
    message: 'Không thể kết nối tới máy chủ để xác thực Google. Vui lòng thử lại.',
  };
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

  const commitAuthenticatedSession = useCallback(
    (tokens: AuthTokens, userProfile: UserProfile, preferredRedirect?: string | null) => {
      authLogin(tokens, userProfile);
      toastSuccess('Đăng nhập thành công! Chào mừng bạn quay trở lại.', 'Xác thực tài khoản');

      const safeRedirect = sanitizeReturnTo(preferredRedirect ?? searchParams.get('redirect'));
      if (safeRedirect && (!safeRedirect.startsWith('/admin') || userProfile?.role === 'admin')) {
        navigate(safeRedirect);
      } else if (userProfile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/topics');
      }
    },
    [authLogin, navigate, searchParams, toastSuccess],
  );

  // Xử lý callback khi quay về từ Google OAuth (/callback?code=...&state=... hoặc ?error=...)
  useEffect(() => {
    const oauthError = searchParams.get('error');
    const oauthErrorDesc = searchParams.get('error_description');
    const oauthCode = searchParams.get('code');
    const oauthState = searchParams.get('state');

    if (!oauthError && !oauthCode) {
      return;
    }

    let cancelled = false;

    const cleanUrl = () => {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (oauthError) {
      cleanUrl();
      clearGoogleOAuthTransaction();
      const message = formatOAuthProviderError(oauthError, oauthErrorDesc);
      toastError(message, 'Đăng nhập Google');
      return;
    }

    const runOAuthCallback = async () => {
      setIsGoogleLoading(true);
      setGeneralError(null);
      setIsLocked(false);
      setIsRateLimited(false);
      tokenStorage.notifyUnauthorized();
      cleanUrl();

      try {
        const result = await authApi.completeGoogleLoginOnce(oauthCode!, oauthState);
        if (cancelled) return;
        commitAuthenticatedSession(result.tokens, result.profile, result.returnTo);
      } catch (err: unknown) {
        if (cancelled) return;
        tokenStorage.notifyUnauthorized();
        const resolved = resolveGoogleFlowError(err);
        if (resolved.locked) {
          setIsLocked(true);
          return;
        }
        if (resolved.rateLimited) {
          setIsRateLimited(true);
          return;
        }
        if (resolved.message) {
          setGeneralError(resolved.message);
          toastError(resolved.message, 'Lỗi đăng nhập Google');
        }
      } finally {
        if (!cancelled) {
          setIsGoogleLoading(false);
        }
      }
    };

    void runOAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [commitAuthenticatedSession, searchParams, toastError]);

  const handleGoogleLogin = async () => {
    if (isSubmitting || isGoogleLoading) return;
    setGeneralError(null);
    setIsLocked(false);
    setIsRateLimited(false);
    setIsGoogleLoading(true);
    tokenStorage.notifyUnauthorized();

    try {
      const redirectTarget = searchParams.get('redirect');
      const authorizeUrl = await authApi.startGoogleLogin(redirectTarget);
      if (typeof window !== 'undefined') {
        window.location.assign(authorizeUrl);
      }
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      const resolved = resolveGoogleFlowError(err);
      const message = resolved.message || 'Không thể khởi tạo đăng nhập Google.';
      setGeneralError(message);
      toastError(message, 'Lỗi đăng nhập Google');
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

      const tokens = response.data;

      // 2. Đồng bộ bằng accessToken tạm trước khi commit phiên vào tokenStorage
      const syncRes = await authApi.syncUser(tokens.accessToken);
      const userProfile: UserProfile = syncRes.data;
      if (userProfile.status === 'BLOCKED') {
        throw new ApiError({ message: 'Tài khoản của bạn đã bị khóa.', errorCode: 'ACCOUNT_BLOCKED' }, 403);
      }
      if (userProfile.status !== 'ACTIVE') {
        throw new ApiError({ message: 'Tài khoản không hoạt động.', errorCode: 'ACCOUNT_INACTIVE' }, 403);
      }

      // 3. Chỉ lưu token và thiết lập AuthContext sau khi Sync trả ACTIVE
      commitAuthenticatedSession(tokens, userProfile);
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

        if (code === 'TOO_MANY_REQUESTS' || err.statusCode === 429) {
          setIsRateLimited(true);
          return;
        }

        if (code === 'EMAIL_ALREADY_EXISTS' || err.statusCode === 409) {
          setGeneralError('Email đã thuộc tài khoản khác. Vui lòng kiểm tra lại phương thức đăng nhập.');
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
