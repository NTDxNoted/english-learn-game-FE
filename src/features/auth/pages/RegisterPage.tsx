import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles } from 'lucide-react';
import { RegisterForm } from '../components/RegisterForm';
import { useToast } from '../../../app/providers/useToast';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const handleRegisterSuccess = (email: string) => {
    success(
      'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để lấy mã xác minh OTP.',
      'AWS Cognito SignUp',
    );
    navigate('/verify-register', { state: { email } });
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

        {/* Form đăng ký tích hợp Zod validation & API Backend / Cognito */}
        <RegisterForm onSuccess={handleRegisterSuccess} />

        <div className="auth-footer">
          <p>
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập tại đây
            </Link>
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Đã đăng ký nhưng chưa xác minh OTP?{' '}
            <Link to="/verify-register" className="auth-link">
              Nhập mã xác minh tại đây
            </Link>
          </p>
          <div className="auth-note">
            <Sparkles size={14} className="inline mr-1" />
            Tài khoản được bảo vệ qua AWS Cognito User Pool. Mã OTP kích hoạt sẽ được gửi tự động qua email.
          </div>
        </div>
      </div>
    </div>
  );
};
