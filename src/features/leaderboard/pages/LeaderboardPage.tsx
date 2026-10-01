import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const topUsers = [
    { rank: 1, name: 'Nguyễn Văn A', points: 3200, badge: '🥇' },
    { rank: 2, name: 'Trần Thị B', points: 2850, badge: '🥈' },
    { rank: 3, name: 'Lê Hoàng C', points: 2600, badge: '🥉' },
    { rank: 4, name: 'Phạm Minh D', points: 2100, badge: '4' },
    { rank: 5, name: 'Đỗ Hải E', points: 1950, badge: '5' },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header-box">
        <div className="page-title-row">
          <Trophy className="text-amber-400" size={28} />
          <h1 className="page-title">Bảng Xếp Hạng Tuần (LEADERBOARD-01)</h1>
        </div>
        <p className="page-subtitle">Vinh danh các người học có điểm số cao nhất trong tuần</p>
      </div>

      <div className="table-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Hạng</th>
              <th>Người học</th>
              <th style={{ textAlign: 'right' }}>Điểm số</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((user) => (
              <tr key={user.rank}>
                <td>
                  <span className="rank-badge">{user.badge}</span>
                </td>
                <td className="font-medium">{user.name}</td>
                <td style={{ textAlign: 'right' }} className="font-bold text-primary">
                  {user.points.toLocaleString()} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alert alert-info mt-6">
        <Sparkles size={18} />
        <span>Sẵn sàng kết nối GET /api/v1/leaderboard/weekly ở issue LEADERBOARD-01.</span>
      </div>
    </div>
  );
};
