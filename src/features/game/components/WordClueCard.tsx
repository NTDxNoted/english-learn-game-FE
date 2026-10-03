import React from 'react';
import { Volume2, BookOpen, Loader2 } from 'lucide-react';

interface WordClueCardProps {
  meaningVi: string;
  ipa?: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}

export const WordClueCard: React.FC<WordClueCardProps> = ({
  meaningVi,
  ipa,
  onSpeak,
  isSpeaking = false,
}) => {
  return (
    <div className="game-clue-card">
      <div className="clue-icon-badge">
        <BookOpen size={36} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-brand-primary)', opacity: 0.8, letterSpacing: '0.08em' }}>
          NGHĨA TIẾNG VIỆT
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-brand-primary)', lineHeight: 1.2, marginTop: '0.2rem' }}>
          {meaningVi}
        </div>
        {ipa && (
          <div style={{ fontSize: '0.95rem', color: 'var(--color-text-body)', marginTop: '0.35rem', fontWeight: 600 }}>
            Phiên âm: <span style={{ fontFamily: 'monospace', color: 'var(--color-brand-accent)' }}>{ipa}</span>
          </div>
        )}
      </div>

      {onSpeak && (
        <button
          type="button"
          onClick={onSpeak}
          disabled={isSpeaking}
          className="btn-outline"
          style={{
            borderRadius: 'var(--radius-pill)',
            backgroundColor: '#ffffff',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
          }}
          title="Nghe phát âm tiếng Anh chuẩn"
        >
          {isSpeaking ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Volume2 size={18} style={{ color: 'var(--color-brand-accent)' }} />
          )}
          <span>Nghe từ</span>
        </button>
      )}
    </div>
  );
};
