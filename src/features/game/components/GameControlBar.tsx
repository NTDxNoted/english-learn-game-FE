import React from 'react';
import { CheckCircle2, RotateCcw, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface GameControlBarProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  attemptsLeft: number;
  maxAttempts: number;
  sessionScore: number;
  feedbackMessage?: string | null;
  feedbackType?: 'success' | 'error' | null;
  onConfirm: () => void;
  onReset: () => void;
}

export const GameControlBar: React.FC<GameControlBarProps> = ({
  canSubmit,
  isSubmitting,
  attemptsLeft,
  maxAttempts,
  sessionScore,
  feedbackMessage,
  feedbackType,
  onConfirm,
  onReset,
}) => {
  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Thông báo phản hồi sau khi nộp */}
      {feedbackMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            backgroundColor:
              feedbackType === 'success'
                ? 'var(--color-pastel-mint)'
                : 'var(--color-pastel-peach-light)',
            color:
              feedbackType === 'success'
                ? 'var(--color-pastel-mint-text)'
                : 'var(--color-pastel-peach-text)',
            border: `1.5px solid ${feedbackType === 'success' ? 'var(--color-pastel-mint-border)' : 'var(--color-pastel-peach-border)'}`,
          }}
        >
          {feedbackType === 'success' ? <Sparkles size={20} /> : <AlertCircle size={20} />}
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Thanh trạng thái lượt thử và điểm */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-body)' }}>
          <span>Lượt thử từ này:</span>
          <span style={{ color: attemptsLeft === 1 ? 'var(--color-error)' : 'var(--color-brand-primary)' }}>
            {attemptsLeft} / {maxAttempts}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>
          <span>Điểm số:</span>
          <span style={{ color: 'var(--color-brand-accent)', fontSize: '1.15rem' }}>{sessionScore}</span>
        </div>
      </div>

      {/* Nhóm nút bấm 3D */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="btn-outline"
          style={{ justifyContent: 'center' }}
        >
          <RotateCcw size={18} />
          <span>Xóa làm lại</span>
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!canSubmit || isSubmitting}
          className="btn-3d"
          style={{
            justifyContent: 'center',
            opacity: !canSubmit || isSubmitting ? 0.6 : 1,
            cursor: !canSubmit || isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Đang kiểm tra...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Xác nhận từ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
