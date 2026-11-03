import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, GraduationCap, LockKeyhole, RotateCw, Search, ShieldCheck, UnlockKeyhole } from 'lucide-react';
import { adminApi, adminKeys } from '../api/adminApi';
import type { AdminUser } from '../types/admin.types';
import { compactFilters, localUserDate } from '../lib/adminForms';
import { ConfirmDialog, Empty, ErrorNotice, Loading, Pagination, Status } from '../components/AdminUI';
type StatusAction = { user: AdminUser; status: AdminUser['status'] };
export function UserList() {
  const client = useQueryClient();
  const [filters, setFilters] = useState({ keyword: '', role: '', status: '', page: 0, size: 20 });
  const [keyword, setKeyword] = useState('');
  const query = useQuery({ queryKey: [...adminKeys.users, filters], queryFn: ({ signal }) => adminApi.users(compactFilters(filters), signal) });
  const [action, setAction] = useState<StatusAction | null>(null);
  const [issues, setIssues] = useState<Record<number, { action: StatusAction; error: unknown }>>({});
  const mutation = useMutation({ mutationFn: (input: StatusAction) => adminApi.userStatus(input.user.id, input.status),
    onSuccess: (_, input) => { setIssues((old) => { const next = { ...old }; delete next[input.user.id]; return next; }); setAction(null); },
    onError: (error, input) => setIssues((old) => ({ ...old, [input.user.id]: { action: input, error } })),
    onSettled: async () => { await client.invalidateQueries({ queryKey: adminKeys.users }); },
  });
  const hasFilters = Boolean(filters.keyword || filters.role || filters.status);
  const clearFilters = () => { setKeyword(''); setFilters({ keyword: '', role: '', status: '', page: 0, size: filters.size }); };
  return <>
    <div className="adm-heading"><div><p className="adm-eyebrow">TÀI KHOẢN & QUYỀN TRUY CẬP</p><h1>Người dùng</h1><p>Tìm kiếm tài khoản và quản lý trạng thái Learner.</p></div><button type="button" disabled={query.isFetching} aria-busy={query.isFetching} onClick={() => void query.refetch()}><RotateCw size={16} strokeWidth={1.8} className={query.isFetching ? 'adm-button-spinner' : undefined} aria-hidden="true" />Tải lại</button></div>
    <form className="adm-toolbar" onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, keyword: keyword.trim(), page: 0 }); }}>
      <label className="adm-filter-field adm-search-field"><span>Tìm tài khoản</span><div className="adm-input-with-icon"><Search size={18} strokeWidth={1.8} aria-hidden="true" /><input aria-label="Tìm tài khoản" placeholder="Email hoặc tên hiển thị…" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div></label>
      <label className="adm-filter-field"><span>Lọc vai trò</span><select aria-label="Lọc vai trò" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 0 })}><option value="">Tất cả vai trò</option><option value="learner">Learner</option><option value="admin">Admin</option></select></label>
      <label className="adm-filter-field"><span>Lọc trạng thái</span><div className="adm-input-with-icon"><Filter size={16} strokeWidth={1.8} aria-hidden="true" /><select aria-label="Lọc trạng thái" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 0 })}><option value="">Tất cả trạng thái</option><option value="ACTIVE">ACTIVE</option><option value="BLOCKED">BLOCKED</option></select></div></label>
      <div className="adm-toolbar-actions"><button type="submit" className="adm-primary"><Search size={16} strokeWidth={1.8} aria-hidden="true" />Tìm kiếm</button>{hasFilters && <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}</div>
    </form>
    <div className="adm-table-caption"><p>{query.data?.totalElements ?? '—'} tài khoản phù hợp</p><span>Tìm kiếm và phân trang từ máy chủ</span></div>
    {Object.entries(issues).map(([id, issue]) => <div className="adm-notice adm-warning" key={id}><strong>Chưa xác nhận đồng bộ {issue.action.status} · {issue.action.user.email}</strong><span>Trạng thái trong DB có thể đã thay đổi. Danh sách được tải lại; nếu tải lỗi, chưa thể xác nhận kết quả.</span><ErrorNotice error={issue.error} /><button type="button" onClick={() => { mutation.reset(); setAction(issue.action); }}><RotateCw size={16} strokeWidth={1.8} aria-hidden="true" />Thử đồng bộ lại {issue.action.status}</button></div>)}
    <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    <div className="adm-panel">{query.isPending ? <Loading /> : !query.data?.content.length ? <Empty title={hasFilters ? 'Không tìm thấy tài khoản' : 'Chưa có tài khoản trong danh sách'} action={<button type="button" onClick={hasFilters ? clearFilters : () => void query.refetch()}>{hasFilters ? 'Xóa bộ lọc' : 'Tải lại danh sách'}</button>}>{hasFilters ? 'Thử email, tên hiển thị hoặc trạng thái khác để tìm tài khoản bạn cần.' : 'Danh sách sẽ hiển thị tài khoản được đồng bộ từ backend.'}</Empty> : <div className="adm-table-wrap"><table className="adm-table adm-responsive-table"><caption className="adm-sr-only">Danh sách tài khoản và trạng thái truy cập</caption><thead><tr><th scope="col">TÀI KHOẢN</th><th scope="col">VAI TRÒ</th><th scope="col">TRẠNG THÁI</th><th scope="col">NGÀY TẠO</th><th scope="col">THAO TÁC</th></tr></thead><tbody>{query.data.content.map((user) => <tr key={user.id}>
      <td data-label="Tài khoản" className="adm-cell-title"><strong id={`user-${user.id}-name`}>{user.displayName || user.email}</strong><small>{user.email} · #{user.id}</small></td>
      <td data-label="Vai trò"><span className="adm-role-label">{user.role === 'admin' ? <ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" /> : <GraduationCap size={16} strokeWidth={1.8} aria-hidden="true" />}{user.role}</span></td>
      <td data-label="Trạng thái"><Status active={user.status === 'ACTIVE'} labels={['BLOCKED', 'ACTIVE']} /></td>
      <td data-label="Ngày tạo" className="adm-cell-number">{localUserDate(user.createdAt)}</td>
      <td data-label="Thao tác" className="adm-row-actions">{user.role === 'learner' ? <button type="button" aria-describedby={`user-${user.id}-name`} disabled={mutation.isPending} onClick={() => { mutation.reset(); setAction({ user, status: user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' }); }}>{user.status === 'ACTIVE' ? <LockKeyhole size={16} strokeWidth={1.8} aria-hidden="true" /> : <UnlockKeyhole size={16} strokeWidth={1.8} aria-hidden="true" />}{user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}</button> : <small className="adm-muted">Không quản lý trạng thái Admin</small>}</td>
    </tr>)}</tbody></table></div>}
      {query.data && <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalElements} size={filters.size} onPage={(page) => setFilters({ ...filters, page })} onSize={(size) => setFilters({ ...filters, size, page: 0 })} />}
    </div>
    <p className="adm-muted">Thời gian User hiển thị nguyên giá trị từ backend (chưa xác nhận múi giờ dữ liệu cũ).</p>
    {action && <ConfirmDialog title={action.status === 'BLOCKED' ? 'Khóa tài khoản Learner' : 'Mở khóa Learner'} busy={mutation.isPending} error={mutation.error} onClose={() => setAction(null)} onConfirm={() => mutation.mutate(action)}><p>Đặt trạng thái <strong>{action.status}</strong> cho <strong>{action.user.email}</strong>?</p><p className="adm-muted">Thao tác đồng bộ với Cognito. Nếu AWS lỗi khi khóa, tài khoản có thể vẫn bị khóa trong DB; kiểm tra lại danh sách trước khi thử lại.</p></ConfirmDialog>}
  </>;
}
