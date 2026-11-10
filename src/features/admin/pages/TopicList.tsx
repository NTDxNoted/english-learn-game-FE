import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, EyeOff, Filter, ImageOff, Pencil, Plus, RotateCcw, RotateCw, Search, Settings2 } from 'lucide-react';
import { adminApi, adminKeys } from '../api/adminApi';
import type { AdminTopic } from '../types/admin.types';
import { TopicForm } from '../components/TopicForm';
import { ConfirmDialog, Empty, ErrorNotice, Loading, Status } from '../components/AdminUI';

function TopicImage({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? <img className="adm-thumb" src={url} alt={name} onError={() => setFailed(true)} /> :
    <span className="adm-thumb adm-thumb-empty" role="img" aria-label={`Chưa có ảnh cho ${name}`}><ImageOff size={20} strokeWidth={1.8} aria-hidden="true" /></span>;
}

export function TopicList() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: adminKeys.topics, queryFn: ({ signal }) => adminApi.topics(signal), staleTime: 0 });
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [editor, setEditor] = useState<{ topic?: AdminTopic } | null>(null);
  const [action, setAction] = useState<{ topic: AdminTopic; restore: boolean } | null>(null);
  const invalidate = async () => { await Promise.all([client.invalidateQueries({ queryKey: adminKeys.topics }), client.invalidateQueries({ queryKey: ['topics'] })]); };
  const mutation = useMutation({ mutationFn: async () => { if (!action) return; if (action.restore) await adminApi.restoreTopic(action.topic.id); else await adminApi.hideTopic(action.topic.id); },
    onSuccess: async () => { await invalidate(); setAction(null); } });
  const topics = (query.data ?? []).filter((topic) => (!status || String(topic.isActive) === status) && `${topic.name} ${topic.description ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const activeCount = query.data?.filter((topic) => topic.isActive).length;
  const hasFilters = Boolean(search || status);
  const clearFilters = () => { setSearch(''); setStatus(''); };
  return <>
    <div className="adm-heading">
      <div><p className="adm-eyebrow">NỘI DUNG HỌC TẬP</p><h1>Chủ đề học tập</h1><p>Sắp xếp nội dung và quản lý những chủ đề người học có thể khám phá.</p></div>
      <button className="adm-primary" onClick={() => setEditor({})}><Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Thêm chủ đề</button>
    </div>
    <dl className="adm-summary-strip" aria-label="Tổng quan danh sách chủ đề">
      <div className="adm-summary-item"><dt>Chủ đề đã tải</dt><dd>{query.data?.length ?? '—'}</dd></div>
      <div className="adm-summary-item"><dt>Đang hiển thị</dt><dd>{activeCount ?? '—'}</dd></div>
      <div className="adm-summary-item"><dt>Đã ẩn</dt><dd>{query.data ? query.data.length - (activeCount ?? 0) : '—'}</dd></div>
    </dl>
    <div className="adm-toolbar">
      <label className="adm-filter-field adm-search-field"><span>Tìm chủ đề</span><div className="adm-input-with-icon"><Search size={18} strokeWidth={1.8} aria-hidden="true" /><input aria-label="Tìm chủ đề" placeholder="Tên hoặc mô tả chủ đề…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></label>
      <label className="adm-filter-field"><span>Trạng thái chủ đề</span><div className="adm-input-with-icon"><Filter size={16} strokeWidth={1.8} aria-hidden="true" /><select aria-label="Trạng thái chủ đề" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Đang hiển thị</option><option value="false">Đã ẩn</option></select></div></label>
      <div className="adm-toolbar-actions">{hasFilters && <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}<button type="button" disabled={query.isFetching} aria-busy={query.isFetching} onClick={() => void query.refetch()}><RotateCw size={16} strokeWidth={1.8} className={query.isFetching ? 'adm-button-spinner' : undefined} aria-hidden="true" /> Tải lại</button></div>
    </div>
    <div className="adm-table-caption"><p>{topics.length} / {query.data?.length ?? 0} chủ đề</p><span>Tìm kiếm trên danh sách đã tải</span></div>
    <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    <div className="adm-panel">{query.isPending ? <Loading /> : !topics.length ? <Empty title={hasFilters ? 'Không tìm thấy chủ đề' : 'Bắt đầu với chủ đề đầu tiên'} action={hasFilters ? <button type="button" onClick={clearFilters}>Xóa bộ lọc</button> : <button type="button" className="adm-primary" onClick={() => setEditor({})}><Plus size={18} aria-hidden="true" /> Thêm chủ đề</button>}>{hasFilters ? 'Thử thay đổi từ khóa hoặc trạng thái để tìm nội dung bạn cần.' : 'Tạo chủ đề để nhóm từ vựng thành những nội dung học dễ khám phá.'}</Empty> : <div className="adm-table-wrap"><table className="adm-table adm-responsive-table"><caption className="adm-sr-only">Danh sách chủ đề, trạng thái và các thao tác quản lý</caption><thead><tr><th scope="col">ẢNH</th><th scope="col">CHỦ ĐỀ</th><th scope="col">THỨ TỰ</th><th scope="col">TRẠNG THÁI</th><th scope="col">THAO TÁC</th></tr></thead><tbody>{topics.map((topic) => <tr key={topic.id}>
      <td data-label="Ảnh" className="adm-cell-image"><TopicImage key={topic.imageUrl ?? ''} url={topic.imageUrl} name={topic.name} /></td>
      <td data-label="Chủ đề" className="adm-cell-title"><strong id={`topic-${topic.id}-name`}>{topic.name}</strong><small>{topic.description || 'Chưa có mô tả'}</small></td>
      <td data-label="Thứ tự" className="adm-cell-number">{topic.orderNo ?? '—'}</td>
      <td data-label="Trạng thái"><Status active={topic.isActive} /></td>
      <td data-label="Thao tác" className="adm-row-actions"><div className="adm-actions">
        <Link className="adm-link" aria-describedby={`topic-${topic.id}-name`} to={`/admin/topics/${topic.id}/vocabularies`}><BookOpen size={16} strokeWidth={1.8} aria-hidden="true" />Từ vựng</Link>
        <Link className="adm-link" aria-describedby={`topic-${topic.id}-name`} to={`/admin/topics/${topic.id}/game-configs`}><Settings2 size={16} strokeWidth={1.8} aria-hidden="true" />Cấu hình</Link>
        <button type="button" aria-describedby={`topic-${topic.id}-name`} onClick={() => setEditor({ topic })}><Pencil size={16} strokeWidth={1.8} aria-hidden="true" />Sửa</button>
        <button type="button" aria-describedby={`topic-${topic.id}-name`} onClick={() => { mutation.reset(); setAction({ topic, restore: !topic.isActive }); }}>{topic.isActive ? <EyeOff size={16} strokeWidth={1.8} aria-hidden="true" /> : <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />}{topic.isActive ? 'Ẩn' : 'Khôi phục'}</button>
      </div></td>
    </tr>)}</tbody></table></div>}</div>
    {editor && <TopicForm topic={editor.topic} onClose={() => setEditor(null)} onSaved={invalidate} />}
    {action && <ConfirmDialog title={action.restore ? 'Khôi phục chủ đề' : 'Ẩn chủ đề'} busy={mutation.isPending} error={mutation.error} onClose={() => setAction(null)} onConfirm={() => mutation.mutate()}>
      <p>{action.restore ? 'Khôi phục' : 'Ẩn'} chủ đề <strong>{action.topic.name}</strong>?</p><p className="adm-muted">Dữ liệu từ vựng và lịch sử học vẫn được giữ. Khôi phục chủ đề không tự khôi phục từ vựng đã ẩn riêng.</p>
    </ConfirmDialog>}
  </>;
}
