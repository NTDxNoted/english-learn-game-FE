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
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div className="page-header-box" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Trophy className="text-amber-400" size={32} color="#f59e0b" />
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Bảng Xếp Hạng Tuần</h1>
        </div>
        <p className="page-subtitle" style={{ color: 'var(--color-text-subtle)' }}>
          Vinh danh các người học có tổng điểm tích lũy cao nhất trong tuần này
        </p>
      </div>

      {/* Hiển thị thứ hạng của tôi nếu có */}
      {data?.me && (
        <div
          className="card-pastel bg-pastel-mint"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '20px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Award size={28} color="#1f7a55" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f7a55' }}>VỊ TRÍ CỦA BẠN</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                Hạng #{data.me.rank} ({data.me.displayName})
              </div>
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1f7a55' }}>
            {data.me.totalScore?.toLocaleString()} pts
          </div>
        </div>
      )}

      <div
        className="table-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0,0,0,0.05))',
          overflow: 'hidden',
          border: '1px solid var(--color-border-subtle, #f0f0f0)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
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
                    borderBottom: '1px solid #f8f8f8',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <td style={{ padding: '1.1rem 1.25rem', fontSize: '1.1rem', fontWeight: 800 }}>
                    {getRankBadge(Number(entry.rank))}
                  </td>
                  <td style={{ padding: '1.1rem 1.25rem', fontWeight: 700 }}>
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
        <Sparkles size={20} color="#b27715" />
        <span style={{ fontSize: '0.875rem', color: '#8e641d', fontWeight: 600 }}>
          Bảng xếp hạng được tự động cập nhật lại mỗi thứ Hai hàng tuần. Chúc bạn đạt thứ hạng cao!
        </span>
      </div>
    </div>
  );
};
