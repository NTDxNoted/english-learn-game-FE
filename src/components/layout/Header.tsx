import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Hand, Flame, CircleHelp, BookOpen, Trophy, BarChart2, LogOut, LogIn, UserPlus, GraduationCap, Crown, Menu, X, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useToast } from '../../app/providers/useToast';
import { useMyStreak } from '../../features/progress/hooks/useMyStreak';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const streak = useMyStreak(isAuthenticated ? user?.id : undefined);
  const { success, info } = useToast();
  const [menuLocation, setMenuLocation] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const isMenuOpen = menuLocation === location.key;
  const closeMenu = () => setMenuLocation(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuLocation(null); menuButton.current?.focus(); }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setMenuLocation(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('pointerdown', onPointerDown); };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await logout();
      closeMenu();
      success('Bạn đã đăng xuất tài khoản thành công', 'Đăng xuất');
      navigate('/login');
    } finally { setLogoutPending(false); }
  };
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`;

  return <header className="app-header" ref={header}>
    <div className="header-container">
      <Link to="/" className="brand-logo" aria-label="Signly - Về trang chủ" onClick={closeMenu}>
        <div className="logo-badge"><Hand size={22} strokeWidth={2} aria-hidden="true" /></div>
        <span className="font-display text-xl font-bold tracking-tight">Sign<span className="brand-accent">ly</span></span>
      </Link>
      <button ref={menuButton} type="button" className="header-menu-toggle" aria-controls="main-navigation header-account-actions" aria-expanded={isMenuOpen} aria-label={isMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'} onClick={() => setMenuLocation(isMenuOpen ? null : location.key)}>
        {isMenuOpen ? <X size={22} strokeWidth={1.8} aria-hidden="true" /> : <Menu size={22} strokeWidth={1.8} aria-hidden="true" />}
      </button>
      <nav id="main-navigation" className={`header-nav${isMenuOpen ? ' is-open' : ''}`} aria-label="Điều hướng chính">
        <NavLink to="/" end className={navClass} onClick={closeMenu}>Khám phá</NavLink>
        <NavLink to="/topics" className={navClass} onClick={closeMenu}><BookOpen size={16} strokeWidth={1.8} aria-hidden="true" /><span>Chủ đề</span></NavLink>
        <NavLink to="/progress" className={navClass} onClick={closeMenu}><BarChart2 size={16} strokeWidth={1.8} aria-hidden="true" /><span>Tiến trình</span></NavLink>
        <NavLink to="/leaderboard" className={navClass} onClick={closeMenu}><Trophy size={16} strokeWidth={1.8} aria-hidden="true" /><span>Xếp hạng</span></NavLink>
        {user?.role === 'admin' && user.status === 'ACTIVE' && <NavLink to="/admin/topics" className={navClass} onClick={closeMenu}><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" /><span>Quản trị</span></NavLink>}
      </nav>
      <div id="header-account-actions" className={`header-actions${isMenuOpen ? ' is-open' : ''}`}>
        {isAuthenticated && <div className="streak-pill" title="Chuỗi ngày học liên tục" aria-live="polite">
          <Flame size={16} strokeWidth={1.8} aria-hidden="true" />
          {streak.isError ? <button type="button" className="btn-ghost" onClick={() => void streak.refetch()} aria-label="Tải lại chuỗi streak">Tải lại streak</button>
            : streak.data ? <span>{streak.data.currentStreak} ngày liên tiếp</span> : <span>Đang tải streak…</span>}
        </div>}
        <button type="button" className="btn-outline header-help-button" onClick={() => info('Signly hỗ trợ học từ vựng bằng cử chỉ bàn tay qua Webcam!', 'Trợ giúp')} aria-label="Trợ giúp"><CircleHelp size={18} strokeWidth={1.8} aria-hidden="true" /></button>
        {isAuthenticated ? <div className="header-account-group">
          <div className="user-profile-pill" title={`${user?.displayName || 'Người học'} (${user?.email || ''})`}>
            <div className="user-avatar-badge">{user?.role === 'admin' ? <Crown size={16} strokeWidth={1.8} aria-hidden="true" /> : <GraduationCap size={16} strokeWidth={1.8} aria-hidden="true" />}<span className="user-status-dot" title="Tài khoản đang hoạt động" /></div>
            <span>{user?.displayName || 'Người học'}</span>
          </div>
          <button type="button" className="btn-outline header-logout-button" onClick={() => void handleLogout()} title="Đăng xuất khỏi hệ thống" aria-busy={logoutPending} disabled={logoutPending}>
            {logoutPending ? <Loader2 size={16} strokeWidth={1.8} className="ui-spinner" aria-hidden="true" /> : <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />}<span>Đăng xuất</span>
          </button>
        </div> : <div className="header-auth-links">
          <Link to="/login" className="btn-ghost header-login-link" onClick={closeMenu}><LogIn size={16} strokeWidth={1.8} aria-hidden="true" /><span>Đăng nhập</span></Link>
          <Link to="/register" className="btn-3d btn-sm header-register-link" onClick={closeMenu}><UserPlus size={16} strokeWidth={1.8} aria-hidden="true" /><span>Đăng ký</span></Link>
        </div>}
      </div>
    </div>
  </header>;
};
