import React from 'react';
import { Volume2, BookOpen, Loader2, Hash } from 'lucide-react';

interface WordClueCardProps {
  meaningVi: string;
  ipa?: string;
  wordLength?: number;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  hasAudio?: boolean;
}

export const WordClueCard: React.FC<WordClueCardProps> = ({
  meaningVi,
  ipa,
  wordLength,
  onSpeak,
  isSpeaking = false,
  hasAudio = false,
}) => {
  return (
    <div className="game-clue-card">
      <div className="clue-icon-badge">
        <BookOpen size={34} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--color-brand-primary)',
              opacity: 0.85,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Nghĩa tiếng Việt
          </span>

          {wordLength && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#8e641d',
                backgroundColor: 'var(--color-pastel-yellow)',
                border: '1px solid var(--color-pastel-yellow-border)',
                borderRadius: '999px',
                padding: '0.15rem 0.65rem',
              }}
            >
              <Hash size={12} />
              {wordLength} chữ cái
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: 'var(--color-brand-primary)',
            lineHeight: 1.25,
            marginTop: '0.25rem',
            wordBreak: 'break-word',
          }}
        >
          {meaningVi}
        </div>

        {ipa && (
          <div
            style={{
              fontSize: '0.95rem',
              color: 'var(--color-text-body)',
              marginTop: '0.35rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.85rem' }}>Phiên âm:</span>
            <span
              style={{
                fontFamily: 'monospace',
                color: 'var(--color-brand-accent)',
                backgroundColor: '#ffffff',
                padding: '0.1rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 123, 98, 0.25)',
              }}
            >
              {ipa}
            </span>
          </div>
        )}
      </div>

      {onSpeak && (
        <button
          type="button"
          onClick={onSpeak}
          disabled={!hasAudio || isSpeaking}
          aria-label="Nghe phát âm từ tiếng Anh"
          aria-busy={isSpeaking}
          className="btn-outline"
          style={{
            borderRadius: 'var(--radius-pill)',
            backgroundColor: '#ffffff',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            boxShadow: '0 4px 12px rgba(50, 44, 130, 0.06)',
            flexShrink: 0,
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          title={hasAudio ? 'Nghe phát âm chuẩn' : 'Từ này chưa có âm thanh'}
        >
          {isSpeaking ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Volume2 size={18} style={{ color: 'var(--color-brand-accent)' }} />
          )}
          <span style={{ fontWeight: 800 }}>Nghe từ</span>
        </button>
      )}
    </div>
  );
};
