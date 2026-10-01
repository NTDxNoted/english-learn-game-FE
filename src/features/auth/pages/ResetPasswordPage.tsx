import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../../app/providers/useToast';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success } = useToast();

  const stateEmail = (location.state as { email?: string } | undefined)?.email || '';
  const [email, setEmail] = useState<string>(stateEmail);
  const [code, setCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    success('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.', 'Thành công');
    navigate('/login');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Lock size={28} />
          </div>
          <h1 className="auth-title">Đặt lại mật khẩu</h1>
          <p className="auth-subtitle">Nhập mã OTP gửi qua email và mật khẩu mới của bạn</p>
        </div>

        <form onSubmit={handleReset} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reset-email">
              Địa chỉ Email
            </label>
            <input
              id="reset-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-code">
              Mã xác minh OTP (Cognito)
            </label>
            <input
              id="reset-code"
              type="text"
              maxLength={6}
              className="form-input text-center text-lg font-bold"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              Mật khẩu mới (8-64 ký tự, chữ hoa, thường, số &amp; ký tự đặc biệt)
            </label>
            <input
              id="new-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2">
            <CheckCircle2 size={18} />
            <span>Xác nhận đặt lại mật khẩu</span>
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
            <span>Hủy bỏ và quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
