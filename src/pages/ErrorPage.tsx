import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

export const ErrorPage: React.FC = () => {
  const error = useRouteError();
  let errorMessage = 'Đã có lỗi không mong muốn xảy ra.';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || errorMessage;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="error-page-container">
      <div className="error-page-card">
        <div className="error-icon-box">
          <AlertOctagon size={48} className="error-icon" />
        </div>
        <h1 className="error-page-title">Sự cố ứng dụng ({errorStatus})</h1>
        <p className="error-page-message">{errorMessage}</p>

        <div className="error-page-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={16} />
            <span>Tải lại trang</span>
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
