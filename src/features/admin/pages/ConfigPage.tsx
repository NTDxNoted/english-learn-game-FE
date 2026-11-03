import { useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, History, Info, Loader2, Pencil, RefreshCw, RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import { adminApi, adminKeys } from '../api/adminApi';
import type { AdminConfig, ConfigKey } from '../types/admin.types';
import { CONFIG_LABELS, validateConfig } from '../lib/adminForms';
import { ApiError } from '../../../types/api.types';
import { ConfirmDialog, Empty, ErrorNotice, Loading, Modal } from '../components/AdminUI';
import { FormField } from '../components/FormField';
import { fieldDescription } from '../components/fieldDescription';

type ConfigField = 'configValue' | 'description';
function ConfigForm({ row, topicId, onClose, onSaved }: { row: AdminConfig; topicId?: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const formId = useId(); const form = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(topicId ? row.overrideValue ?? row.globalValue ?? '' : row.globalValue ?? '');
  const [description, setDescription] = useState(topicId ? row.overrideDescription ?? '' : row.globalDescription ?? '');
  const [active, setActive] = useState(row.overrideActive ?? true);
  const [errors, setErrors] = useState<Partial<Record<ConfigField, string>>>({});
  const boolean = row.configKey === 'score_enabled' || row.configKey === 'streak_enabled';
  const save = useMutation({ mutationFn: () => {
    validateConfig(row.configKey, value, description);
    return adminApi.saveConfig(row.configKey, { configValue: value, description: description.trim(), ...(topicId ? { active } : {}) }, topicId);
  }, onSuccess: async () => { await onSaved(); onClose(); } });
  const validate = () => {
    const next: Partial<Record<ConfigField, string>> = {};
    try { validateConfig(row.configKey, value, 'validation'); }
    catch (error) { next.configValue = error instanceof Error ? error.message : 'Kiểm tra lại giá trị cấu hình.'; }
    if (!description.trim()) next.description = 'Nhập mô tả để người quản trị khác hiểu lý do thay đổi.';
    return next;
  };
  const errorFor = (field: ConfigField) => errors[field] ?? (save.error instanceof ApiError ? save.error.errors.find((error) => error.field === field)?.message : undefined);
  const valueId = `${formId}-value`; const descriptionId = `${formId}-description`;
  return <Modal title={CONFIG_LABELS[row.configKey]} busy={save.isPending} onClose={onClose}>
    <form ref={form} noValidate aria-busy={save.isPending} onSubmit={(event) => {
      event.preventDefault(); const next = validate(); setErrors(next);
      const first = (['configValue', 'description'] as const).find((field) => next[field]);
      if (first) { (form.current?.elements.namedItem(first) as HTMLElement | null)?.focus(); return; }
      save.mutate();
    }}><fieldset disabled={save.isPending} style={{ border: 0, margin: 0, padding: 0 }}><div className="adm-dialog-body">
      {topicId && <label><span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Dùng cấu hình riêng cho chủ đề</span></label>}
      <FormField id={valueId} label={`Giá trị ${boolean ? '(bật / tắt tính năng)' : ''}`.trim()}
        help={boolean ? 'Chọn Bật hoặc Tắt cho tính năng này.' : `Số nguyên từ ${row.configKey === 'max_attempt_per_word' ? '1' : '0'} đến 2.147.483.647.`} error={errorFor('configValue')}>
        {boolean ? <select id={valueId} name="configValue" required value={value} aria-invalid={!!errorFor('configValue')} aria-describedby={fieldDescription(valueId, !!errorFor('configValue'))}
          onChange={(event) => { setValue(event.target.value); setErrors((current) => ({ ...current, configValue: undefined })); save.reset(); }}>
          <option value="" disabled>Chọn giá trị</option><option value="true">Bật</option><option value="false">Tắt</option>
        </select> : <input id={valueId} name="configValue" required type="text" inputMode="numeric" value={value} aria-invalid={!!errorFor('configValue')} aria-describedby={fieldDescription(valueId, !!errorFor('configValue'))}
          onChange={(event) => { setValue(event.target.value); setErrors((current) => ({ ...current, configValue: undefined })); save.reset(); }} />}
      </FormField>
      <FormField id={descriptionId} label="Mô tả thay đổi *" help="Ghi ngắn gọn mục đích điều chỉnh để dễ đối chiếu lịch sử." error={errorFor('description')}>
        <textarea id={descriptionId} name="description" required value={description} placeholder="Vì sao cần thay đổi thiết lập này?" aria-invalid={!!errorFor('description')} aria-describedby={fieldDescription(descriptionId, !!errorFor('description'))}
          onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: undefined })); save.reset(); }} />
      </FormField>
      {topicId && !active && <p className="adm-notice"><Info size={20} aria-hidden="true" /><span>Override được lưu nhưng ngừng áp dụng. Chủ đề sẽ dùng cấu hình Global; giá trị override vẫn phải hợp lệ.</span></p>}
      <p className="adm-form-note"><Info size={16} aria-hidden="true" /><span>Chỉ áp dụng cho phiên game tạo mới. Phiên đang chơi giữ cấu hình đã lưu.</span></p><ErrorNotice error={save.error} />
    </div><div className="adm-dialog-actions"><button type="button" onClick={onClose}>Hủy</button><button type="submit" className="adm-primary" aria-busy={save.isPending}>
      <span className="adm-button-content"><span className="adm-button-label"><Save size={16} aria-hidden="true" />Lưu cấu hình</span>{save.isPending && <Loader2 className="adm-button-spinner" size={18} aria-hidden="true" />}</span>
    </button></div></fieldset></form>
  </Modal>;
}
export function ConfigPage() {
  const params = useParams(); const topicId = params.topicId ? Number(params.topicId) : undefined;
  if (topicId !== undefined && (!Number.isSafeInteger(topicId) || topicId <= 0)) return <ErrorNotice error={new Error('ID chủ đề không hợp lệ.')} />;
  return <ConfigContent key={topicId ?? 'global'} topicId={topicId} />;
}
function ConfigContent({ topicId }: { topicId?: number }) {
  const client = useQueryClient(); const navigate = useNavigate();
  const query = useQuery({ queryKey: adminKeys.config(topicId), queryFn: ({ signal }) => adminApi.configs(topicId, signal), staleTime: 0 });
  const topics = useQuery({ queryKey: adminKeys.topics, queryFn: ({ signal }) => adminApi.topics(signal) });
  const [editor, setEditor] = useState<AdminConfig | null>(null);
  const [reset, setReset] = useState<{ key?: ConfigKey } | null>(null);
  const invalidate = async () => { await Promise.all([client.invalidateQueries({ queryKey: adminKeys.configs }), client.invalidateQueries({ queryKey: adminKeys.audits }), client.invalidateQueries({ queryKey: ['game-configs'] })]); };
  const mutation = useMutation({ mutationFn: () => adminApi.resetConfig(topicId!, reset?.key), onSuccess: async () => { await invalidate(); setReset(null); } });
  const rows = (query.data ?? []).filter((row) => row.configKey in CONFIG_LABELS);
  return <>
    <div className="adm-heading"><div><span className="adm-eyebrow">THIẾT LẬP TRẢI NGHIỆM</span><h1 className="adm-heading-icon"><SlidersHorizontal size={28} aria-hidden="true" />{topicId ? 'Cấu hình theo chủ đề' : 'Cấu hình game mặc định'}</h1><p>{topicId ? 'So sánh giá trị mặc định, override và cấu hình thực tế.' : 'Bốn thiết lập chung được áp dụng khi tạo phiên game.'}</p></div><button type="button" disabled={query.isFetching} aria-busy={query.isFetching} onClick={() => void query.refetch()}>
      <span className="adm-button-content"><span className="adm-button-label"><RefreshCw size={16} aria-hidden="true" />Tải lại</span>{query.isFetching && <Loader2 className="adm-button-spinner" size={18} aria-hidden="true" />}</span>
    </button></div>
    <div className="adm-toolbar"><label className="adm-filter-field">Phạm vi cấu hình<select aria-label="Phạm vi cấu hình" value={topicId ?? ''} onChange={(event) => navigate(event.target.value ? `/admin/topics/${event.target.value}/game-configs` : '/admin/game-configs/global')}><option value="">Global · Tất cả chủ đề</option>{topicId && !topics.data?.some((topic) => topic.id === topicId) && <option value={topicId}>Chủ đề #{topicId}</option>}{topics.data?.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
      <div className="adm-toolbar-actions">{topicId && <button type="button" className="adm-danger" disabled={!rows.some((row) => row.overrideActive !== null)} onClick={() => { mutation.reset(); setReset({}); }}><RotateCcw size={16} aria-hidden="true" />Reset tất cả override</button>}<Link className="adm-link" to="/admin/game-configs/audits"><History size={16} aria-hidden="true" />Xem lịch sử thay đổi<ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div>
    <div className="adm-notice"><Info size={20} aria-hidden="true" /><p>Thay đổi chỉ áp dụng cho phiên mới. Tắt “Dùng cấu hình riêng” sẽ kế thừa Global, không phải tắt tính năng.</p></div>
    <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    {query.data && rows.length !== 4 && <ErrorNotice error={new Error('Backend chưa trả đủ bốn cấu hình hỗ trợ. Cần kiểm tra dữ liệu Global.')} />}
    <div className="adm-panel">{query.isPending ? <Loading /> : !rows.length ? <Empty title="Chưa có cấu hình" action={<button type="button" onClick={() => void query.refetch()}><RefreshCw size={16} aria-hidden="true" />Tải lại cấu hình</button>}>Kiểm tra dữ liệu cấu hình Global hoặc thử tải lại danh sách.</Empty> : <div className="adm-table-wrap"><table className="adm-table adm-responsive-table"><caption className="adm-sr-only">Thiết lập cấu hình game {topicId ? `của chủ đề ${topicId}` : 'mặc định'}</caption><thead><tr><th scope="col">THIẾT LẬP</th><th scope="col">GLOBAL</th>{topicId && <th scope="col">OVERRIDE</th>}<th scope="col">ĐANG ÁP DỤNG</th><th scope="col">THAO TÁC</th></tr></thead><tbody>{rows.map((row) => <tr key={row.configKey}>
      <td data-label="Thiết lập"><strong>{CONFIG_LABELS[row.configKey]}</strong><small>{row.configKey}</small><small>{topicId ? row.overrideDescription ?? row.globalDescription : row.globalDescription}</small></td>
      <td data-label="Global">{row.globalValue ?? '—'}</td>{topicId && <td data-label="Override">{row.overrideValue ?? '—'}<small>{row.overrideActive === null ? 'Chưa có override' : row.overrideActive ? 'Đang áp dụng' : 'Đang tạm tắt'}</small></td>}
      <td data-label="Áp dụng"><span className="adm-config-value">{row.effectiveValue ?? 'Không có'}</span><small>{row.source}</small></td>
      <td data-label="Thao tác"><div className="adm-actions"><button type="button" onClick={() => setEditor(row)}><Pencil size={15} aria-hidden="true" />Sửa</button>{topicId && <button type="button" disabled={row.overrideActive === null} onClick={() => { mutation.reset(); setReset({ key: row.configKey }); }}><RotateCcw size={15} aria-hidden="true" />Reset</button>}</div></td>
    </tr>)}</tbody></table></div>}</div>
    {editor && <ConfigForm row={editor} topicId={topicId} onSaved={invalidate} onClose={() => setEditor(null)} />}
    {reset && <ConfirmDialog title="Reset cấu hình chủ đề" busy={mutation.isPending} error={mutation.error} onClose={() => setReset(null)} onConfirm={() => mutation.mutate()}><p>Xóa {reset.key ? `override ${reset.key}` : 'toàn bộ override của bốn thiết lập'} cho chủ đề #{topicId} và dùng lại cấu hình Global?</p><p className="adm-muted">Không xóa chủ đề hoặc thay đổi cấu hình Global.</p></ConfirmDialog>}
  </>;
}
