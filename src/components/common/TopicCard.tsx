import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TopicCardProps {
  title: string;
  english?: string;
  description?: string;
  icon: LucideIcon;
  color?: 'lavender' | 'peach' | 'blue' | 'pink' | 'yellow' | 'mint';
  lessons?: string;
  totalWords?: number;
  completedWords?: number;
  index?: number;
  onClick: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  title,
  english,
  description,
  icon: Icon,
  color = 'lavender',
  lessons,
  totalWords,
  completedWords,
  onClick,
}) => {
  const colorClass =
    color === 'lavender'
      ? 'bg-pastel-lavender'
      : color === 'peach'
        ? 'bg-pastel-peach-light'
        : color === 'blue'
          ? 'bg-pastel-blue'
          : color === 'yellow'
            ? 'bg-pastel-yellow'
            : color === 'mint'
              ? 'bg-pastel-mint'
              : 'bg-pastel-pink';

  const hasProgress = typeof totalWords === 'number' && totalWords > 0;
  const progressPercent = hasProgress
    ? Math.max(0, Math.min(100, Math.round(((completedWords || 0) / totalWords) * 100)))
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-topic ${colorClass}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '210px',
        minWidth: 0,
        overflowWrap: 'anywhere',
      }}
    >
      <div style={{ minWidth: 0, width: '100%' }}>
        <div className="card-icon-box" style={{ marginBottom: 0 }}>
          <Icon size={24} />
        </div>

        <h3 className="card-topic-title" style={{ marginTop: '1.25rem' }}>{title}</h3>
        {(english || description) && (
          <p className="card-topic-english">{english || description}</p>
        )}
      </div>

      <div style={{ marginTop: '1.25rem', width: '100%' }}>
        {hasProgress && (
          <div style={{ marginBottom: '0.65rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.725rem',
                fontWeight: 700,
                color: 'var(--color-text-subtle)',
                marginBottom: '0.35rem',
              }}
            >
              <span>Tiến độ</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{completedWords || 0}/{totalWords} từ</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Tiến độ chủ đề ${title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-valuetext={`${completedWords || 0} trên ${totalWords} từ`}
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--color-pastel-lavender-shadow)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--color-brand-primary)',
                  borderRadius: '9999px',
                  transform: `scaleX(${progressPercent / 100})`,
                  transformOrigin: 'left',
                  transition: 'transform 180ms cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              />
            </div>
          </div>
        )}

        <div className="card-topic-footer" style={{ borderTop: hasProgress ? 'none' : undefined, paddingTop: hasProgress ? 0 : undefined }}>
          <span>{lessons || (hasProgress ? `${progressPercent}% hoàn thành` : 'Vào học ngay')}</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </button>
  );
};
