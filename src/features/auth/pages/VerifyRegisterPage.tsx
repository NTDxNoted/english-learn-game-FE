import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { KeyRound, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../../app/providers/useToast';

export const VerifyRegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success } = useToast();

  const stateEmail = (location.state as { email?: string } | undefined)?.email || '';
  const [email, setEmail] = useState<string>(stateEmail);
  const [code, setCode] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);

  const canResend = countdown === 0;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canResend || !email) return;

    setCountdown(60);
    success(`Đã gửi lại mã xác minh tới ${email}`, 'Gửi lại OTP (Cognito)');
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    success('Xác minh tài khoản thành công! Sẵn sàng cho AUTH-01 & AUTH-02.', 'Thành công');
    navigate('/login');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <KeyRound size={28} />
          </div>
          <h1 className="auth-title">Xác minh tài khoản</h1>
          <p className="auth-subtitle">
            Nhập mã OTP gồm 6 chữ số được gửi tới hộp thư của bạn từ AWS Cognito
          </p>
        </div>

        <form onSubmit={handleVerify} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="verify-email">
              Địa chỉ Email
            </label>
            <div className="relative">
              <input
                id="verify-email"
                type="email"
                className="form-input"
                placeholder="user1@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="otp-code">
              Mã xác minh OTP (6 chữ số)
            </label>
            <input
              id="otp-code"
              type="text"
              maxLength={6}
              className="form-input text-center text-xl font-bold tracking-widest"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              required
            />
          </div>

          <button type="submit" className="btn-3d w-full mt-2">
            <CheckCircle2 size={18} />
            <span>Xác nhận kích hoạt tài khoản</span>
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResendCode}
            disabled={!canResend}
          >
            <RotateCw size={14} className={!canResend ? 'animate-spin' : ''} />
            <span>
              {canResend
                ? 'Gửi lại mã OTP'
                : `Gửi lại mã sau ${countdown}s`}
            </span>
          </button>
        </div>

        <div className="auth-footer">
          <p>
            Đã hoàn tất xác minh?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập ngay
            </Link>
          </p>
          <div className="auth-note">
            <AlertCircle size={14} className="inline mr-1" />
            Issue AUTH-01 tích hợp gọi POST /api/v1/auth/confirm-register và resend-code với AWS Cognito.
          </div>
        </div>
      </div>
    </div>
  );
};

