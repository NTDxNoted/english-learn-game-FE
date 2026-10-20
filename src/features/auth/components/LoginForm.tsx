import React, { useState } from 'react';
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
import { authApi } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../../../app/providers/useToast';
import { ApiError } from '../../../types/api.types';
import type { UserProfile } from '../types/auth.types';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordResetRequired, setPasswordResetRequired] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const initialEmail = searchParams.get('email') || '';

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

  const onSubmit = async (data: LoginFormData) => {
    // Reset mọi thông báo lỗi trước đó
    setUnverifiedEmail(null);
    setPasswordResetRequired(null);
    setIsLocked(false);
    setIsRateLimited(false);
    setGeneralError(null);

    try {
      // 1. Gọi backend POST /api/v1/auth/login (Cognito InitiateAuth)
      const response = await authApi.login({
        email: data.email.trim(),
        password: data.password,
      });

      const tokens = response.data;

      // 2. LƯU CHỈ accessToken và refreshToken VÀO localStorage QUA tokenStorage
      // TUYỆT ĐỐI KHÔNG LƯU idToken (theo chuẩn bảo mật Signly AWS Cognito)
      // 3. Gọi GET /api/v1/users/me để lấy hồ sơ và xác định vai trò
      let userProfile: UserProfile | undefined;
      try {
        const meRes = await authApi.getMe();
        userProfile = meRes.data;
      } catch (meErr) {
        // Trường hợp người dùng mới từ Cognito chưa có record trong bảng users
        if (meErr instanceof ApiError && meErr.errorCode === 'USER_NOT_SYNCED') {
          try {
            const syncRes = await authApi.syncUser();
            userProfile = syncRes.data;
          } catch {
            // Giữ undefined nếu đồng bộ gặp sự cố tạm thời
          }
        }
      }

      // Cập nhật AuthContext state
      authLogin(tokens, userProfile);

      toastSuccess('Đăng nhập thành công! Chào mừng bạn quay trở lại.', 'Xác thực tài khoản');

      // 4. Chuyển hướng theo query param redirect hoặc mặc định về /topics
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && !redirectUrl.startsWith('/login')) {
        navigate(decodeURIComponent(redirectUrl));
      } else if (userProfile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/topics');
      }
    } catch (err: unknown) {
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

        if (code === 'ACCOUNT_LOCKED') {
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
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
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

      {/* Cảnh báo tài khoản bị khóa (ACCOUNT_LOCKED) */}
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
          type="email"
          autoComplete="email"
          className="form-input"
          placeholder="learner@example.com"
          {...register('email')}
          style={errors.email ? { borderColor: 'var(--color-error)' } : undefined}
        />
        {errors.email && (
          <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
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
            tabIndex={-1}
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
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
            tabIndex={-1}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
            {errors.password.message}
          </span>
        )}
      </div>

      {/* Nút Đăng nhập 3D */}
      <button
        type="submit"
        className="btn-3d w-full mt-2"
        disabled={isSubmitting}
        style={isSubmitting ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
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
    </form>
  );
};
