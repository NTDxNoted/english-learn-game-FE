import React, { useEffect, useRef } from 'react';
import { BookOpen, Gamepad2, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import type { TopicItem } from '../types/topic.types';
import type { TopicProgressItem } from '../../progress/api/progressApi';
import type { GameMode } from '../../game/types/gameSession.types';

const MODE_LABELS: Record<GameMode, string> = {
  FREE_PLAY: 'Chơi tự do (FREE_PLAY)',
  CHECKPOINT: 'Thử thách 5 từ (CHECKPOINT)',
  REVIEW: 'Ôn tập chủ đề (REVIEW)',
};

const isGameMode = (value: string | undefined): value is GameMode =>
  value !== undefined && ['FREE_PLAY', 'CHECKPOINT', 'REVIEW'].includes(value);

interface TopicActionModalProps {
  topic: TopicItem | null;
  progress?: TopicProgressItem;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onClose: () => void;
  onLearn: (topic: TopicItem) => void;
  onPlay: (topic: TopicItem, mode: GameMode, resumeSessionId?: number) => void;
}

export const TopicActionModal: React.FC<TopicActionModalProps> = ({
  topic,
  progress,
  selectedMode,
  onSelectMode,
  onClose,
  onLearn,
  onPlay,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topic) return;
    const prevFocus = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (prevFocus instanceof HTMLElement && prevFocus.isConnected) {
        prevFocus.focus();
      }
    };
  }, [topic, onClose]);

  if (!topic) return null;

  const hasActiveSession = Boolean(progress?.activeSessionId);
  const activeSessionMode = isGameMode(progress?.activeSessionMode)
    ? progress.activeSessionMode
    : undefined;
  const isReviewLocked = selectedMode === 'REVIEW' && progress?.reviewUnlocked === false;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(50, 44, 130, 0.5)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-action-modal-title"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          backgroundColor: 'var(--color-bg-white)',
          borderRadius: '28px',
          padding: 'clamp(1.25rem, 4vw, 2rem)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--color-brand-accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Chủ đề đã chọn • {topic.name}
            </span>
            <h2
              id="topic-action-modal-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.65rem',
                fontWeight: 900,
                color: 'var(--color-brand-primary)',
                marginTop: '0.2rem',
              }}
            >
              {topic.description || topic.name}
            </h2>
            {progress && (
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-subtle)', marginTop: '0.25rem', fontWeight: 700 }}>
                Tiến trình hiện tại: {progress.furthestPosition} / {progress.totalVocabularies} từ vựng
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn-outline btn-sm"
            aria-label="Đóng hộp thoại chọn chế độ"
            onClick={onClose}
            style={{ borderRadius: '999px', padding: '0.45rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 2 Lựa chọn chính: Học từ vựng vs Chơi ghép chữ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.15rem',
          }}
        >
          {/* Thẻ 1: Học từ vựng rồi lấy 5 từ đó chơi luôn */}
          <div
            className="card-pastel bg-pastel-lavender"
            style={{
              padding: '1.35rem',
              borderRadius: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '2px solid rgba(50, 44, 130, 0.14)',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-brand-primary)',
                  marginBottom: '0.85rem',
                }}
              >
                <BookOpen size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
                Học từ vựng
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-body)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                Học nhóm <strong>5 từ vựng</strong> (nghĩa tiếng Việt, phiên âm IPA và phát âm MP3), sau đó lấy <strong>5 từ vừa học để chơi thử thách</strong> ngay!
              </p>
            </div>

            <button
              type="button"
              className="btn-3d"
              onClick={() => onLearn(topic)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={18} />
              <span>Học 5 từ & Chơi</span>
            </button>
          </div>

          {/* Thẻ 2: Chơi như bình thường */}
          <div
            className="card-pastel bg-pastel-mint"
            style={{
              padding: '1.35rem',
              borderRadius: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '2px solid rgba(31, 122, 85, 0.18)',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1f7a55',
                  marginBottom: '0.85rem',
                }}
              >
                <Gamepad2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
                Chơi ghép chữ
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-body)', marginTop: '0.4rem', lineHeight: 1.5 }}>
                Vào thẳng màn chơi phản xạ ghép chữ bằng cử chỉ bàn tay qua webcam hoặc kéo chuột như bình thường.
              </p>

              <div style={{ marginTop: '0.85rem' }}>
                <label
                  htmlFor="modal-game-mode"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-brand-primary)', marginBottom: '0.35rem' }}
                >
                  Chế độ khi chơi mới
                </label>
                <select
                  id="modal-game-mode"
                  className="form-input"
                  value={selectedMode}
                  onChange={(event) => onSelectMode(event.target.value as GameMode)}
                  style={{ backgroundColor: '#ffffff', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                >
                  {Object.entries(MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {isReviewLocked && (
                  <p style={{ fontSize: '0.76rem', color: '#822c2c', fontWeight: 700, marginTop: '0.35rem' }}>
                    Chế độ Ôn tập (REVIEW) cần hoàn thành toàn bộ các mốc thử thách của chủ đề trước.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {hasActiveSession && progress?.activeSessionId && (
                <button
                  type="button"
                  className="btn-3d"
                  onClick={() =>
                    onPlay(
                      topic,
                      activeSessionMode ?? selectedMode,
                      progress.activeSessionId,
                    )
                  }
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <RotateCcw size={18} />
                  <span>
                    Tiếp tục {activeSessionMode ? MODE_LABELS[activeSessionMode] : 'phiên đang chơi'}
                  </span>
                </button>
              )}

              <button
                type="button"
                className={hasActiveSession ? 'btn-outline' : 'btn-3d'}
                disabled={isReviewLocked}
                onClick={() => onPlay(topic, selectedMode)}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: hasActiveSession ? '#ffffff' : undefined }}
              >
                <Play size={18} className={hasActiveSession ? undefined : 'fill-current'} />
                <span>{hasActiveSession ? 'Bắt đầu ván mới' : 'Chơi ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

