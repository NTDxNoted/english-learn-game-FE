import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles } from 'lucide-react';
import { useToast } from '../../../app/providers/useToast';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const handleMockRegister = (e: React.FormEvent) => {
    e.preventDefault();
    success('Đăng ký thành công! Mã OTP đã được gửi từ AWS Cognito.', 'Xác thực OTP');
    navigate('/verify-register', { state: { email: 'user1@gmail.com' } });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <UserPlus size={28} />
          </div>
          <h1 className="auth-title">Đăng ký tài khoản</h1>
          <p className="auth-subtitle">Tạo tài khoản người học để bắt đầu luyện tập</p>
        </div>

        <form onSubmit={handleMockRegister} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="user1@gmail.com"
              defaultValue="learner@gmail.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-displayName">
              Tên hiển thị (3-20 ký tự)
            </label>
            <input
              id="register-displayName"
              type="text"
              className="form-input"
              placeholder="John"
              defaultValue="John"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Mật khẩu (Có chữ hoa, thường, số &amp; ký tự đặc biệt)
            </label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              defaultValue="Password@123"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2">
            <UserPlus size={18} />
            <span>Đăng ký (Sẵn sàng cho AUTH-01)</span>
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập tại đây
            </Link>
          </p>
          <p className="text-xs text-muted">
            Đã đăng ký nhưng chưa xác minh OTP?{' '}
            <Link to="/verify-register" className="auth-link">
              Nhập mã xác minh tại đây
            </Link>
          </p>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Issue AUTH-01 gọi POST /api/v1/auth/register, Cognito gửi email OTP và chuyển tiếp sang /verify-register.
          </div>
        </div>
      </div>
    </div>
  );
};
