import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-number">404</div>
        <h1 className="not-found-title">Không tìm thấy trang</h1>
        <p className="not-found-desc">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được di chuyển sang địa chỉ khác.
        </p>
        <div className="not-found-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <Link to="/" className="btn btn-primary">
            <Home size={16} />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
