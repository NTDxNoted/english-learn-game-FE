import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { tokenStorage } from '../../../lib/tokenStorage';
import { useToast } from '../../../app/providers/useToast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success } = useToast();
  const isSessionExpired = searchParams.get('sessionExpired') === 'true';

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Giả lập token tạm thời phục vụ kiểm thử luồng SETUP-04
    tokenStorage.setAccessToken('mock-jwt-token-sample-for-setup');
    success('Đăng nhập thành công (Mock Token)! Sẵn sàng cho AUTH-02.', 'Xác thực');
    navigate('/topics');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <LogIn size={28} />
          </div>
          <h1 className="auth-title">Đăng nhập tài khoản</h1>
          <p className="auth-subtitle">Nhập email và mật khẩu của bạn để tiếp tục</p>
        </div>

        {isSessionExpired && (
          <div className="alert alert-warning mb-4">
            <AlertCircle size={18} />
            <span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</span>
          </div>
        )}

        <form onSubmit={handleMockLogin} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="user1@gmail.com"
              defaultValue="learner@gmail.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              defaultValue="Abcd1234"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2">
            <LogIn size={18} />
            <span>Đăng nhập (Sẵn sàng cho AUTH-02)</span>
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Chưa có tài khoản?{' '}
            <Link to="/register" className="auth-link">
              Đăng ký ngay
            </Link>
          </p>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Issue AUTH-02 sẽ tích hợp form Zod và gọi endpoint POST /api/v1/auth/login.
          </div>
        </div>
      </div>
    </div>
  );
};
