import React, { useState, useEffect } from 'react';
import { Flame, Award, BookCheck, Sparkles, History } from 'lucide-react';
import { progressApi, type UserStreak, type GameStatistics, type GameProgressData, type GameHistoryItem } from '../api/progressApi';

export const ProgressPage: React.FC = () => {
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [stats, setStats] = useState<GameStatistics | null>(null);
  const [progress, setProgress] = useState<GameProgressData | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const [streakRes, statsRes, progressRes, historyRes] = await Promise.allSettled([
          progressApi.getMyStreak(),
          progressApi.getMyGameStatistics(),
          progressApi.getMyProgress(),
          progressApi.getMyGameHistory(0, 5),
        ]);

        if (streakRes.status === 'fulfilled') setStreak(streakRes.value.data);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (progressRes.status === 'fulfilled') setProgress(progressRes.value.data);
        if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data.items || []);
      } catch (err) {
        console.error('Không thể tải tiến trình:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, []);

  const totalLearnedWords = progress?.topics?.reduce((acc, t) => acc + (t.furthestPosition || 0), 0) || 0;
  const totalTopicWords = progress?.topics?.reduce((acc, t) => acc + (t.totalVocabularies || 0), 0) || 0;

  return (
    <div className="page-wrapper" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div className="page-header-box" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Tiến Trình & Chuỗi Streak</h1>
        <p className="page-subtitle" style={{ color: 'var(--color-text-subtle)' }}>
          Theo dõi hành trình luyện phản xạ và chinh phục từ vựng tiếng Anh của bạn
        </p>
      </div>

      <div
        className="grid-3-col"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Card Streak */}
        <div className="card-pastel bg-pastel-yellow" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem', backgroundColor: '#fff', borderRadius: '12px', color: '#e67e22' }}>
              <Flame size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b27715' }}>CHUỖI NGÀY LIÊN TỤC</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
                {streak?.currentStreak ?? 0} Ngày
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#8e641d', fontWeight: 600 }}>
            {streak?.completedToday ? '✓ Bạn đã duy trì streak hôm nay!' : 'Chơi một ván game hôm nay để giữ chuỗi!'}
          </div>
        </div>

        {/* Card Điểm tổng */}
        <div className="card-pastel bg-pastel-lavender" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem', backgroundColor: '#fff', borderRadius: '12px', color: 'var(--color-brand-primary)' }}>
              <Award size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>ĐIỂM TÍCH LŨY</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
                {stats?.totalCheckpointScore?.toLocaleString() ?? 0} pts
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
            Đã thắng: {stats?.wonSessions ?? 0} / {stats?.totalSessions ?? 0} phiên chơi
          </div>
        </div>

        {/* Card Từ vựng đã học */}
        <div className="card-pastel bg-pastel-mint" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem', backgroundColor: '#fff', borderRadius: '12px', color: '#1f7a55' }}>
              <BookCheck size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f7a55' }}>TỪ ĐÃ HỌC</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
                {totalLearnedWords} {totalTopicWords > 0 ? `/ ${totalTopicWords}` : ''}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1f7a55', fontWeight: 600 }}>
            Độ chính xác ghép từ: {stats?.accuracyRate ? `${stats.accuracyRate}%` : '100%'}
          </div>
        </div>
      </div>

      {/* Lịch sử chơi gần đây */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <History size={20} color="var(--color-brand-primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Lịch Sử Phiên Chơi Gần Đây</h2>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-subtle)' }}>
            Đang tải dữ liệu tiến trình...
          </div>
        ) : history.length === 0 ? (
          <div className="card-pastel bg-pastel-peach" style={{ padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
            <Sparkles size={28} color="#d35400" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontWeight: 700, color: '#a04000' }}>
              Bạn chưa có phiên chơi nào. Hãy vào màn hình Chủ đề và bắt đầu một ván ghép chữ mới nhé!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((item) => (
              <div
                key={item.sessionId}
                className="card-pastel"
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-border-subtle, #f0f0f0)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{item.topicName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
                    Chế độ: {item.mode} • Trạng thái: {item.status}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, color: 'var(--color-brand-primary)', fontSize: '1.1rem' }}>
                    +{item.score} pts
                  </div>
                  <div style={{ fontSize: '0.8rem', color: item.won ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>
                    {item.won ? 'Chiến thắng ✓' : 'Hoàn thành'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
