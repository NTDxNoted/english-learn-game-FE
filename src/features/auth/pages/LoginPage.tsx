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
    // Giả lập lưu cả accessToken và refreshToken từ AWS Cognito phục vụ kiểm thử SETUP-04
    tokenStorage.setTokens({
      accessToken: 'mock-cognito-access-token-sample',
      refreshToken: 'mock-cognito-refresh-token-sample',
    });
    success('Đăng nhập thành công (Lưu accessToken & refreshToken)! Sẵn sàng cho AUTH-02.', 'Xác thực AWS Cognito');
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
            <div className="flex items-center justify-between">
              <label className="form-label" htmlFor="password">
                Mật khẩu
              </label>
              <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              defaultValue="Password@123"
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
          <p className="text-xs text-muted">
            Đã đăng ký nhưng chưa xác minh OTP?{' '}
            <Link to="/verify-register" className="auth-link">
              Xác minh tại đây
            </Link>
          </p>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Issue AUTH-02 gọi POST /api/v1/auth/login. Token do AWS Cognito cấp, backend làm cầu nối.
          </div>
        </div>
      </div>
    </div>
  );
};
