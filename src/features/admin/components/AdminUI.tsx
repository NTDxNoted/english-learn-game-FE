import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertCircle, CircleCheck, Inbox, Loader2, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ApiError } from '../../../types/api.types';

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return <div className="adm-notice adm-error" role="alert">
    <AlertCircle size={20} className="adm-notice-icon" aria-hidden="true" />
    <div><strong>Chưa thể hoàn tất thao tác</strong><p>{error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.'}</p>
      {error instanceof ApiError && <details><summary>Chi tiết lỗi</summary><small>{error.errorCode}</small></details>}
    </div>
    {retry && <button type="button" onClick={retry}><RefreshCw size={16} aria-hidden="true" />Tải lại</button>}
  </div>;
}
export function SuccessNotice({ children }: { children: ReactNode }) {
  return <div className="adm-notice adm-success" role="status"><CircleCheck size={20} aria-hidden="true" /><p>{children}</p></div>;
}
export function Status({ active, labels = ['Đã ẩn', 'Đang hiển thị'] }: { active: boolean; labels?: [string, string] }) {
  return <span className={`adm-badge ${active ? 'adm-active' : 'adm-inactive'}`}><span className="adm-status-dot" aria-hidden="true" />{labels[active ? 1 : 0]}</span>;
}
export function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return <dialog className="adm-dialog" ref={ref} aria-labelledby={titleId} aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="adm-dialog-header"><div><span className="adm-eyebrow">SIGNLY ADMIN</span><h2 id={titleId}>{title}</h2></div><button type="button" className="adm-icon-button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
    {children}
  </dialog>;
}
export function ConfirmDialog({ title, children, onClose, onConfirm, busy, error }: {
  title: string; children: ReactNode; onClose: () => void; onConfirm: () => void; busy: boolean; error?: unknown;
}) {
  return <Modal title={title} onClose={onClose} busy={busy}>
    <div className="adm-dialog-body">{children}<ErrorNotice error={error} /></div>
    <div className="adm-dialog-actions"><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button type="button" className="adm-primary" aria-busy={busy} disabled={busy} onClick={onConfirm}><span className="adm-button-content"><span className="adm-button-label">Xác nhận</span>{busy && <Loader2 className="adm-button-spinner" size={18} aria-hidden="true" />}</span></button></div>
  </Modal>;
}
export function Pagination({ page, totalPages, total, size, onPage, onSize }: {
  page: number; totalPages: number; total: number; size: number; onPage: (page: number) => void; onSize: (size: number) => void;
}) {
  return <nav className="adm-pagination" aria-label="Phân trang">
    <span><strong>{total.toLocaleString('vi-VN')}</strong> kết quả <span aria-hidden="true">·</span> Trang {totalPages ? page + 1 : 0}/{totalPages}</span>
    <label>Số dòng <select value={size} onChange={(e) => onSize(Number(e.target.value))}>{[10, 20, 50, 100].map((n) => <option key={n}>{n}</option>)}</select></label>
    <div className="adm-pagination-actions"><button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" />Trước</button>
    <button type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Sau<ChevronRight size={16} aria-hidden="true" /></button></div>
  </nav>;
}
export function Loading() { return <div className="adm-loading" role="status" aria-live="polite"><span className="adm-loading-label"><Loader2 size={18} aria-hidden="true" />Đang tải dữ liệu…</span><div className="adm-skeleton-list" aria-hidden="true">{[0, 1, 2, 3].map((row) => <div className="adm-skeleton-row" key={row}><i /><i /><i /></div>)}</div></div>; }
export function Empty({ children = 'Chưa có dữ liệu phù hợp.', title = 'Chưa có dữ liệu', action }: { children?: ReactNode; title?: string; action?: ReactNode }) { return <div className="adm-empty"><span className="adm-empty-icon"><Inbox size={28} strokeWidth={1.7} aria-hidden="true" /></span><h3>{title}</h3><p>{children}</p>{action && <div className="adm-empty-action">{action}</div>}</div>; }
