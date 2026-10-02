import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LogIn, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const isSessionExpired = searchParams.get('sessionExpired') === 'true';
  const isRegistered = searchParams.get('registered') === 'true';
  const isVerified = searchParams.get('verified') === 'true';
  const isPasswordReset = searchParams.get('reset') === 'true';

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header với Icon Logo Badge */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <LogIn size={28} />
          </div>
          <h1 className="auth-title">Đăng nhập tài khoản</h1>
          <p className="auth-subtitle">Nhập email và mật khẩu của bạn để tiếp tục hành trình</p>
        </div>

        {/* Thông báo phiên làm việc hết hạn */}
        {isSessionExpired && (
          <div
            style={{
              backgroundColor: 'var(--color-pastel-yellow)',
              border: '1.5px solid var(--color-pastel-yellow-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-pastel-yellow-text)',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</span>
          </div>
        )}

        {/* Thông báo đăng ký thành công */}
        {isRegistered && (
          <div
            style={{
              backgroundColor: 'var(--color-pastel-mint)',
              border: '1.5px solid var(--color-pastel-mint-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-pastel-mint-text)',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span>Đăng ký thành công! Hãy đăng nhập để bắt đầu trải nghiệm.</span>
          </div>
        )}

        {/* Thông báo xác minh OTP thành công */}
        {isVerified && (
          <div
            style={{
              backgroundColor: 'var(--color-pastel-mint)',
              border: '1.5px solid var(--color-pastel-mint-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-pastel-mint-text)',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span>Tài khoản đã kích hoạt thành công! Hãy đăng nhập ngay.</span>
          </div>
        )}

        {/* Thông báo đặt lại mật khẩu thành công */}
        {isPasswordReset && (
          <div
            style={{
              backgroundColor: 'var(--color-pastel-mint)',
              border: '1.5px solid var(--color-pastel-mint-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-pastel-mint-text)',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span>Đặt lại mật khẩu thành công! Vui lòng sử dụng mật khẩu mới.</span>
          </div>
        )}

        {/* Form Đăng nhập xử lý AWS Cognito */}
        <LoginForm />

        {/* Điều hướng chân trang */}
        <div className="auth-footer">
          <p>
            Chưa có tài khoản?{' '}
            <Link to="/register" className="auth-link">
              Đăng ký ngay
            </Link>
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Đã đăng ký nhưng chưa xác minh OTP?{' '}
            <Link to="/verify-register" className="auth-link">
              Xác minh tại đây
            </Link>
          </p>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Xác thực bảo mật qua AWS Cognito User Pool. Tự động đồng bộ và làm mới phiên học.
          </div>
        </div>
      </div>
    </div>
  );
};
