import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '../../../app/providers/useToast';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { info } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    info('Nếu email tồn tại, AWS Cognito đã gửi mã OTP đặt lại mật khẩu', 'Quên mật khẩu');
    navigate('/reset-password', { state: { email } });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <HelpCircle size={28} />
          </div>
          <h1 className="auth-title">Quên mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập email của bạn để nhận mã OTP khôi phục mật khẩu từ AWS Cognito
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Địa chỉ Email
            </label>
            <input
              id="forgot-email"
              type="email"
              className="form-input"
              placeholder="user1@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2">
            <span>Tiếp tục đặt lại mật khẩu</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
