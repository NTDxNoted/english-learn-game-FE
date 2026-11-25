import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Flame, Gamepad2, Lock, Play, RotateCcw, Sparkles, Trophy, X } from 'lucide-react';
import type { TopicItem } from '../types/topic.types';
import type { TopicProgressItem } from '../../progress/api/progressApi';
import type { GameMode } from '../../game/types/gameSession.types';

const MODE_LABELS: Record<GameMode, string> = {
  FREE_PLAY: 'Chơi tự do (FREE_PLAY)',
  CHECKPOINT: 'Thử thách 5 từ (CHECKPOINT)',
  REVIEW: 'Ôn tập chủ đề (REVIEW)',
};

const MODE_OPTIONS: Array<{
  value: GameMode;
  title: string;
  subtitle: string;
  icon: typeof Gamepad2;
}> = [
  {
    value: 'FREE_PLAY',
    title: 'Chơi tự do (FREE_PLAY)',
    subtitle: 'Luyện phản xạ thoải mái',
    icon: Gamepad2,
  },
  {
    value: 'CHECKPOINT',
    title: 'Thử thách 5 từ (CHECKPOINT)',
    subtitle: 'Ghi điểm & giữ chuỗi Streak',
    icon: Flame,
  },
  {
    value: 'REVIEW',
    title: 'Ôn tập chủ đề (REVIEW)',
    subtitle: 'Tổng hợp toàn bộ từ đã học',
    icon: Trophy,
  },
];

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openForTopicId, setOpenForTopicId] = useState<number | null>(null);
  const isDropdownOpen = topic !== null && openForTopicId === topic.id;

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenForTopicId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!topic) return;
    const prevFocus = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isDropdownOpen) {
          setOpenForTopicId(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (prevFocus instanceof HTMLElement && prevFocus.isConnected) {
        prevFocus.focus();
      }
    };
  }, [topic, isDropdownOpen, onClose]);

  if (!topic) return null;

  const hasActiveSession = Boolean(progress?.activeSessionId);
  const activeSessionMode = isGameMode(progress?.activeSessionMode)
    ? progress.activeSessionMode
    : undefined;
  const minCheckpointWords =
    progress && progress.totalVocabularies > 0 ? Math.min(5, progress.totalVocabularies) : 5;
  const isCheckpointUnlocked = !progress || progress.furthestPosition >= minCheckpointWords;
  const isReviewUnlocked = progress?.reviewUnlocked !== false;
  const isCheckpointLocked = selectedMode === 'CHECKPOINT' && !isCheckpointUnlocked;
  const isReviewLocked = selectedMode === 'REVIEW' && !isReviewUnlocked;
  const isPlayModeLocked = isReviewLocked || isCheckpointLocked;
  const visibleModeOptions = MODE_OPTIONS.filter(
    (option) => option.value !== 'REVIEW' || isReviewUnlocked,
  );
  const displayedSelectedMode: GameMode =
    selectedMode === 'REVIEW' && !isReviewUnlocked ? 'FREE_PLAY' : selectedMode;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(50, 44, 130, 0.5)',
        backdropFilter: 'blur(6px)',
        zIndex: 90,
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
                <div
                  id="modal-game-mode-label"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-brand-primary)', marginBottom: '0.35rem' }}
                >
                  Chế độ khi chơi mới
                </div>
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  {(() => {
                    const currentOption =
                      visibleModeOptions.find((item) => item.value === displayedSelectedMode) ??
                      visibleModeOptions[0];
                    const CurrentIcon = currentOption.icon;
                    return (
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}
                        aria-labelledby="modal-game-mode-label"
                        onClick={() => setOpenForTopicId((prev) => (prev === topic.id ? null : topic.id))}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        padding: '0.55rem 0.8rem',
                        borderRadius: '14px',
                        backgroundColor: '#ffffff',
                        border: isDropdownOpen
                          ? '2px solid var(--color-brand-primary)'
                          : '1.5px solid rgba(31, 122, 85, 0.28)',
                        boxShadow: isDropdownOpen
                          ? '0 0 0 3px rgba(50, 44, 130, 0.12)'
                          : '0 2px 6px rgba(31, 122, 85, 0.08)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.16s ease',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: '#e7f6ef',
                            color: '#1f7a55',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CurrentIcon size={15} />
                        </span>
                        <span
                          style={{
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            color: 'var(--color-brand-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {currentOption.title}
                        </span>
                      </span>
                      <ChevronDown
                        size={17}
                        style={{
                          color: 'var(--color-brand-primary)',
                          flexShrink: 0,
                          transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.18s ease',
                        }}
                      />
                    </button>
                  );
                })()}

                  {isDropdownOpen && (
                    <div
                      role="listbox"
                      aria-labelledby="modal-game-mode-label"
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 0.4rem)',
                        left: 0,
                        right: 0,
                        zIndex: 40,
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        padding: '0.4rem',
                        border: '1.5px solid rgba(50, 44, 130, 0.16)',
                        boxShadow: '0 14px 32px -4px rgba(50, 44, 130, 0.22)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      {visibleModeOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = displayedSelectedMode === option.value;
                        const optionLocked =
                          (option.value === 'CHECKPOINT' && !isCheckpointUnlocked) ||
                          (option.value === 'REVIEW' && !isReviewUnlocked);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            disabled={optionLocked}
                            onClick={() => {
                              if (optionLocked) return;
                              onSelectMode(option.value);
                              setOpenForTopicId(null);
                            }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.55rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '11px',
                            backgroundColor: isSelected ? '#ebe9ff' : 'transparent',
                            border: 'none',
                            cursor: optionLocked ? 'not-allowed' : 'pointer',
                            opacity: optionLocked ? 0.55 : 1,
                            textAlign: 'left',
                            transition: 'background-color 0.14s ease',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                backgroundColor: isSelected ? 'var(--color-brand-primary)' : '#e7f6ef',
                                color: isSelected ? '#ffffff' : '#1f7a55',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={14} />
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '0.83rem',
                                  fontWeight: 800,
                                  color: 'var(--color-brand-primary)',
                                  lineHeight: 1.2,
                                }}
                              >
                                {option.title}
                              </span>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '0.72rem',
                                  color: optionLocked ? '#991b1b' : 'var(--color-text-subtle)',
                                  fontWeight: 600,
                                  marginTop: '0.08rem',
                                }}
                              >
                                {option.value === 'CHECKPOINT' && optionLocked
                                  ? `Cần học đủ ${minCheckpointWords} từ vựng trước`
                                  : option.subtitle}
                              </span>
                            </span>
                          </span>

                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '999px',
                              backgroundColor: isSelected
                                ? 'var(--color-brand-primary)'
                                : optionLocked
                                  ? '#fee2e2'
                                  : 'transparent',
                              color: isSelected ? '#ffffff' : '#991b1b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected ? <Check size={12} strokeWidth={3} /> : optionLocked ? <Lock size={11} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                </div>

                {isCheckpointLocked && (
                  <p style={{ fontSize: '0.75rem', color: '#822c2c', fontWeight: 700, marginTop: '0.35rem' }}>
                    Cần học đủ ít nhất {minCheckpointWords} từ vựng (bấm Học 5 từ & Chơi bên trái) để mở khóa Thử thách (CHECKPOINT).
                  </p>
                )}

                {isReviewLocked && (
                  <p style={{ fontSize: '0.75rem', color: '#822c2c', fontWeight: 700, marginTop: '0.35rem' }}>
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
                      activeSessionMode ?? displayedSelectedMode,
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
                disabled={isPlayModeLocked}
                onClick={() => onPlay(topic, displayedSelectedMode)}
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

