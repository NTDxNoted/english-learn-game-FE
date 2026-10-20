import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Hand,
  Flame,
  CircleHelp,
  BookOpen,
  Trophy,
  BarChart2,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  User,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useToast } from '../../app/providers/useToast';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { success, info } = useToast();

  const handleLogout = async () => {
    await logout();
    success('Bạn đã đăng xuất tài khoản thành công', 'Đăng xuất');
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" aria-label="Signly - Về trang chủ">
          <div className="logo-badge">
            <Hand size={22} className="stroke-[2.2]" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Sign<span className="brand-accent">ly</span>
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="header-nav" aria-label="Điều hướng chính">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>Khám phá</span>
          </NavLink>

          <NavLink
            to="/topics"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={16} />
            <span>Chủ đề</span>
          </NavLink>

          <NavLink
            to="/progress"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BarChart2 size={16} />
            <span>Tiến trình</span>
          </NavLink>

          <NavLink
            to="/leaderboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Trophy size={16} />
            <span>Xếp hạng</span>
          </NavLink>

          <NavLink
            to="/admin/topics"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ShieldCheck size={16} />
            <span>Admin</span>
          </NavLink>
        </nav>

        {/* Right side status & action buttons */}
        <div className="header-actions">
          {/* Streak pill badge - Hiển thị streak thật từ tài khoản người dùng */}
          {isAuthenticated && (
            <div className="streak-pill" title="Chuỗi ngày học liên tục">
              <Flame size={16} color="#ff7b62" className="fill-[#ff7b62]" />
              <span>{user?.currentStreak ?? 0} ngày liên tiếp</span>
            </div>
          )}

          <button
            type="button"
            className="btn-outline"
            style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0 }}
            onClick={() => info('Signly hỗ trợ học từ vựng bằng cử chỉ bàn tay qua Webcam!', 'Trợ giúp')}
            aria-label="Trợ giúp"
          >
            <CircleHelp size={18} />
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Thông tin người dùng */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--color-pastel-lavender)',
                  color: 'var(--color-brand-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
                title={user?.email || 'Người học'}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-brand-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={14} />
                </div>
                <span>{user?.displayName || 'Người học'}</span>
              </div>

              {/* Nút Đăng xuất */}
              <button
                type="button"
                className="btn-outline"
                onClick={handleLogout}
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost">
                <LogIn size={16} />
                <span>Đăng nhập</span>
              </Link>
              <Link to="/register" className="btn-3d btn-sm" style={{ padding: '0.45rem 1rem' }}>
                <UserPlus size={16} />
                <span>Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
