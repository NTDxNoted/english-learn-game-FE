import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Gamepad2, BookOpen, Trophy, ShieldCheck, Flame } from 'lucide-react';
import { useToast } from '../app/providers/useToast';

export const HomePage: React.FC = () => {
  const { success, warning, info } = useToast();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={16} className="text-amber-400" />
          <span>Phiên bản V1: Học từ vựng tiếng Anh qua nhận diện cử chỉ tay</span>
        </div>
        <h1 className="hero-title">
          Chinh phục Từ vựng Tiếng Anh cùng <br />
          <span className="gradient-text">Tương tác Cử chỉ Bàn tay</span>
        </h1>
        <p className="hero-subtitle">
          Ghép chữ cái tiếng Anh bằng cử chỉ ngón tay qua camera (MediaPipe Hands) hoặc chuột máy
          tính. Tích lũy điểm số, duy trì chuỗi Streak học tập và đua top bảng xếp hạng tuần!
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
          <div className="card-link-placeholder">SETUP-04 & GAME-01</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon bg-emerald">
            <Flame size={24} />
          </div>
          <h3 className="feature-title">Tiến trình & Chuỗi Streak</h3>
          <p className="feature-desc">
            Theo dõi tỷ lệ hoàn thành từ vựng, tự động duy trì chuỗi ngày học liên tiếp để nhận thêm
            điểm thưởng và huy hiệu.
          </p>
          <div className="card-link-placeholder">PROGRESS-01</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon bg-purple">
            <ShieldCheck size={24} />
          </div>
          <h3 className="feature-title">Trang Quản trị Hệ thống</h3>
          <p className="feature-desc">
            Dành cho Admin quản lý người dùng, cấu hình game, thêm sửa danh mục topic và từ vựng
            kèm tính năng phát âm Polly.
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
            onClick={() => info('Thông tin: Đang sử dụng Axios Client chuẩn hoá', 'Thông tin')}
          >
            Toast Info
          </button>
        </div>
      </section>
    </div>
  );
};
