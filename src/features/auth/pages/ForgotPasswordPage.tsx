import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/forgotPasswordSchema';
import { authApi } from '../api/authApi';
import { useToast } from '../../../app/providers/useToast';
import { ApiError } from '../../../types/api.types';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { info: toastInfo, error: toastError } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null);

    try {
      // Gọi backend bridge: POST /api/v1/auth/forgot-password (Cognito ForgotPassword)
      await authApi.forgotPassword({ email: data.email.trim() });

      toastInfo(
        'Nếu email tồn tại, AWS Cognito đã gửi mã OTP xác minh qua hộp thư của bạn.',
        'Mã xác minh đặt lại',
      );

      navigate(`/reset-password?email=${encodeURIComponent(data.email.trim())}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'TOO_MANY_REQUESTS') {
          setServerError('Bạn đã yêu cầu gửi mã quá nhiều lần liên tiếp. Vui lòng thử lại sau ít phút.');
          return;
        }

        if (err.errorCode === 'ACCOUNT_NOT_VERIFIED') {
          setServerError('Tài khoản này chưa được kích hoạt OTP đăng ký ban đầu. Vui lòng xác minh tài khoản trước.');
          return;
        }

        setServerError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.');
        toastError(err.message || 'Lỗi yêu cầu gửi mã', 'Thất bại');
      } else {
        setServerError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
      }
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header với Icon Logo Badge */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <HelpCircle size={28} />
          </div>
          <h1 className="auth-title">Quên mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập email của bạn để nhận mã OTP khôi phục mật khẩu từ AWS Cognito
          </p>
        </div>

        {/* Cảnh báo lỗi máy chủ */}
        {serverError && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1.5px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#991b1b',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Địa chỉ Email <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
            </label>
            <input
              id="forgot-email"
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

          <button
            type="submit"
            className="btn-3d w-full mt-2"
            disabled={isSubmitting}
            style={isSubmitting ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang gửi mã xác minh...</span>
              </>
            ) : (
              <>
                <span>Tiếp tục đặt lại mật khẩu</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>Quay lại Đăng nhập</span>
          </Link>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Để bảo vệ thông tin tài khoản, hệ thống sẽ gửi mã đến email nếu địa chỉ tồn tại trên AWS Cognito.
          </div>
        </div>
      </div>
    </div>
  );
};
