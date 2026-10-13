import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Award, BookCheck, History, Sparkles, CheckCircle2 } from 'lucide-react';
import { progressApi } from '../api/progressApi';
import { progressKeys, useMyStreak } from '../hooks/useMyStreak';
import { useAuth } from '../../auth/hooks/useAuth';

function QueryState({ loading, failed, label, retry, children }: {
  loading: boolean; failed: boolean; label: string; retry: () => unknown; children: ReactNode;
}) {
  if (failed) return <div role="alert"><p>Không thể tải {label}.</p><button type="button" className="btn-outline btn-sm" onClick={() => void retry()}>Tải lại {label}</button></div>;
  if (loading) return <p role="status">Đang tải {label}…</p>;
  return children;
}

const cardStyle = { padding: '1.5rem', borderRadius: '20px' };
const numberStyle = { fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-brand-primary)' };
const captionStyle = { fontSize: '0.85rem', color: 'var(--color-text-subtle)' };

export const ProgressPage = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const enabled = userId !== undefined;
  const streak = useMyStreak(userId);
  const statistics = useQuery({
    queryKey: [...progressKeys.statistics, userId],
    queryFn: async ({ signal }) => (await progressApi.getMyGameStatistics(signal)).data,
    enabled, retry: false,
  });
  const progress = useQuery({
    queryKey: [...progressKeys.topics, userId],
    queryFn: async ({ signal }) => (await progressApi.getMyProgress(signal)).data,
    enabled, retry: false,
  });
  const history = useQuery({
    queryKey: [...progressKeys.history, userId, 0, 5],
    queryFn: async ({ signal }) => (await progressApi.getMyGameHistory(0, 5, signal)).data,
    enabled, retry: false,
  });
  const stats = statistics.data;
  const totalWords = progress.data?.topics.reduce((sum, topic) => sum + topic.totalVocabularies, 0);
  const conqueredWords = progress.data?.topics.reduce((sum, topic) => sum + topic.furthestPosition, 0);

  return <div className="page-wrapper ui-progress-page" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
    <div className="page-header-box" style={{ marginBottom: '2rem' }}>
      <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Tiến Trình & Chuỗi Streak</h1>
      <p className="page-subtitle" style={{ color: 'var(--color-text-subtle)' }}>Theo dõi hành trình luyện phản xạ và chinh phục từ vựng tiếng Anh của bạn</p>
    </div>
    <div className="grid-3-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      <section className="card-pastel bg-pastel-yellow" style={cardStyle} aria-label="Chuỗi streak">
        <Flame size={26} aria-hidden="true" />
        <h2 style={{ fontSize: '0.8rem', margin: '0.75rem 0' }}>CHUỖI NGÀY LIÊN TỤC</h2>
        <QueryState loading={streak.isPending} failed={streak.isError} label="chuỗi streak" retry={streak.refetch}>
          {streak.data && <><div style={numberStyle}>{streak.data.currentStreak} Ngày</div>
            <p style={captionStyle}>{streak.data.completedToday ? <><CheckCircle2 size={16} aria-hidden="true" /> Bạn đã duy trì streak hôm nay!</> : 'Bạn chưa hoàn thành hoạt động giữ streak hôm nay.'}</p></>}
        </QueryState>
      </section>
      <section className="card-pastel bg-pastel-lavender" style={cardStyle} aria-label="Thống kê chiến thắng">
        <Award size={26} aria-hidden="true" />
        <h2 style={{ fontSize: '0.8rem', margin: '0.75rem 0' }}>ĐIỂM TÍCH LŨY</h2>
        <QueryState loading={statistics.isPending} failed={statistics.isError} label="thống kê chơi game" retry={statistics.refetch}>
          {stats && <><div style={numberStyle}>{stats.totalCheckpointScore.toLocaleString('vi-VN')} pts</div>
            <p style={captionStyle}>Đã thắng: {stats.wonSessions} / {stats.totalSessions} phiên chơi</p>
            <p style={captionStyle}>Độ chính xác ghép từ: {stats.accuracyRate}%</p></>}
        </QueryState>
      </section>
      <section className="card-pastel bg-pastel-mint" style={cardStyle} aria-label="Tiến trình từ vựng">
        <BookCheck size={26} aria-hidden="true" />
        <h2 style={{ fontSize: '0.8rem', margin: '0.75rem 0' }}>TỪ ĐÃ CHINH PHỤC</h2>
        <QueryState loading={progress.isPending} failed={progress.isError} label="tiến trình từ vựng" retry={progress.refetch}>
          {progress.data && <><div style={numberStyle}>{conqueredWords} / {totalWords}</div><p style={captionStyle}>Tiến trình vượt qua các chủ đề</p></>}
        </QueryState>
      </section>
    </div>
    <section style={{ marginTop: '2.5rem' }} aria-label="Lịch sử phiên chơi">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <History size={20} aria-hidden="true" /><h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Lịch Sử Phiên Chơi Gần Đây</h2>
      </div>
      <QueryState loading={history.isPending} failed={history.isError} label="lịch sử phiên chơi" retry={history.refetch}>
        {history.data && (history.data.content.length === 0 ? <div className="card-pastel bg-pastel-peach" style={{ padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
          <Sparkles size={28} aria-hidden="true" /><p>Bạn chưa có phiên chơi nào. Hãy vào màn hình Chủ đề và bắt đầu một ván ghép chữ mới nhé!</p>
        </div> : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {history.data.content.map((item) => <article key={item.sessionId} className="card-pastel ui-history-row" style={{ padding: '1rem 1.25rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', minWidth: 0, overflowWrap: 'anywhere', backgroundColor: 'var(--color-bg-white)', border: '1px solid var(--color-border-subtle)' }}>
            <div><div style={{ fontWeight: 800 }}>{item.topicName}</div><div style={captionStyle}>Chế độ: {item.mode} • Trạng thái: {item.status}</div>
              {item.endedAt && <time dateTime={item.endedAt} style={captionStyle}>{new Date(item.endedAt).toLocaleString('vi-VN')}</time>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, color: 'var(--color-brand-primary)' }}>{item.score === null ? 'Không tính điểm' : `${item.score.toLocaleString('vi-VN')} pts`}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.isWon === true ? 'Chiến thắng' : item.isWon === false ? 'Không thắng' : 'Chưa có kết quả'}</div>
            </div>
          </article>)}
        </div>)}
      </QueryState>
    </section>
  </div>;
};
