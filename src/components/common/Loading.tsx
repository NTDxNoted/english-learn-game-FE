import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Đang tải dữ liệu...',
  size = 'medium',
  fullScreen = false,
}) => {
  const sizeMap = {
    small: 20,
    medium: 36,
    large: 52,
  };

  const content = (
    <div className={`loading-container ${size}`}>
      <Loader2 className="loading-spinner animate-spin" size={sizeMap[size]} />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return content;
};
