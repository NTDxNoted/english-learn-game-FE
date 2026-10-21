import React from 'react';
import { Trophy, Flame, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import type { FinishSessionResponse } from '../types/gameSession.types';

interface GameResultModalProps {
  isOpen: boolean;
  result: FinishSessionResponse | null;
  onPlayAgain: () => void;
  onBackToTopics: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  result,
  onPlayAgain,
  onBackToTopics,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(50, 44, 130, 0.5)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          boxShadow: '0 24px 48px -8px rgba(50, 44, 130, 0.3)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: result.isWon ? 'var(--color-pastel-yellow)' : 'var(--color-pastel-lavender)',
            color: result.isWon ? '#8e641d' : 'var(--color-brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          <Trophy size={42} />
        </div>

        <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--color-brand-primary)', marginBottom: '0.5rem' }}>
          {result.isWon ? 'Xuất Sắc! Hoàn Thành' : 'Phiên Học Đã Kết Thúc'}
        </h2>

        <p style={{ color: 'var(--color-text-body)', fontSize: '0.95rem', marginBottom: '2rem' }}>
          {result.isWon
            ? 'Bạn đã hoàn thành chính xác tất cả các từ trong phiên chơi!'
            : 'Hãy tiếp tục luyện tập để chinh phục trọn vẹn chủ đề này nhé!'}
        </p>

        {/* Điểm số & Streak */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-pastel-mint)',
              border: '1.5px solid var(--color-pastel-mint-border)',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-pastel-mint-text)' }}>
              ĐIỂM ĐẠT ĐƯỢC
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-pastel-mint-text)', marginTop: '0.25rem' }}>
              +{result.score}
            </div>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-pastel-peach-light)',
              border: '1.5px solid var(--color-pastel-peach-border)',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-pastel-peach-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <Flame size={16} color="#ff7b62" className="fill-[#ff7b62]" />
              <span>CHUỖI STREAK</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-pastel-peach-text)', marginTop: '0.25rem' }}>
              {result.currentStreak} ngày
            </div>
          </div>
        </div>

        {/* Các nút hành động */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <button
            type="button"
            className="btn-3d w-full"
            onClick={onPlayAgain}
            style={{ justifyContent: 'center' }}
          >
            <RotateCcw size={18} />
            <span>Chơi lại topic này</span>
          </button>

          <button
            type="button"
            className="btn-outline w-full"
            onClick={onBackToTopics}
            style={{ justifyContent: 'center' }}
          >
            <span>Về danh sách chủ đề</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <Sparkles size={14} className="inline mr-1" />
          Tiến trình của bạn đã được lưu lại trên bảng xếp hạng Signly.
        </div>
      </div>
    </div>
  );
};
