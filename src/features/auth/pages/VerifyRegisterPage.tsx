import React from 'react';
import { useLocation, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { VerifyRegisterForm } from '../components/VerifyRegisterForm';
import { useToast } from '../../../app/providers/useToast';

export const VerifyRegisterPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success } = useToast();

  // Nhận email từ route state hoặc query parameter (?email=...)
  const emailFromState = (location.state as { email?: string } | undefined)?.email;
  const emailFromQuery = searchParams.get('email') || '';
  const initialEmail = emailFromState || emailFromQuery || '';

  const handleVerifySuccess = () => {
    success(
      'Kích hoạt tài khoản thành công! Bạn có thể đăng nhập để bắt đầu hành trình học tập.',
      'AWS Cognito Verified',
    );
    navigate(`/login?verified=true&email=${encodeURIComponent(initialEmail)}`);
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

        {/* Form xác minh OTP tích hợp Zod validation & API Backend / Cognito */}
        <VerifyRegisterForm
          initialEmail={initialEmail}
          onSuccess={handleVerifySuccess}
        />

        <div className="auth-footer">
          <p>
            Đã hoàn tất xác minh?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập ngay
            </Link>
          </p>
          <div className="auth-note">
            <ShieldCheck size={14} className="inline mr-1" />
            Mã OTP có thời hạn theo quy định của AWS Cognito User Pool. Vui lòng kiểm tra kỹ cả thư mục Hộp thư đến (Inbox) và Thư rác (Spam).
          </div>
        </div>
      </div>
    </div>
  );
};
