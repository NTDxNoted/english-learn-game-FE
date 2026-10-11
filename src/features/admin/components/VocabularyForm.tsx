import { useId, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpenCheck, Info, Loader2, Save } from 'lucide-react';
import type { AdminVocabulary } from '../types/admin.types';
import { adminApi } from '../api/adminApi';
import { vocabularyInput, WORD_PATTERN } from '../lib/adminForms';
import { ApiError } from '../../../types/api.types';
import { ErrorNotice, Modal } from './AdminUI';
import { FormField } from './FormField';
import { fieldDescription } from './fieldDescription';

type Field = 'word' | 'meaningVi';
type FieldErrors = Partial<Record<Field, string>>;

export function VocabularyForm({ topicId, vocabulary, onClose, onSaved }: { topicId: number; vocabulary?: AdminVocabulary; onClose: () => void; onSaved: () => Promise<void> }) {
  const formId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [word, setWord] = useState(vocabulary?.word ?? '');
  const [meaning, setMeaning] = useState(vocabulary?.meaningVi ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const normalized = word.trim().toLowerCase();
  const ipa = useQuery({ queryKey: ['admin', 'ipa', normalized], queryFn: ({ signal }) => adminApi.ipa(normalized, signal), enabled: false, retry: false });
  const save = useMutation({ mutationFn: () => adminApi.saveVocabulary(topicId, vocabularyInput(word, meaning, vocabulary), vocabulary?.id),
    onSuccess: async () => { await onSaved(); onClose(); } });
  const changed = !vocabulary || normalized !== vocabulary.word || meaning.trim() !== vocabulary.meaningVi;
  const validate = (): FieldErrors => ({
    word: !normalized ? 'Nhập từ tiếng Anh trước khi lưu.' : !WORD_PATTERN.test(normalized) || normalized.length > 100
      ? "Dùng chữ cái tiếng Anh, tối đa 100 ký tự. Chỉ đặt dấu nối hoặc dấu nháy giữa các chữ." : undefined,
    meaningVi: !meaning.trim() ? 'Nhập nghĩa tiếng Việt cho từ này.' : meaning.trim().length > 255 ? 'Nghĩa tiếng Việt tối đa 255 ký tự.' : undefined,
  });
  const errorFor = (field: Field) => errors[field] ?? (save.error instanceof ApiError ? save.error.errors.find((error) => error.field === field)?.message : undefined);
  const wordId = `${formId}-word`; const meaningId = `${formId}-meaning`;
  const preview = ipa.data?.ipa ?? (normalized === vocabulary?.word ? vocabulary.ipa : '');
  return <Modal title={vocabulary ? 'Sửa từ vựng' : 'Thêm từ vựng'} busy={save.isPending} onClose={onClose}>
    <form ref={form} noValidate aria-busy={save.isPending} onSubmit={(event) => {
      event.preventDefault(); const next = validate(); setErrors(next);
      const first = (['word', 'meaningVi'] as const).find((field) => next[field]);
      if (first) { (form.current?.elements.namedItem(first) as HTMLElement | null)?.focus(); return; }
      save.mutate();
    }}><fieldset disabled={save.isPending} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="adm-dialog-body">
        <FormField id={wordId} label="Từ tiếng Anh *" help="Một từ, tối đa 100 ký tự. Có thể dùng dấu nối hoặc dấu nháy như mother-in-law, can't." error={errorFor('word')}>
          <input id={wordId} name="word" autoFocus required maxLength={100} value={word} placeholder="Ví dụ: sugar" spellCheck={false} autoCapitalize="none"
            aria-invalid={!!errorFor('word')} aria-describedby={fieldDescription(wordId, !!errorFor('word'))}
            onBlur={() => setErrors((current) => ({ ...current, word: validate().word }))}
            onChange={(event) => { setWord(event.target.value); setErrors((current) => ({ ...current, word: undefined })); save.reset(); }} />
        </FormField>
        <div className="adm-ipa">
          <button type="button" disabled={ipa.isFetching || !WORD_PATTERN.test(normalized) || normalized.length > 100} aria-busy={ipa.isFetching} onClick={() => void ipa.refetch()}>
            <span className="adm-button-content"><span className="adm-button-label" style={{ visibility: ipa.isFetching ? 'hidden' : undefined }}><BookOpenCheck size={16} aria-hidden="true" />Tra IPA</span>
              {ipa.isFetching && <span className="adm-button-spinner" role="status" aria-label="Đang tra phiên âm"><Loader2 size={18} aria-hidden="true" /></span>}</span>
          </button>
          <span className="adm-ipa-result" aria-live="polite">{preview || 'Phiên âm xem trước'}</span>
        </div>
        <ErrorNotice error={ipa.error} />
        <FormField id={meaningId} label="Nghĩa tiếng Việt *" help="Nghĩa ngắn gọn, rõ ràng · Tối đa 255 ký tự." error={errorFor('meaningVi')}>
          <textarea id={meaningId} name="meaningVi" required maxLength={255} value={meaning} placeholder="Ví dụ: Đường"
            aria-invalid={!!errorFor('meaningVi')} aria-describedby={fieldDescription(meaningId, !!errorFor('meaningVi'))}
            onChange={(event) => { setMeaning(event.target.value); setErrors((current) => ({ ...current, meaningVi: undefined })); save.reset(); }} />
        </FormField>
        <p className="adm-form-note"><Info size={16} aria-hidden="true" /><span>IPA và âm thanh được tự động tạo khi thêm hoặc đổi từ tiếng Anh. Tra IPA chỉ là xem trước. Quá trình lưu có thể cần thời gian.</span></p>
        <ErrorNotice error={save.error} />
        {save.isError && <button type="button" onClick={() => void onSaved()}>Tải lại danh sách để kiểm tra kết quả</button>}
      </div><div className="adm-dialog-actions"><button type="button" onClick={onClose}>Hủy</button>
        <button type="submit" className="adm-primary" disabled={!changed} aria-busy={save.isPending}>
          <span className="adm-button-content"><span className="adm-button-label" style={{ visibility: save.isPending ? 'hidden' : undefined }}><Save size={16} aria-hidden="true" />Lưu từ vựng</span>
            {save.isPending && <span className="adm-button-spinner" role="status" aria-label="Đang lưu từ vựng"><Loader2 size={18} aria-hidden="true" /></span>}</span>
        </button>
      </div>
    </fieldset></form>
  </Modal>;
}
