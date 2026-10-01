import React from 'react';
import { Flame, Award, BookCheck, Sparkles } from 'lucide-react';

export const ProgressPage: React.FC = () => {
  return (
    <div className="page-wrapper">
      <div className="page-header-box">
        <h1 className="page-title">Tiến trình & Chuỗi Streak (PROGRESS-01)</h1>
        <p className="page-subtitle">Theo dõi hành trình chinh phục từ vựng tiếng Anh của bạn</p>
      </div>

      <div className="grid-3-col">
        <div className="stat-card">
          <div className="stat-icon-badge flame">
            <Flame size={24} />
          </div>
          <div className="stat-value">5 ngày</div>
          <div className="stat-label">Chuỗi ngày học liên tục (Streak)</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-badge award">
            <Award size={24} />
          </div>
          <div className="stat-value">1,450</div>
          <div className="stat-label">Tổng điểm tích lũy</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-badge book">
            <BookCheck size={24} />
          </div>
          <div className="stat-value">42 / 120</div>
          <div className="stat-label">Từ vựng đã thành thạo</div>
        </div>
      </div>

      <div className="alert alert-info mt-6">
        <Sparkles size={18} />
        <span>Sẵn sàng kết nối GET /api/v1/progress/summary ở issue PROGRESS-01.</span>
      </div>
    </div>
  );
};
