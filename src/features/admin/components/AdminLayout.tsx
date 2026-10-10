import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, BookOpen, SlidersHorizontal, Users, History, ArrowUpRight, CircleCheck } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import '../admin.css';
const menu = [
  { to: '/admin/topics', title: 'Chủ đề & từ vựng', icon: BookOpen, section: 'topics' },
  { to: '/admin/game-configs/global', title: 'Cấu hình game', icon: SlidersHorizontal, section: 'config' },
  { to: '/admin/users', title: 'Người dùng', icon: Users, section: 'users' },
  { to: '/admin/game-configs/audits', title: 'Lịch sử thay đổi', icon: History, section: 'audit' },
];
export function AdminLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const current = pathname.endsWith('/game-configs') || pathname.endsWith('/global') ? 'config' :
    pathname.includes('/audits') ? 'audit' : pathname.includes('/users') ? 'users' : 'topics';
  return <div className="adm-shell" data-surface="operate">
    <aside className="adm-sidebar" aria-label="Không gian quản trị">
      <div className="adm-brand"><span className="adm-brand-mark"><ShieldCheck size={24} aria-hidden="true" /></span><div>Signly Admin<small>KHÔNG GIAN QUẢN TRỊ</small></div></div>
      <p className="adm-nav-label">QUẢN LÝ HỆ THỐNG</p>
      <nav aria-label="Quản trị">{menu.map(({ to, title, icon: Icon, section }) => <NavLink key={to} to={to} className={current === section ? 'active' : ''} aria-current={current === section ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{title}</span></NavLink>)}</nav>
      <div className="adm-sidebar-bottom"><div className="adm-operator"><span className="adm-operator-avatar" aria-hidden="true">{(user?.displayName || 'A').slice(0, 1).toUpperCase()}</span><div><strong>{user?.displayName || 'Quản trị viên'}</strong><small><CircleCheck size={12} aria-hidden="true" /> Quyền quản trị</small></div></div>
        <Link to="/topics" className="adm-return-link">Về trang học <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </aside>
    <section className="adm-content" aria-label="Nội dung quản trị"><Outlet /></section>
  </div>;
}
