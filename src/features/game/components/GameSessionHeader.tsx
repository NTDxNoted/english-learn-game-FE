import React from 'react';
import { ArrowLeft, Camera, MousePointer, Loader2 } from 'lucide-react';
import type { InputMode } from '../input/controllers/InputController';

interface GameSessionHeaderProps {
  currentWordIndex: number;
  totalWords: number;
  inputMode: InputMode;
  isSwitching?: boolean;
  isExitDisabled?: boolean;
  onToggleInputMode: () => void;
  onExit: () => void;
}

export const GameSessionHeader: React.FC<GameSessionHeaderProps> = ({
  currentWordIndex,
  totalWords,
  inputMode,
  isSwitching = false,
  isExitDisabled = false,
  onToggleInputMode,
  onExit,
}) => {
  const progressPercent = Math.round(((currentWordIndex) / Math.max(1, totalWords)) * 100);

  return (
    <div className="game-session-header" style={{ marginBottom: '1.5rem' }}>
      <div className="game-session-header-actions">
        <button
          type="button"
          onClick={onExit}
          disabled={isExitDisabled}
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
          disabled={isSwitching}
          aria-busy={isSwitching}
          title={inputMode === 'gesture' ? 'Đổi sang chuột / cảm ứng' : 'Đổi sang cử chỉ tay (Webcam)'}
          className="btn-outline btn-sm"
          style={{
            gap: '0.5rem',
            backgroundColor: inputMode === 'gesture' ? 'var(--color-pastel-yellow)' : 'var(--color-bg-white)',
            borderColor: inputMode === 'gesture' ? 'var(--color-pastel-yellow-border)' : 'var(--color-border-subtle)',
            color: 'var(--color-brand-primary)',
            fontWeight: 700,
          }}
        >
          {isSwitching ? <><Loader2 size={16} className="ui-spinner" /><span>Đang bật camera...</span></> : inputMode === 'gesture' ? (
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
              width: '100%',
              transform: `scaleX(${progressPercent / 100})`,
              transformOrigin: 'left',
              height: '100%',
              backgroundColor: 'var(--color-brand-accent)',
              borderRadius: '999px',
              transition: 'transform 180ms cubic-bezier(.22,1,.36,1)',
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

