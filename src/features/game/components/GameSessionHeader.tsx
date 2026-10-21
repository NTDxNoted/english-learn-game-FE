import React from 'react';
import { ArrowLeft, Camera, MousePointer } from 'lucide-react';
import type { InputMode } from '../input/controllers/InputController';

interface GameSessionHeaderProps {
  currentWordIndex: number;
  totalWords: number;
  inputMode: InputMode;
  onToggleInputMode: () => void;
  onExit: () => void;
}

export const GameSessionHeader: React.FC<GameSessionHeaderProps> = ({
  currentWordIndex,
  totalWords,
  inputMode,
  onToggleInputMode,
  onExit,
}) => {
  const progressPercent = Math.round(((currentWordIndex) / Math.max(1, totalWords)) * 100);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={onExit}
          className="btn-outline btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <ArrowLeft size={16} />
          <span>Thoát phiên</span>
        </button>

        {/* Nút chuyển đổi nhanh chế độ điều khiển */}
        <button
          type="button"
          onClick={onToggleInputMode}
          className="btn-outline btn-sm"
          style={{
            gap: '0.5rem',
            backgroundColor: inputMode === 'gesture' ? 'var(--color-pastel-yellow)' : '#ffffff',
            borderColor: inputMode === 'gesture' ? 'var(--color-pastel-yellow-border)' : 'rgba(0, 0, 0, 0.1)',
            color: 'var(--color-brand-primary)',
            fontWeight: 700,
          }}
        >
          {inputMode === 'gesture' ? (
            <>
              <Camera size={16} />
              <span>Cử chỉ tay (Webcam)</span>
            </>
          ) : (
            <>
              <MousePointer size={16} />
              <span>Chuột / Cảm ứng</span>
            </>
          )}
        </button>
      </div>

      {/* Thanh tiến trình từ vựng */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1, height: '10px', backgroundColor: 'rgba(50, 44, 130, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: 'var(--color-brand-accent)',
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-brand-primary)', whiteSpace: 'nowrap' }}>
          Từ {currentWordIndex + 1} / {totalWords}
        </span>
      </div>
    </div>
  );
};
