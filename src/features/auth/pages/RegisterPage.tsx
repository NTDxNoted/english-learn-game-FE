import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Sparkles } from 'lucide-react';

export const RegisterPage: React.FC = () => {
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

        <div className="p-4 rounded-lg bg-surface-muted text-center mb-4">
          <p className="text-sm text-muted">
            Trang đăng ký (Sẵn sàng triển khai chi tiết ở <strong>AUTH-01</strong> với Zod schema &amp; POST
            /api/v1/auth/register).
          </p>
        </div>

        <div className="auth-footer">
          <p>
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập tại đây
            </Link>
          </p>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Issue AUTH-01 sẽ hiện form Zod và bắt lỗi EMAIL_ALREADY_EXISTS.
          </div>
        </div>
      </div>
    </div>
  );
};
