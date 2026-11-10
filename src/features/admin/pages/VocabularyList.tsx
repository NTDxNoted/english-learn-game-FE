import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AudioLines, EyeOff, Filter, Loader2, Pencil, Plus, RotateCw, Search, Settings2, Volume2 } from 'lucide-react';
import { adminApi, adminKeys } from '../api/adminApi';
import type { AdminVocabulary } from '../types/admin.types';
import { VocabularyAudioPlayer } from '../../../lib/vocabularyAudio';
import { ConfirmDialog, Empty, ErrorNotice, Loading, Status } from '../components/AdminUI';
import { VocabularyForm } from '../components/VocabularyForm';

export function VocabularyList() {
  const { topicId } = useParams(); const id = Number(topicId);
  if (!Number.isSafeInteger(id) || id <= 0) return <ErrorNotice error={new Error('ID chủ đề không hợp lệ.')} />;
  return <VocabularyContent key={id} topicId={id} />;
}
function VocabularyContent({ topicId }: { topicId: number }) {
  const client = useQueryClient(); const navigate = useNavigate();
  const query = useQuery({ queryKey: adminKeys.vocabularies(topicId), queryFn: ({ signal }) => adminApi.vocabularies(topicId, signal), staleTime: 0 });
  const topics = useQuery({ queryKey: adminKeys.topics, queryFn: ({ signal }) => adminApi.topics(signal) });
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [editor, setEditor] = useState<{ vocabulary?: AdminVocabulary } | null>(null);
  const [hidden, setHidden] = useState<AdminVocabulary | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [audioError, setAudioError] = useState<Error | null>(null);
  const [audioBusy, setAudioBusy] = useState(false); const [audioId, setAudioId] = useState<number | null>(null);
  const report = useCallback((message: string) => setAudioError(new Error(message)), []);
  const player = useMemo(() => new VocabularyAudioPlayer(setAudioBusy, report), [report]);
  useEffect(() => () => player.stop(), [player]);
  const invalidate = async () => { await Promise.all([client.invalidateQueries({ queryKey: adminKeys.vocabularies(topicId) }), client.invalidateQueries({ queryKey: ['topics'] })]); };
  const remove = useMutation({ mutationFn: () => adminApi.hideVocabulary(topicId, hidden!.id), onSuccess: async () => { player.stop(); await invalidate(); setHidden(null); } });
  const backfill = useMutation({ mutationFn: () => adminApi.backfill(topicId), onSuccess: () => setBackfillOpen(false), onSettled: invalidate });
  const speak = (vocabulary: AdminVocabulary) => {
    setAudioError(null); setAudioId(vocabulary.id);
    void player.play(vocabulary.audioUrl, async () => {
      const fresh = await adminApi.vocabularies(topicId);
      client.setQueryData(adminKeys.vocabularies(topicId), fresh);
      return fresh.find((item) => item.id === vocabulary.id)?.audioUrl ?? null;
    });
  };
  const filtered = (query.data ?? []).filter((item) => (!status || String(item.active) === status) && `${item.word} ${item.meaningVi}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const topicName = topics.data?.find((topic) => topic.id === topicId)?.name ?? `#${topicId}`;
  const hasFilters = Boolean(search || status);
  const clearFilters = () => { setSearch(''); setStatus(''); player.stop(); };
  return <>
    <div className="adm-page-links"><Link className="adm-link" to="/admin/topics"><ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />Chủ đề</Link><Link className="adm-link" to={`/admin/topics/${topicId}/game-configs`}><Settings2 size={16} strokeWidth={1.8} aria-hidden="true" />Cấu hình chủ đề</Link></div>
    <div className="adm-heading"><div><p className="adm-eyebrow">THƯ VIỆN TỪ VỰNG</p><h1>Từ vựng · {topicName}</h1><p>Quản lý nghĩa, phiên âm và âm thanh cho từng từ trong chủ đề.</p></div><button className="adm-primary" onClick={() => setEditor({})}><Plus size={18} strokeWidth={1.8} aria-hidden="true" />Thêm từ vựng</button></div>
    <div className="adm-toolbar">
      <label className="adm-filter-field"><span>Chọn chủ đề</span><select aria-label="Chọn chủ đề" value={topicId} onChange={(e) => navigate(`/admin/topics/${e.target.value}/vocabularies`)}>{!topics.data?.some((t) => t.id === topicId) && <option value={topicId}>{topicName}</option>}{topics.data?.map((topic) => <option value={topic.id} key={topic.id}>{topic.name}{topic.isActive ? '' : ' (đã ẩn)'}</option>)}</select></label>
      <label className="adm-filter-field adm-search-field"><span>Tìm từ vựng</span><div className="adm-input-with-icon"><Search size={18} strokeWidth={1.8} aria-hidden="true" /><input aria-label="Tìm từ vựng" placeholder="Từ tiếng Anh hoặc nghĩa…" value={search} onChange={(e) => { setSearch(e.target.value); player.stop(); }} /></div></label>
      <label className="adm-filter-field"><span>Trạng thái từ vựng</span><div className="adm-input-with-icon"><Filter size={16} strokeWidth={1.8} aria-hidden="true" /><select aria-label="Trạng thái từ vựng" value={status} onChange={(e) => { setStatus(e.target.value); player.stop(); }}><option value="">Tất cả trạng thái</option><option value="true">Đang hiển thị</option><option value="false">Đã ẩn</option></select></div></label>
      <div className="adm-toolbar-actions">{hasFilters && <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}<button type="button" disabled={query.isFetching} aria-busy={query.isFetching} onClick={() => void query.refetch()}><RotateCw size={16} strokeWidth={1.8} className={query.isFetching ? 'adm-button-spinner' : undefined} aria-hidden="true" />Tải lại</button></div>
    </div>
    <div className="adm-table-caption"><p>{filtered.length} / {query.data?.length ?? 0} từ</p><span>Lọc trên danh sách đã tải</span><button type="button" className="adm-audio-backfill" disabled={backfill.isPending} aria-busy={backfill.isPending} onClick={() => { backfill.reset(); setBackfillOpen(true); }}>{backfill.isPending ? <Loader2 size={16} strokeWidth={1.8} className="adm-button-spinner" aria-hidden="true" /> : <AudioLines size={16} strokeWidth={1.8} aria-hidden="true" />}Tạo âm thanh còn thiếu</button></div>
    <ErrorNotice error={query.error ?? audioError} retry={() => void query.refetch()} />
    {backfill.data && <div role="status" className={`adm-notice ${backfill.data.failed ? 'adm-warning' : 'adm-success'}`}>
      {backfill.data.totalMissing === 0 ? 'Không có từ cần tạo âm thanh.' : `Cần tạo: ${backfill.data.totalMissing} · Thành công: ${backfill.data.generated} · Lỗi: ${backfill.data.failed}`}
      {backfill.data.failedVocabularyIds.length > 0 && <span>ID từ bị lỗi: {backfill.data.failedVocabularyIds.join(', ')}</span>}
    </div>}
    <div className="adm-panel">{query.isPending ? <Loading /> : !filtered.length ? <Empty title={hasFilters ? 'Không tìm thấy từ vựng' : 'Chủ đề chưa có từ vựng'} action={hasFilters ? <button type="button" onClick={clearFilters}>Xóa bộ lọc</button> : <button type="button" className="adm-primary" onClick={() => setEditor({})}><Plus size={18} aria-hidden="true" />Thêm từ vựng</button>}>{hasFilters ? 'Thử một từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.' : 'Thêm từ tiếng Anh và nghĩa tiếng Việt. Phiên âm và âm thanh sẽ được tạo khi lưu.'}</Empty> : <div className="adm-table-wrap"><table className="adm-table adm-responsive-table"><caption className="adm-sr-only">Từ vựng thuộc chủ đề {topicName}</caption><thead><tr><th scope="col">TỪ VỰNG</th><th scope="col">NGHĨA / IPA</th><th scope="col">ÂM THANH</th><th scope="col">THỨ TỰ</th><th scope="col">TRẠNG THÁI</th><th scope="col">THAO TÁC</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}>
      <td data-label="Từ vựng" className="adm-cell-title"><strong id={`vocabulary-${item.id}-word`}>{item.word}</strong><small>#{item.id}</small></td>
      <td data-label="Nghĩa / IPA">{item.meaningVi}<small className="adm-ipa-text">{item.ipa ?? 'Chưa có IPA'}</small></td>
      <td data-label="Âm thanh"><button type="button" aria-label={`Nghe ${item.word}`} aria-busy={audioBusy && audioId === item.id} title={item.audioUrl ? 'Nghe phát âm' : 'Chưa có âm thanh'} disabled={!item.audioUrl || audioBusy && audioId === item.id} onClick={() => speak(item)}>{audioBusy && audioId === item.id ? <Loader2 size={16} strokeWidth={1.8} className="adm-button-spinner" aria-hidden="true" /> : <Volume2 size={16} strokeWidth={1.8} aria-hidden="true" />} {audioBusy && audioId === item.id ? 'Đang phát…' : 'Nghe'}</button></td>
      <td data-label="Thứ tự" className="adm-cell-number">{item.orderNo}</td><td data-label="Trạng thái"><Status active={item.active} /></td>
      <td data-label="Thao tác" className="adm-row-actions"><div className="adm-actions"><button type="button" aria-describedby={`vocabulary-${item.id}-word`} onClick={() => setEditor({ vocabulary: item })}><Pencil size={16} strokeWidth={1.8} aria-hidden="true" />Sửa</button><button type="button" aria-describedby={`vocabulary-${item.id}-word`} disabled={!item.active} onClick={() => { remove.reset(); setHidden(item); }}><EyeOff size={16} strokeWidth={1.8} aria-hidden="true" />Ẩn</button></div></td>
    </tr>)}</tbody></table></div>}</div>
    <p className="adm-muted">Ẩn từ sẽ giữ lại lịch sử chơi. Từ đã ẩn hiện chưa có chức năng khôi phục.</p>
    {editor && <VocabularyForm topicId={topicId} vocabulary={editor.vocabulary} onClose={() => setEditor(null)} onSaved={invalidate} />}
    {hidden && <ConfirmDialog title="Ẩn từ vựng" busy={remove.isPending} error={remove.error} onClose={() => setHidden(null)} onConfirm={() => remove.mutate()}><p>Ẩn từ <strong>{hidden.word}</strong>? Lịch sử chơi vẫn được giữ. Hiện chưa có API khôi phục từ đã ẩn.</p></ConfirmDialog>}
    {backfillOpen && <ConfirmDialog title="Tạo âm thanh còn thiếu" busy={backfill.isPending} error={backfill.error} onClose={() => setBackfillOpen(false)} onConfirm={() => backfill.mutate()}><p>Tạo âm thanh còn thiếu cho các từ đang hiển thị của chủ đề <strong>{topicName}</strong>?</p><p className="adm-muted">Có thể mất thời gian. Nếu hết thời gian chờ, máy chủ có thể vẫn xử lý; tải lại danh sách trước khi thử lại. API này không kiểm tra file S3 bị mất nếu đã có key hợp lệ.</p></ConfirmDialog>}
  </>;
}
