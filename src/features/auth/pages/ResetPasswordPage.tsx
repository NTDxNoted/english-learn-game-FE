import React, { useState } from 'react';
import { useLocation, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Lock,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/resetPasswordSchema';
import { authApi } from '../api/authApi';
import { useToast } from '../../../app/providers/useToast';
import { ApiError } from '../../../types/api.types';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isOtpExpired, setIsOtpExpired] = useState(false);

  const emailFromState = (location.state as { email?: string } | undefined)?.email;
  const emailFromQuery = searchParams.get('email') || '';
  const initialEmail = emailFromState || emailFromQuery || '';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null);
    setIsOtpExpired(false);

    try {
      // Gọi backend bridge: POST /api/v1/auth/reset-password (Cognito ConfirmForgotPassword)
      await authApi.resetPassword({
        email: data.email.trim(),
        code: data.code.trim(),
        newPassword: data.newPassword,
      });

      toastSuccess(
        'Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới của bạn.',
        'AWS Cognito Success',
      );

      navigate(`/login?reset=true&email=${encodeURIComponent(data.email.trim())}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'OTP_INVALID') {
          setError('code', {
            type: 'server',
            message: 'Mã xác minh không chính xác',
          });
          setServerError('Mã xác minh không đúng. Vui lòng kiểm tra lại email của bạn.');
          return;
        }

        if (err.errorCode === 'OTP_EXPIRED') {
          setIsOtpExpired(true);
          setError('code', {
            type: 'server',
            message: 'Mã xác minh đã hết hạn',
          });
          setServerError('Mã xác minh đã hết hạn. Vui lòng yêu cầu mã xác minh mới.');
          return;
        }

        if (err.errorCode === 'WEAK_PASSWORD') {
          setError('newPassword', {
            type: 'server',
            message: err.message || 'Mật khẩu chưa đáp ứng chính sách bảo mật của AWS Cognito',
          });
          return;
        }

        if (err.errorCode === 'TOO_MANY_REQUESTS') {
          setServerError('Bạn đã thử nhập mã quá nhiều lần. Vui lòng đợi trong giây lát.');
          return;
        }

        setServerError(err.message || 'Đặt lại mật khẩu không thành công. Vui lòng thử lại.');
        toastError(err.message || 'Đặt lại mật khẩu thất bại', 'Lỗi');
      } else {
        setServerError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
      }
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header với Icon Logo Badge */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Lock size={28} />
          </div>
          <h1 className="auth-title">Đặt lại mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập mã OTP gồm 6 chữ số từ email và thiết lập mật khẩu mới
          </p>
        </div>

        {/* Thông báo lỗi server */}
        {serverError && (
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
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span>{serverError}</span>
              {isOtpExpired && (
                <div style={{ marginTop: '0.35rem' }}>
                  <Link
                    to="/forgot-password"
                    style={{ color: 'var(--color-brand-primary)', textDecoration: 'underline', fontWeight: 700 }}
                  >
                    Bấm vào đây để yêu cầu mã mới
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          {/* Trường Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reset-email">
              Địa chỉ Email <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
            </label>
            <input
              id="reset-email"
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

          {/* Trường Mã OTP */}
          <div className="form-group">
            <div className="flex items-center justify-between">
              <label className="form-label" htmlFor="reset-code">
                Mã xác minh OTP (6 chữ số) <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
              </label>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.8rem', color: 'var(--color-brand-primary)', fontWeight: 700, textDecoration: 'none' }}
              >
                Gửi lại mã?
              </Link>
            </div>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="form-input"
              style={{
                textAlign: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: '0.3em',
                ...(errors.code ? { borderColor: 'var(--color-error)' } : {}),
              }}
              placeholder="123456"
              {...register('code')}
            />
            {errors.code && (
              <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
                {errors.code.message}
              </span>
            )}
          </div>

          {/* Mật khẩu mới */}
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              Mật khẩu mới <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="form-input"
                placeholder="8 - 64 ký tự, có hoa, thường, số, ký tự đặc biệt"
                {...register('newPassword')}
                style={errors.newPassword ? { borderColor: 'var(--color-error)', paddingRight: '2.5rem' } : { paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
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
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
                {errors.newPassword.message}
              </span>
            )}
          </div>

          {/* Nhập lại mật khẩu mới */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Nhập lại mật khẩu mới <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="form-input"
                placeholder="••••••••"
                {...register('confirmPassword')}
                style={errors.confirmPassword ? { borderColor: 'var(--color-error)', paddingRight: '2.5rem' } : { paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* Tiêu chuẩn mật khẩu AWS Cognito */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <Info size={14} className="shrink-0" />
            <span>Mật khẩu: 8-64 ký tự, có chữ hoa, thường, số và ký tự đặc biệt.</span>
          </div>

          <button
            type="submit"
            className="btn-3d w-full mt-2"
            disabled={isSubmitting}
            style={isSubmitting ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xử lý đặt lại...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Xác nhận mật khẩu mới</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

