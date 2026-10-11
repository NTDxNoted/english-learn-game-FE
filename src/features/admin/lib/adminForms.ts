import type { AdminTopic, AdminVocabulary, ConfigKey } from '../types/admin.types';
export const WORD_PATTERN = /^[a-z]+(?:[-'][a-z]+)*$/;
export const CONFIG_LABELS: Record<ConfigKey, string> = {
  max_attempt_per_word: 'Lượt thử tối đa mỗi từ', checkpoint_pass_points: 'Điểm thưởng thắng checkpoint',
  score_enabled: 'Tính điểm', streak_enabled: 'Chuỗi ngày học',
};
export function topicFormData(name: string, description: string, image: File | null, existing?: AdminTopic): FormData {
  const form = new FormData();
  name = name.trim(); description = description.trim();
  if (!name || name.length > 100) throw new Error('Tên chủ đề cần từ 1 đến 100 ký tự.');
  if (description.length > 1000) throw new Error('Mô tả tối đa 1000 ký tự.');
  if (!existing || name !== existing.name) form.append('name', name);
  if (description !== (existing?.description ?? '')) {
    if (existing && !description) throw new Error('Backend hiện chưa hỗ trợ xóa mô tả. Hãy giữ mô tả cũ hoặc nhập nội dung mới.');
    if (description) form.append('description', description);
  }
  if (!existing && !image) throw new Error('Vui lòng chọn ảnh chủ đề.');
  if (image) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new Error('Chỉ nhận ảnh JPEG, PNG hoặc WebP.');
    if (image.size > 2 * 1024 * 1024) throw new Error('Ảnh phải nhỏ hơn hoặc bằng 2 MiB.');
    form.append('image', image);
  }
  if ([...form.keys()].length === 0) throw new Error('Chưa có thay đổi để lưu.');
  return form;
}
export function vocabularyInput(word: string, meaningVi: string, existing?: AdminVocabulary) {
  word = word.trim().toLowerCase(); meaningVi = meaningVi.trim();
  if (!WORD_PATTERN.test(word) || word.length > 100) throw new Error('Từ tiếng Anh tối đa 100 ký tự, chỉ gồm chữ cái và dấu nối/nháy ở giữa.');
  if (!meaningVi || meaningVi.length > 255) throw new Error('Nghĩa tiếng Việt cần từ 1 đến 255 ký tự.');
  const input: { word?: string; meaningVi?: string } = {};
  if (!existing || word !== existing.word) input.word = word;
  if (!existing || meaningVi !== existing.meaningVi) input.meaningVi = meaningVi;
  if (!Object.keys(input).length) throw new Error('Chưa có thay đổi để lưu.');
  return input;
}
export function validateConfig(key: ConfigKey, value: string, description: string) {
  if (!description.trim()) throw new Error('Vui lòng nhập mô tả thay đổi.');
  if (key === 'score_enabled' || key === 'streak_enabled') {
    if (value !== 'true' && value !== 'false') throw new Error('Giá trị cần là true hoặc false.');
  } else {
    const minimum = key === 'max_attempt_per_word' ? 1 : 0;
    if (!/^\d+$/.test(value) || Number(value) < minimum || Number(value) > 2147483647) throw new Error(`Giá trị phải là số nguyên từ ${minimum} đến 2147483647.`);
  }
}
export function compactFilters(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== '' && value !== undefined && value !== null));
}
export function localUserDate(value?: string) {
  return value ? value.replace('T', ' ').replace(/\.\d+$/, '') : '—';
}
