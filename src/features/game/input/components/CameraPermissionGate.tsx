import React from 'react';
import { ArrowLeft, Camera, ShieldCheck, MousePointer } from 'lucide-react';

interface CameraPermissionGateProps {
  onAllowCamera: () => void;
  onUseMouse: () => void;
  onBack?: () => void;
  allowMouseMode?: boolean;
}

export const CameraPermissionGate: React.FC<CameraPermissionGateProps> = ({
  onAllowCamera,
  onUseMouse,
  onBack,
  allowMouseMode = true,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(50, 44, 130, 0.48)',
        backdropFilter: 'blur(6px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-gate-title"
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(1.5rem, 3.5vw, 2rem)',
          boxShadow: '0 20px 40px -8px rgba(50, 44, 130, 0.25)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            backgroundColor: 'var(--color-pastel-yellow)',
            color: 'var(--color-pastel-yellow-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <Camera size={28} />
        </div>

        <h2
          id="camera-gate-title"
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--color-brand-primary)',
            marginBottom: '0.4rem',
          }}
        >
          Học từ vựng bằng cử chỉ tay
        </h2>

        <p
          style={{
            color: 'var(--color-text-body)',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            marginBottom: '1rem',
          }}
        >
          Gắp và ghép các khối chữ cái trực tiếp trước camera.
        </p>

        <div
          style={{
            backgroundColor: 'var(--color-pastel-mint)',
            border: '1.5px solid var(--color-pastel-mint-border)',
            borderRadius: '999px',
            padding: '0.5rem 0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            color: 'var(--color-pastel-mint-text)',
            fontSize: '0.84rem',
            fontWeight: 700,
            marginBottom: '1.35rem',
          }}
        >
          <ShieldCheck size={17} className="shrink-0" />
          <span>Bảo mật luồng video riêng tư của người dùng</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <button
            type="button"
            className="btn-3d w-full"
            onClick={onAllowCamera}
          >
            <Camera size={18} />
            <span>Cho phép &amp; Bật camera</span>
          </button>

          {allowMouseMode && (
            <button
              type="button"
              className="btn-outline w-full"
              onClick={onUseMouse}
              style={{ justifyContent: 'center' }}
            >
              <MousePointer size={18} />
              <span>Chơi bằng chuột / cảm ứng</span>
            </button>
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.68rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f5f4fb',
                border: '1.5px solid rgba(50, 44, 130, 0.14)',
                color: 'var(--color-brand-primary)',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowLeft size={17} />
              <span>Quay về danh sách chủ đề</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
