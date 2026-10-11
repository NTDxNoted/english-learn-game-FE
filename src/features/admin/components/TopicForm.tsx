import { useEffect, useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Info, Loader2, Save } from 'lucide-react';
import type { AdminTopic } from '../types/admin.types';
import { adminApi } from '../api/adminApi';
import { topicFormData } from '../lib/adminForms';
import { ApiError } from '../../../types/api.types';
import { Modal, ErrorNotice } from './AdminUI';
import { FormField } from './FormField';
import { fieldDescription } from './fieldDescription';

type Field = 'name' | 'description' | 'image';
type FieldErrors = Partial<Record<Field, string>>;
const imageError = (file: File | null, required: boolean) => {
  if (!file) return required ? 'Chọn một ảnh đại diện cho chủ đề.' : undefined;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chỉ dùng ảnh JPEG, PNG hoặc WebP.';
  if (file.size > 2 * 1024 * 1024) return 'Ảnh vượt 2 MiB. Hãy chọn ảnh nhỏ hơn.';
  return undefined;
};

export function TopicForm({ topic, onClose, onSaved }: { topic?: AdminTopic; onClose: () => void; onSaved: () => Promise<void> }) {
  const formId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(topic?.name ?? '');
  const [description, setDescription] = useState(topic?.description ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(topic?.imageUrl ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const objectUrl = useRef<string | null>(null);
  const chooseImage = (file: File | null) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const invalid = imageError(file, !topic);
    objectUrl.current = file && !invalid ? URL.createObjectURL(file) : null;
    setImage(file);
    setPreview(objectUrl.current ?? topic?.imageUrl ?? '');
    setErrors((current) => ({ ...current, image: invalid }));
    save.reset();
  };
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  const save = useMutation({ mutationFn: async () => adminApi.saveTopic(topicFormData(name, description, image, topic), topic?.id),
    onSuccess: async () => { await onSaved(); onClose(); } });
  const changed = !topic || name.trim() !== topic.name || description.trim() !== (topic.description ?? '') || !!image;
  const validate = (): FieldErrors => ({
    name: !name.trim() ? 'Nhập tên chủ đề trước khi lưu.' : name.trim().length > 100 ? 'Tên chủ đề tối đa 100 ký tự.' : undefined,
    description: description.trim().length > 1000 ? 'Mô tả tối đa 1000 ký tự.' : topic?.description && !description.trim()
      ? 'Hiện chưa thể xóa mô tả. Giữ nội dung cũ hoặc nhập mô tả mới.' : undefined,
    image: imageError(image, !topic),
  });
  const errorFor = (field: Field) => errors[field] ?? (save.error instanceof ApiError ? save.error.errors.find((error) => error.field === field)?.message : undefined);
  const nameId = `${formId}-name`; const descriptionId = `${formId}-description`; const imageId = `${formId}-image`;
  return <Modal title={topic ? 'Sửa chủ đề' : 'Thêm chủ đề mới'} onClose={onClose} busy={save.isPending}>
    <form ref={form} noValidate aria-busy={save.isPending} onSubmit={(event) => {
      event.preventDefault();
      const next = validate(); setErrors(next);
      const first = (['name', 'description', 'image'] as const).find((field) => next[field]);
      if (first) { (form.current?.elements.namedItem(first) as HTMLElement | null)?.focus(); return; }
      save.mutate();
    }}>
      <fieldset disabled={save.isPending} style={{ border: 0, margin: 0, padding: 0 }}><div className="adm-dialog-body">
        <FormField id={nameId} label="Tên chủ đề *" help="Tên dễ nhận biết, tối đa 100 ký tự." error={errorFor('name')}>
          <input id={nameId} name="name" autoFocus required maxLength={100} placeholder="Ví dụ: Food & drinks" value={name}
            aria-invalid={!!errorFor('name')} aria-describedby={fieldDescription(nameId, !!errorFor('name'))}
            onBlur={() => setErrors((current) => ({ ...current, name: validate().name }))}
            onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); save.reset(); }} />
        </FormField>
        <FormField id={descriptionId} label="Mô tả" help="Giới thiệu ngắn nội dung học của chủ đề. Tối đa 1000 ký tự." error={errorFor('description')}>
          <textarea id={descriptionId} name="description" maxLength={1000} value={description} placeholder="Người học sẽ khám phá những gì trong chủ đề này?"
            aria-invalid={!!errorFor('description')} aria-describedby={fieldDescription(descriptionId, !!errorFor('description'))}
            onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: undefined })); save.reset(); }} />
        </FormField>
        <div className="adm-upload">
          <FormField id={imageId} label={`Ảnh ${topic ? '(chọn để thay)' : '*'}`} help="JPEG, PNG hoặc WebP · Tối đa 2 MiB. Chọn ảnh rõ, dễ nhận diện." error={errorFor('image')}>
            <input id={imageId} name="image" type="file" accept="image/jpeg,image/png,image/webp"
              aria-invalid={!!errorFor('image')} aria-describedby={fieldDescription(imageId, !!errorFor('image'))}
              onChange={(event) => chooseImage(event.target.files?.[0] ?? null)} />
          </FormField>
          <div className="adm-upload-preview">{preview ? <img className="adm-preview" src={preview} alt="Ảnh xem trước của chủ đề" /> : <><ImagePlus size={28} strokeWidth={1.75} aria-hidden="true" /><span>Ảnh xem trước sẽ hiển thị tại đây</span></>}</div>
        </div>
        <p className="adm-form-note"><Info size={16} aria-hidden="true" /><span>Thứ tự chủ đề được tự động tạo. Khi sửa, chỉ những nội dung thay đổi được gửi lên.</span></p>
        <ErrorNotice error={save.error} />
      </div><div className="adm-dialog-actions"><button type="button" onClick={onClose}>Hủy</button>
        <button type="submit" className="adm-primary" disabled={!changed} aria-busy={save.isPending}>
          <span className="adm-button-content"><span className="adm-button-label" style={{ visibility: save.isPending ? 'hidden' : undefined }}><Save size={16} aria-hidden="true" />Lưu chủ đề</span>
            {save.isPending && <span className="adm-button-spinner" role="status" aria-label="Đang lưu chủ đề"><Loader2 size={18} aria-hidden="true" /></span>}</span>
        </button>
      </div></fieldset>
    </form>
  </Modal>;
}
