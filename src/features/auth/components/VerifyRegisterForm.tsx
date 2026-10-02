import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, RotateCw, Loader2, AlertCircle } from 'lucide-react';
import { verifyRegisterSchema, type VerifyRegisterFormData } from '../schemas/verifyRegisterSchema';
import { authApi } from '../api/authApi';
import { ApiError } from '../../../types/api.types';
import { useToast } from '../../../app/providers/useToast';

interface VerifyRegisterFormProps {
  initialEmail?: string;
  onSuccess: () => void;
}

export const VerifyRegisterForm: React.FC<VerifyRegisterFormProps> = ({
  initialEmail = '',
  onSuccess,
}) => {
  const [countdown, setCountdown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const canResend = countdown === 0;

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VerifyRegisterFormData>({
    resolver: zodResolver(verifyRegisterSchema),
    defaultValues: {
      email: initialEmail,
      code: '',
    },
  });

  // Đếm ngược 60 giây gửi lại mã OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: VerifyRegisterFormData) => {
    setServerError(null);
    try {
      await authApi.confirmRegister({
        email: data.email.trim(),
        code: data.code.trim(),
      });

      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'OTP_INVALID') {
          setError('code', {
            type: 'server',
            message: 'Mã xác minh không đúng hoặc không tồn tại',
          });
          setServerError('Mã xác minh không đúng. Vui lòng kiểm tra lại email.');
          return;
        }

        if (err.errorCode === 'OTP_EXPIRED') {
          setError('code', {
            type: 'server',
            message: 'Mã xác minh đã hết hạn',
          });
          setServerError('Mã xác minh đã hết hạn. Vui lòng bấm "Gửi lại mã OTP" bên dưới.');
          return;
        }

        if (err.errorCode === 'TOO_MANY_REQUESTS') {
          setServerError('Bạn đã thao tác quá nhiều lần. Vui lòng đợi ít phút trước khi thử lại.');
          return;
        }

        setServerError(err.message || 'Xác minh không thành công, vui lòng thử lại.');
      } else {
        setServerError('Lỗi kết nối máy chủ, vui lòng thử lại sau.');
      }
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;

    const trimmedEmail = getValues('email')?.trim();
    if (!trimmedEmail) {
      setError('email', {
        type: 'manual',
        message: 'Vui lòng nhập email để nhận lại mã xác minh',
      });
      return;
    }

    setIsResending(true);
    setServerError(null);

    try {
      await authApi.resendCode({ email: trimmedEmail });
      setCountdown(60);
      toastSuccess(`Mã xác minh mới đã được gửi tới ${trimmedEmail}`, 'Gửi lại mã OTP');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'TOO_MANY_REQUESTS') {
          toastError('Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng đợi ít phút.', 'Giới hạn gửi mã');
        } else {
          toastError(err.message, 'Gửi lại mã thất bại');
        }
      } else {
        toastError('Lỗi kết nối máy chủ', 'Lỗi hệ thống');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
      {/* Thông báo lỗi từ server */}
      {serverError && (
        <div
          style={{
            backgroundColor: 'var(--color-pastel-peach-light)',
            border: '1.5px solid var(--color-pastel-peach-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--color-pastel-peach-text)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Trường Email */}
      <div className="form-group">
        <label className="form-label" htmlFor="verify-email">
          Email đăng ký <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <input
          id="verify-email"
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
        <label className="form-label" htmlFor="otp-code">
          Mã xác minh OTP (6 chữ số) <span style={{ color: 'var(--color-brand-accent)' }}>*</span>
        </label>
        <input
          id="otp-code"
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

      {/* Nút xác nhận 3D */}
      <button
        type="submit"
        className="btn-3d w-full mt-2"
        disabled={isSubmitting}
        style={isSubmitting ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Đang xác nhận...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            <span>Xác nhận kích hoạt tài khoản</span>
          </>
        )}
      </button>

      {/* Nút Gửi lại mã có đếm ngược 60s */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend || isResending}
          className="btn-ghost"
          style={{
            fontSize: '0.875rem',
            color: canResend ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
            cursor: canResend && !isResending ? 'pointer' : 'not-allowed',
            fontWeight: 700,
          }}
        >
          {isResending ? (
            <>
              <Loader2 size={14} className="animate-spin inline mr-1" />
              <span>Đang gửi mã mới...</span>
            </>
          ) : (
            <>
              <RotateCw size={14} className={`inline mr-1 ${!canResend ? 'opacity-60' : ''}`} />
              <span>
                {canResend ? 'Gửi lại mã xác minh' : `Gửi lại mã sau ${countdown}s`}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
