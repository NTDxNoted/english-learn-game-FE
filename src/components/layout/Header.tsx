import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  BookOpen,
  Trophy,
  BarChart2,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { tokenStorage } from '../../lib/tokenStorage';
import { useToast } from '../../app/providers/useToast';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const isLoggedIn = tokenStorage.hasAccessToken();

  const handleLogout = () => {
    tokenStorage.removeAccessToken();
    success('Bạn đã đăng xuất thành công', 'Đăng xuất');
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="brand-logo">
          <div className="logo-icon-badge">
            <Gamepad2 size={24} />
          </div>
          <span className="brand-name">
            English<span className="brand-accent">Quest</span>
          </span>
        </Link>

        <nav className="header-nav">
          <NavLink
            to="/topics"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Chủ đề học</span>
          </NavLink>

          <NavLink
            to="/progress"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BarChart2 size={18} />
            <span>Tiến trình & Streak</span>
          </NavLink>

          <NavLink
            to="/leaderboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Trophy size={18} />
            <span>Bảng xếp hạng</span>
          </NavLink>

          <NavLink
            to="/admin/topics"
            className={({ isActive }) => `nav-link admin-nav-link ${isActive ? 'active' : ''}`}
          >
            <ShieldCheck size={18} />
            <span>Quản trị</span>
          </NavLink>
        </nav>

        <div className="header-actions">
          {isLoggedIn ? (
            <div className="user-profile-menu">
              <span className="user-badge">Learner</span>
              <button
                type="button"
                className="btn btn-outline btn-sm logout-btn"
                onClick={handleLogout}
                title="Đăng xuất"
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="auth-btn-group">
              <Link to="/login" className="btn btn-ghost btn-sm">
                <LogIn size={16} />
                <span>Đăng nhập</span>
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
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
