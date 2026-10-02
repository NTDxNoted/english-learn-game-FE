import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Loader2, AlertCircle, Info } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '../schemas/registerSchema';
import { authApi } from '../api/authApi';
import { ApiError } from '../../../types/api.types';
import { useToast } from '../../../app/providers/useToast';

interface RegisterFormProps {
  onSuccess: (email: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const { error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      displayName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setEmailExists(false);
    try {
      await authApi.register({
        email: data.email.trim(),
        displayName: data.displayName.trim(),
        password: data.password,
      });

      onSuccess(data.email.trim());
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'EMAIL_ALREADY_EXISTS') {
          setEmailExists(true);
          setError('email', {
            type: 'server',
            message: 'Email đã được sử dụng',
          });
          return;
        }

        if (err.errorCode === 'WEAK_PASSWORD') {
          setError('password', {
            type: 'server',
            message: err.message || 'Mật khẩu chưa đáp ứng chính sách bảo mật của AWS Cognito',
          });
          return;
        }

        // Gán lỗi theo từng trường nếu backend trả về danh sách errors
        if (err.errors && err.errors.length > 0) {
          err.errors.forEach((fieldErr) => {
            if (fieldErr.field && (fieldErr.field === 'email' || fieldErr.field === 'displayName' || fieldErr.field === 'password')) {
              setError(fieldErr.field as keyof RegisterFormData, {
                type: 'server',
                message: fieldErr.message,
              });
            }
          });
          return;
        }

        toastError(err.message, 'Đăng ký không thành công');
      } else {
        toastError('Lỗi kết nối máy chủ, vui lòng thử lại sau', 'Lỗi hệ thống');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
      {/* Banner cảnh báo email đã tồn tại kèm link sang trang xác minh OTP */}
      {emailExists && (
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
            <span style={{ fontWeight: 700 }}>Email này đã được đăng ký.</span>
            <div style={{ marginTop: '0.25rem' }}>
              Bạn đã đăng ký nhưng chưa xác minh OTP?{' '}
              <Link
                to={`/verify-register?email=${encodeURIComponent(getValues('email'))}`}
                style={{ fontWeight: 800, textDecoration: 'underline' }}
              >
                Nhập mã xác minh tại đây
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Trường Email */}
      <div className="form-group">
        <label className="form-label" htmlFor="register-email">
          Email <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <input
          id="register-email"
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

      {/* Trường Tên hiển thị */}
      <div className="form-group">
        <label className="form-label" htmlFor="register-displayName">
          Tên hiển thị <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <input
          id="register-displayName"
          type="text"
          autoComplete="name"
          className="form-input"
          placeholder="John (3 - 20 ký tự)"
          {...register('displayName')}
          style={errors.displayName ? { borderColor: 'var(--color-error)' } : undefined}
        />
        {errors.displayName && (
          <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600 }}>
            {errors.displayName.message}
          </span>
        )}
      </div>

      {/* Trường Mật khẩu */}
      <div className="form-group">
        <label className="form-label" htmlFor="register-password">
          Mật khẩu <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="form-input"
            placeholder="8 - 64 ký tự, có hoa, thường, số, ký tự đặc biệt"
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

      {/* Trường Nhập lại mật khẩu */}
      <div className="form-group">
        <label className="form-label" htmlFor="register-confirmPassword">
          Nhập lại mật khẩu <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="register-confirmPassword"
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

      {/* Mẹo mật khẩu Cognito */}
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
        <span>Yêu cầu mật khẩu: 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</span>
      </div>

      {/* Nút bấm Submit 3D */}
      <button
        type="submit"
        className="btn-3d w-full mt-2"
        disabled={isSubmitting}
        style={isSubmitting ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Đang đăng ký...</span>
          </>
        ) : (
          <>
            <UserPlus size={18} />
            <span>Đăng ký</span>
          </>
        )}
      </button>
    </form>
  );
};
