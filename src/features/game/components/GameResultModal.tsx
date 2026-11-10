import { useEffect, useRef } from 'react';
import { Trophy, Flame, RotateCcw, ArrowRight, Loader2 } from 'lucide-react';
import type { FinishSessionResponse } from '../types/gameSession.types';

interface GameResultModalProps {
  isOpen: boolean;
  result: FinishSessionResponse | null;
  isLoading?: boolean;
  error?: string | null;
  isRestarting?: boolean;
  onRetry?: () => void;
  onPlayAgain: () => void;
  onBackToTopics: () => void;
}

export function GameResultModal({ isOpen, result, isLoading = false, error, isRestarting = false, onRetry, onPlayAgain, onBackToTopics }: GameResultModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    panel.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) { event.preventDefault(); return; }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapFocus);
    return () => { document.removeEventListener('keydown', trapFocus); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(50, 44, 130, 0.5)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="game-result-title" tabIndex={-1} style={{ width: '100%', maxWidth: '480px', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', background: 'var(--color-bg-white)', borderRadius: 'var(--radius-xl)', padding: 'clamp(1rem, 4vw, 2rem)', boxShadow: 'var(--shadow-card)', textAlign: 'center' }}>
      <Trophy size={48} aria-hidden="true" style={{ color: 'var(--color-brand-primary)', margin: '0 auto 1rem' }} />
      <h2 id="game-result-title" style={{ color: 'var(--color-brand-primary)', fontSize: '1.75rem', fontWeight: 900 }}>{result?.isWon ? 'Bạn đã chiến thắng!' : 'Phiên chơi đã kết thúc'}</h2>
      {result ? <>
        <p style={{ color: 'var(--color-text-body)', margin: '0.75rem 0 1.5rem' }}>{result.isWon ? 'Chúc mừng bạn đã đạt điều kiện chiến thắng của phiên chơi.' : 'Tiếp tục luyện tập để cải thiện kết quả ở phiên tiếp theo.'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontVariantNumeric: 'tabular-nums' }}>
          <div style={{ minWidth: 0, padding: '1rem 0.5rem', background: 'var(--color-pastel-mint)', color: 'var(--color-pastel-mint-text)', borderRadius: 'var(--radius-md)' }}><div>Điểm phiên chơi</div><strong style={{ fontSize: '1.75rem' }}>{result.score ?? 'Chưa có dữ liệu'}</strong></div>
          <div style={{ minWidth: 0, padding: '1rem 0.5rem', background: 'var(--color-pastel-peach-light)', color: 'var(--color-pastel-peach-text)', borderRadius: 'var(--radius-md)' }}><div><Flame size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }} /> Chuỗi streak</div><strong style={{ fontSize: result.currentStreak === null ? '1rem' : '1.75rem' }}>{result.currentStreak === null ? 'Chưa có dữ liệu' : `${result.currentStreak} ngày`}</strong></div>
        </div>
      </> : <p role="status" style={{ margin: '1.5rem 0' }}>{isLoading ? 'Đang lấy kết quả từ máy chủ...' : 'Chưa lấy được kết quả. Hãy thử đồng bộ lại.'}</p>}
      {error && <p role="alert" style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {!result && onRetry && <button type="button" className="btn-3d" disabled={isLoading} onClick={onRetry}>{isLoading ? 'Đang đồng bộ...' : 'Tải lại kết quả'}</button>}
        {result && <button type="button" className="btn-3d" disabled={isRestarting || isLoading} aria-busy={isRestarting} onClick={onPlayAgain}>{isRestarting ? <Loader2 size={18} className="ui-spinner" aria-hidden="true" /> : <RotateCcw size={18} aria-hidden="true" />} {isRestarting ? 'Đang tạo phiên mới...' : 'Chơi lại chủ đề này'}</button>}
        <button type="button" className="btn-outline" disabled={isRestarting} onClick={onBackToTopics}>Về danh sách chủ đề <ArrowRight size={18} aria-hidden="true" /></button>
      </div>
    </div>
  </div>;
}
