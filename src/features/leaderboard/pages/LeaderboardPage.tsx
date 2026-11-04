import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Award } from 'lucide-react';
import { leaderboardApi, type WeeklyLeaderboardData } from '../api/leaderboardApi';

export const LeaderboardPage: React.FC = () => {
  const [data, setData] = useState<WeeklyLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await leaderboardApi.getWeeklyLeaderboard(10);
        setData(res.data);
      } catch (err) {
        console.error('Không thể tải bảng xếp hạng:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const entries = data?.entries || [];

  const getRankBadge = (rank: number) => {
    const color = rank === 1 ? 'var(--color-pastel-yellow-text)' : rank === 2 ? 'var(--color-brand-primary)' : 'var(--color-pastel-peach-text)';
    return rank <= 3 ? <span className="ui-rank-badge" aria-label={'Hạng ' + rank} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color }}><Award size={20} aria-hidden="true" /><span>{rank}</span></span> : <span>#{rank}</span>;
  };

  return (
    <div className="page-wrapper ui-leaderboard-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div className="page-header-box" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Trophy className="text-amber-400" size={32} color="var(--color-pastel-yellow-text)" />
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Bảng Xếp Hạng Tuần</h1>
        </div>
        <p className="page-subtitle" style={{ color: 'var(--color-text-subtle)' }}>
          Vinh danh các người học có tổng điểm tích lũy cao nhất trong tuần này
        </p>
      </div>

      {/* Hiển thị thứ hạng của tôi nếu có */}
      {data?.me && (
        <div
          className="card-pastel bg-pastel-mint ui-my-rank"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '20px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <Award size={28} color="var(--color-pastel-mint-text)" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-pastel-mint-text)' }}>VỊ TRÍ CỦA BẠN</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', overflowWrap: 'anywhere' }}>
                Hạng #{data.me.rank} ({data.me.displayName})
              </div>
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-pastel-mint-text)' }}>
            {data.me.totalScore?.toLocaleString()} pts
          </div>
        </div>
      )}

      <div
        className="table-card ui-leaderboard-table-wrap"
        style={{
          backgroundColor: 'var(--color-bg-white)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <table className="ui-leaderboard-table" aria-label="Bảng xếp hạng người học trong tuần" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-elevated, var(--color-bg-canvas))', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <th style={{ padding: '1rem 1.25rem', width: '90px', fontSize: '0.85rem', color: 'var(--color-text-subtle)' }}>HẠNG</th>
              <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--color-text-subtle)' }}>NGƯỜI HỌC</th>
              <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-subtle)' }}>ĐIỂM SỐ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-subtle)' }}>
                  Đang tải bảng xếp hạng...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-subtle)' }}>
                  Chưa có dữ liệu bảng xếp hạng cho tuần này.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.userId}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background-color 150ms cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <td style={{ padding: '1.1rem 1.25rem', fontSize: '1.1rem', fontWeight: 800 }}>
                    {getRankBadge(Number(entry.rank))}
                  </td>
                  <td style={{ padding: '1.1rem 1.25rem', fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>
                    {entry.displayName}
                  </td>
                  <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right', fontWeight: 900, color: 'var(--color-brand-primary)' }}>
                    {entry.totalScore.toLocaleString()} pts
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className="card-pastel bg-pastel-yellow"
        style={{
          marginTop: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.5rem',
          borderRadius: '16px',
        }}
      >
        <Sparkles size={20} color="var(--color-pastel-yellow-text)" />
        <span style={{ fontSize: '0.875rem', color: 'var(--color-pastel-yellow-text)', fontWeight: 600 }}>
          Bảng xếp hạng được tự động cập nhật lại mỗi thứ Hai hàng tuần. Chúc bạn đạt thứ hạng cao!
        </span>
      </div>
    </div>
  );
};
