import React from 'react';
import { Camera, ShieldCheck, MousePointer, Sparkles } from 'lucide-react';

interface CameraPermissionGateProps {
  onAllowCamera: () => void;
  onUseMouse: () => void;
  allowMouseMode?: boolean;
}

export const CameraPermissionGate: React.FC<CameraPermissionGateProps> = ({
  onAllowCamera,
  onUseMouse,
  allowMouseMode = true,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(50, 44, 130, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem',
          boxShadow: '0 20px 40px -8px rgba(50, 44, 130, 0.25)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-pastel-yellow)',
            color: 'var(--color-pastel-yellow-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <Camera size={32} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-brand-primary)', marginBottom: '0.5rem' }}>
          Học từ vựng bằng cử chỉ tay
        </h2>

        <p style={{ color: 'var(--color-text-body)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Signly sử dụng camera để theo dõi vị trí bàn tay của bạn, giúp bạn gắp và thả các khối chữ cái trực tiếp trên màn hình.
        </p>

        <div
          style={{
            backgroundColor: 'var(--color-pastel-mint)',
            border: '1.5px solid var(--color-pastel-mint-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textAlign: 'left',
            color: 'var(--color-pastel-mint-text)',
            fontSize: '0.85rem',
            marginBottom: '1.75rem',
          }}
        >
          <ShieldCheck size={24} className="shrink-0" />
          <span>
            <strong>Bảo mật tuyệt đối:</strong> Luồng video chỉ được xử lý cục bộ trên trình duyệt máy bạn bằng trí tuệ nhân tạo (MediaPipe) và <strong>không bao giờ gửi lên máy chủ</strong>.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
        </div>

        <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <Sparkles size={14} className="inline mr-1" />
          Bạn có thể thay đổi chế độ điều khiển bất kỳ lúc nào trong khi chơi.
        </div>
      </div>
    </div>
  );
};
