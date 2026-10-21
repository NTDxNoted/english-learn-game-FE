import React, { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  statusText: string;
  fps?: number;
  onSwitchToMouse?: () => void;
  isGestureMode: boolean;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  statusText,
  fps = 0,
  onSwitchToMouse,
  isGestureMode,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const isLowFps = fps > 0 && fps < 15;

  if (!isGestureMode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1.5rem',
        zIndex: 40,
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 24px -4px rgba(50, 44, 130, 0.16)',
        border: '1.5px solid rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        width: isMinimized ? '200px' : '240px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header thanh điều khiển camera */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--color-brand-primary)',
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Camera size={14} />
          <span>Camera Hand Tracking</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {fps > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: isLowFps ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
              }}
            >
              {fps} FPS
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
            aria-label={isMinimized ? 'Mở rộng camera' : 'Thu nhỏ camera'}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Video khung nhìn */}
      {!isMinimized && (
        <div style={{ position: 'relative', width: '100%', height: '160px', backgroundColor: '#000000' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Hiệu ứng gương soi
            }}
          />
        </div>
      )}

      {/* Dòng trạng thái hướng dẫn */}
      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', backgroundColor: '#fbfaf7' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-brand-primary)' }}>{statusText}</div>

        {isLowFps && (
          <div
            style={{
              marginTop: '0.35rem',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
            }}
          >
            <AlertTriangle size={12} className="shrink-0" />
            <span>FPS thấp. Bạn có thể đổi sang chuột để chơi mượt hơn.</span>
            {onSwitchToMouse && (
              <button
                type="button"
                onClick={onSwitchToMouse}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand-primary)',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Đổi
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
