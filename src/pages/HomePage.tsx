import React from 'react';
import { Link } from 'react-router-dom';
import {
  Gamepad2,
  BookOpen,
  Trophy,
  ShieldCheck,
  Flame,
  Cloud,
  Volume2,
} from 'lucide-react';
import { useToast } from '../app/providers/useToast';

export const HomePage: React.FC = () => {
  const { success, warning, info } = useToast();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Cloud size={16} className="text-amber-400" />
          <span>Hệ thống Tích hợp Dịch vụ Đám mây AWS (Cognito, Polly, S3) &amp; AI MediaPipe</span>
        </div>
        <h1 className="hero-title">
          Chinh phục Từ vựng Tiếng Anh cùng <br />
          <span className="gradient-text">Tương tác Cử chỉ Bàn tay</span>
        </h1>
        <p className="hero-subtitle">
          Ghép chữ cái tiếng Anh bằng cử chỉ ngón tay qua camera (MediaPipe Hands) hoặc chuột máy
          tính. Hệ thống xác thực bảo mật chuẩn Enterprise qua AWS Cognito và phát âm chuẩn bản xứ với AWS Polly.
        </p>

        <div className="hero-cta-group">
          <Link to="/topics" className="btn btn-primary btn-lg">
            <BookOpen size={20} />
            <span>Khám phá Chủ đề</span>
          </Link>
          <Link to="/leaderboard" className="btn btn-outline btn-lg">
            <Trophy size={20} />
            <span>Xem Bảng xếp hạng</span>
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon bg-indigo">
            <Gamepad2 size={24} />
          </div>
          <h3 className="feature-title">Nhận diện Cử chỉ Tay (AI)</h3>
          <p className="feature-desc">
            Sử dụng MediaPipe hand tracking để nhận biết ngón trỏ và ngón cái, cho phép bạn tương
            tác gắp thả ký tự tự nhiên ngay trước webcam.
          </p>
          <div className="card-link-placeholder">SETUP-04 &amp; GAME-01</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon bg-purple">
            <Cloud size={24} />
          </div>
          <h3 className="feature-title">Xác thực AWS Cognito</h3>
          <p className="feature-desc">
            Đăng ký, xác minh OTP qua email, đăng nhập và tự động làm mới accessToken với AWS Cognito
            thông qua Backend API Bridge bảo mật cao.
          </p>
          <div className="card-link-placeholder">AUTH-01..04 (AWS COGNITO)</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon bg-emerald">
            <Volume2 size={24} />
          </div>
          <h3 className="feature-title">Phát âm AWS Polly &amp; S3</h3>
          <p className="feature-desc">
            Giọng phát âm chuẩn người bản xứ được tổng hợp tự động bằng AWS Polly và lưu trữ tối ưu
            trên AWS S3 / CloudFront CDN.
          </p>
          <div className="card-link-placeholder">AUDIO-01 &amp; VOCAB-01</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon bg-emerald">
            <Flame size={24} />
          </div>
          <h3 className="feature-title">Tiến trình &amp; Chuỗi Streak</h3>
          <p className="feature-desc">
            Theo dõi tỷ lệ hoàn thành từ vựng, tự động duy trì chuỗi ngày học liên tiếp để nhận thêm
            điểm thưởng và đua top bảng xếp hạng tuần.
          </p>
          <div className="card-link-placeholder">PROGRESS-01 &amp; LEADERBOARD-01</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon bg-purple">
            <ShieldCheck size={24} />
          </div>
          <h3 className="feature-title">Trang Quản trị Hệ thống</h3>
          <p className="feature-desc">
            Dành cho Admin quản lý tài khoản người học, cấu hình tham số game, quản lý chủ đề và
            từ vựng kèm tính năng tái tạo audio phát âm.
          </p>
          <div className="card-link-placeholder">ADMIN-01..04</div>
        </div>
      </section>

      {/* Interactive Quick Test System */}
      <section className="quick-test-section">
        <h2 className="section-title">Kiểm tra nhanh tính năng Nền tảng (SETUP-04)</h2>
        <p className="section-desc">
          Bấm các nút bên dưới để xác thực hoạt động của hệ thống Toast Notification và UI
          components:
        </p>

        <div className="test-buttons-row">
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={() => success('Hệ thống Toast hoạt động hoàn hảo!', 'Thành công')}
          >
            Toast Success
          </button>
          <button
            type="button"
            className="btn btn-warning btn-sm"
            onClick={() => warning('Cảnh báo: Kiểm tra cấu hình kết nối API', 'Cảnh báo')}
          >
            Toast Warning
          </button>
          <button
            type="button"
            className="btn btn-info btn-sm"
            onClick={() => info('Thông tin: Đang sử dụng Axios Client hỗ trợ Cognito Token Refresh', 'Thông tin')}
          >
            Toast Info
          </button>
        </div>
      </section>
    </div>
  );
};
