import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Braces, Filter, Layers3, RotateCcw, RotateCw } from 'lucide-react';
import { adminApi, adminKeys } from '../api/adminApi';
import { CONFIG_LABELS } from '../lib/adminForms';
import { auditDate, auditFilters } from '../lib/auditFilters';
import { Empty, ErrorNotice, Loading, Modal, Pagination } from '../components/AdminUI';

function AuditDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useQuery({ queryKey: [...adminKeys.audits, 'detail', id], queryFn: ({ signal }) => adminApi.audit(id, signal) });
  return <Modal title={`Chi tiết thay đổi #${id}`} onClose={onClose}>
    <div className="adm-dialog-body"><ErrorNotice error={query.error} retry={() => void query.refetch()} />{query.isPending ? <Loading /> : query.data && <>
      <p className="adm-muted">{query.data.action} · {query.data.configKey} · {auditDate(query.data.changedAt)} (giờ Việt Nam)<br />Actor #{query.data.actorUserId ?? 'không xác định'} · {query.data.scope}<br />Operation: {query.data.operationId}</p>
      <div className="adm-json-grid"><div><strong>Trước thay đổi</strong><pre tabIndex={0} aria-label="JSON trước thay đổi">{JSON.stringify(query.data.beforeData, null, 2)}</pre></div><div><strong>Sau thay đổi</strong><pre tabIndex={0} aria-label="JSON sau thay đổi">{JSON.stringify(query.data.afterData, null, 2)}</pre></div></div>
    </>}</div>
  </Modal>;
}
const initial = { scope: '', topicId: '', configKey: '', action: '', actorUserId: '', operationId: '', changedFrom: '', changedTo: '' };
export function AuditList() {
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(0); const [size, setSize] = useState(20);
  const [filterError, setFilterError] = useState<unknown>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const query = useQuery({ queryKey: [...adminKeys.audits, applied, page, size], queryFn: ({ signal }) => adminApi.audits({ ...applied, page, size }, signal), staleTime: 0 });
  const errorMessage = filterError instanceof Error ? filterError.message : '';
  const invalid = (field: string) => Boolean(errorMessage && (errorMessage.includes(field) || ['changedFrom', 'changedTo'].includes(field) && errorMessage.toLocaleLowerCase().includes('thời gian')));
  const clearFilters = () => { setDraft(initial); setApplied({}); setPage(0); setFilterError(null); };
  return <>
    <div className="adm-heading"><div><p className="adm-eyebrow">THEO DÕI THAY ĐỔI</p><h1>Lịch sử cấu hình</h1><p>Đối chiếu thay đổi và người thực hiện từ audit backend.</p></div><button type="button" disabled={query.isFetching} aria-busy={query.isFetching} onClick={() => void query.refetch()}><RotateCw size={16} strokeWidth={1.8} className={query.isFetching ? 'adm-button-spinner' : undefined} aria-hidden="true" />Tải lại</button></div>
    <form className="adm-filters" onSubmit={(e) => { e.preventDefault(); try { setApplied(auditFilters(draft)); setPage(0); setFilterError(null); } catch (error) { setFilterError(error); } }}>
      <label>Phạm vi<select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value, topicId: e.target.value === 'GLOBAL' ? '' : draft.topicId })}><option value="">Tất cả</option><option>GLOBAL</option><option>TOPIC</option></select></label>
      <label>Topic ID<input inputMode="numeric" disabled={draft.scope === 'GLOBAL'} value={draft.topicId} aria-invalid={invalid('topicId')} aria-describedby={invalid('topicId') ? 'audit-topic-error' : undefined} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })} />{invalid('topicId') && <small className="adm-field-error" id="audit-topic-error">{errorMessage}</small>}</label>
      <label>Thiết lập<select value={draft.configKey} onChange={(e) => setDraft({ ...draft, configKey: e.target.value })}><option value="">Tất cả</option>{Object.entries(CONFIG_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>Hành động<select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}><option value="">Tất cả</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option></select></label>
      <label>Actor User ID<input inputMode="numeric" value={draft.actorUserId} aria-invalid={invalid('actorUserId')} aria-describedby={invalid('actorUserId') ? 'audit-actor-error' : undefined} onChange={(e) => setDraft({ ...draft, actorUserId: e.target.value })} />{invalid('actorUserId') && <small className="adm-field-error" id="audit-actor-error">{errorMessage}</small>}</label>
      <label>Operation ID<input placeholder="UUID" value={draft.operationId} aria-invalid={Boolean(errorMessage.includes('UUID'))} aria-describedby={errorMessage.includes('UUID') ? 'audit-operation-error' : undefined} onChange={(e) => setDraft({ ...draft, operationId: e.target.value })} />{errorMessage.includes('UUID') && <small className="adm-field-error" id="audit-operation-error">{errorMessage}</small>}</label>
      <label>Từ lúc (UTC+7)<input type="datetime-local" step="1" value={draft.changedFrom} aria-invalid={invalid('changedFrom')} aria-describedby={invalid('changedFrom') ? 'audit-time-error' : undefined} onChange={(e) => setDraft({ ...draft, changedFrom: e.target.value })} /></label>
      <label>Đến lúc (UTC+7)<input type="datetime-local" step="1" value={draft.changedTo} aria-invalid={invalid('changedTo')} aria-describedby={invalid('changedTo') ? 'audit-time-error' : undefined} onChange={(e) => setDraft({ ...draft, changedTo: e.target.value })} />{invalid('changedTo') && <small className="adm-field-error" id="audit-time-error">{errorMessage}</small>}</label>
      <div className="adm-filter-actions"><button type="submit" className="adm-primary"><Filter size={16} strokeWidth={1.8} aria-hidden="true" />Áp dụng bộ lọc</button><button type="button" onClick={clearFilters}><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />Xóa bộ lọc</button></div>
    </form>
    <ErrorNotice error={filterError ?? query.error} retry={query.error ? () => void query.refetch() : undefined} />
    <div className="adm-table-caption"><p>{query.data?.totalElements ?? '—'} thay đổi phù hợp</p><span>Thời gian hiển thị theo UTC+7</span></div>
    <div className="adm-panel">{query.isPending ? <Loading /> : !query.data?.content.length ? <Empty title="Chưa có thay đổi phù hợp" action={<button type="button" onClick={clearFilters}><RotateCcw size={16} aria-hidden="true" />Xóa bộ lọc</button>}>Lịch sử sẽ xuất hiện khi cấu hình được thay đổi. Bạn có thể xóa bộ lọc để xem phạm vi rộng hơn.</Empty> : <div className="adm-table-wrap"><table className="adm-table adm-responsive-table"><caption className="adm-sr-only">Lịch sử thay đổi cấu hình và dữ liệu trước sau</caption><thead><tr><th scope="col">THỜI GIAN (UTC+7)</th><th scope="col">THIẾT LẬP</th><th scope="col">PHẠM VI</th><th scope="col">TRƯỚC / SAU</th><th scope="col">NGƯỜI SỬA</th><th scope="col">CHI TIẾT</th></tr></thead><tbody>{query.data.content.map((item) => <tr key={item.id}>
      <td data-label="Thời gian (UTC+7)" className="adm-cell-number">{auditDate(item.changedAt)}<small>#{item.id} · {item.action}</small></td><td data-label="Thiết lập" className="adm-cell-title">{item.configKey}</td><td data-label="Phạm vi">{item.scope}{item.topicId ? ` #${item.topicId}` : ''}</td>
      <td data-label="Trước / Sau"><span className="adm-value-change"><span>{item.oldValue ?? '—'}</span><ArrowRight size={14} strokeWidth={1.8} aria-label="thành" /><span>{item.newValue ?? '—'}</span></span></td><td data-label="Người sửa" className="adm-cell-number">{item.actorUserId ? `#${item.actorUserId}` : 'Không xác định'}</td>
      <td data-label="Chi tiết" className="adm-row-actions"><div className="adm-actions"><button type="button" onClick={() => setDetail(item.id)}><Braces size={16} strokeWidth={1.8} aria-hidden="true" />Xem JSON</button><button type="button" title={item.operationId} onClick={() => { const next = { ...initial, operationId: item.operationId }; setDraft(next); setApplied(auditFilters(next)); setPage(0); }}><Layers3 size={16} strokeWidth={1.8} aria-hidden="true" />Cùng thao tác</button></div></td>
    </tr>)}</tbody></table></div>}{query.data && <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.totalElements} size={size} onPage={setPage} onSize={(value) => { setSize(value); setPage(0); }} />}</div>
    <p className="adm-muted">Đổi mô tả hoặc trạng thái vẫn tạo audit dù giá trị trước/sau giống nhau. Mở chi tiết JSON để xem đầy đủ.</p>
    {detail !== null && <AuditDetail id={detail} onClose={() => setDetail(null)} />}
  </>;
}
