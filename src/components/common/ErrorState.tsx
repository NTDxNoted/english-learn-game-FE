import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ApiError } from '../../types/api.types';

interface ErrorStateProps {
  error?: Error | ApiError | null | unknown;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title = 'Đã có lỗi xảy ra',
  message,
  onRetry,
}) => {
  let displayMessage = message;
  let errorCode: string | undefined;

  if (error instanceof ApiError) {
    displayMessage = displayMessage || error.message;
    errorCode = error.errorCode;
  } else if (error instanceof Error) {
    displayMessage = displayMessage || error.message;
  } else if (!displayMessage) {
    displayMessage = 'Không thể tải được nội dung. Vui lòng kiểm tra lại kết nối mạng.';
  }

  return (
    <div className="error-state-card" role="alert">
      <div className="error-state-icon-wrapper">
        <AlertTriangle size={48} className="error-state-icon" />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{displayMessage}</p>
      {errorCode && <span className="error-code-badge">Mã lỗi: {errorCode}</span>}

      {onRetry && (
        <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
          <RefreshCw size={16} className="inline mr-2" />
          Thử lại
        </button>
      )}
    </div>
  );
};
