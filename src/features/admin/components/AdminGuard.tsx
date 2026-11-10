import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <p role="status">Đang kiểm tra quyền quản trị…</p>;
  if (!isAuthenticated || !user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.status !== 'ACTIVE' || user.role !== 'admin') return <div role="alert"><h1>Bạn không có quyền quản trị</h1><Link to="/topics">Về trang học</Link></div>;
  return <>{children}</>;
}
