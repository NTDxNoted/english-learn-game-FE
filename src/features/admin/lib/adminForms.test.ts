import { describe, expect, it } from 'vitest';
import { topicFormData, vocabularyInput, validateConfig, compactFilters } from './adminForms';
import { auditFilters } from './auditFilters';
import type { AdminTopic, AdminVocabulary } from '../types/admin.types';
const topic: AdminTopic = { id: 1, name: 'Food', description: 'Food words', imageUrl: null, iconUrl: null, orderNo: 1, isActive: true };
const vocabulary: AdminVocabulary = { id: 7, topicId: 1, topicName: 'Food', word: 'sugar', meaningVi: 'Đường', active: true, orderNo: 1, ipa: null, audioUrl: null };
describe('topic multipart', () => {
  it('requires an image for creation', () => expect(() => topicFormData('Food', '', null)).toThrow('chọn ảnh'));
  it('sends only a changed field', () => {
    const form = topicFormData('New name', topic.description!, null, topic);
    expect([...form.keys()]).toEqual(['name']);
  });
  it('rejects silent clearing of description', () => expect(() => topicFormData('Food', '', null, topic)).toThrow('chưa hỗ trợ xóa'));
  it('rejects files larger than 2 MiB', () => expect(() => topicFormData('New', '', new File([new Uint8Array(2097153)], 'x.png', { type: 'image/png' }))).toThrow('2 MiB'));
  it('rejects unexpected image formats', () => expect(() => topicFormData('New', '', new File(['x'], 'x.svg', { type: 'image/svg+xml' }))).toThrow('JPEG'));
});
describe('vocabulary requests', () => {
  it('updates meaning without recreating audio', () => expect(vocabularyInput(' SUGAR ', 'Đường trắng', vocabulary)).toEqual({ meaningVi: 'Đường trắng' }));
  it.each(['two words', 'word1', '-word', 'đường', "word''x"])('rejects invalid English word %s', (word) => expect(() => vocabularyInput(word, 'Nghĩa')).toThrow());
  it.each(["mother-in-law", "can't"])('accepts %s', (word) => expect(vocabularyInput(word, 'Nghĩa').word).toBe(word));
  it('does not send unchanged PUT', () => expect(() => vocabularyInput('sugar', 'Đường', vocabulary)).toThrow('Chưa có thay đổi'));
});
describe('config serialization', () => {
  it.each(['0', '-1', '1.2', '2147483648'])('rejects invalid attempts %s', (value) => expect(() => validateConfig('max_attempt_per_word', value, 'Reason')).toThrow());
  it('accepts zero checkpoint points', () => expect(() => validateConfig('checkpoint_pass_points', '0', 'Reason')).not.toThrow());
  it('requires a description', () => expect(() => validateConfig('score_enabled', 'false', '')).toThrow());
  it('accepts string false as a real value', () => expect(() => validateConfig('score_enabled', 'false', 'Reason')).not.toThrow());
});
describe('filters', () => {
  it('omits empty values while keeping page zero', () => expect(compactFilters({ page: 0, size: 20, status: '', role: undefined })).toEqual({ page: 0, size: 20 }));
  it('drops Topic ID from Global audit scope', () => expect(auditFilters({ scope: 'GLOBAL', topicId: '3' })).toEqual({ scope: 'GLOBAL' }));
  it('converts a Vietnam date selection to Instant', () => expect(auditFilters({ changedFrom: '2026-11-03T00:00' }).changedFrom).toBe('2026-11-02T17:00:00.000Z'));
  it('rejects reversed dates', () => expect(() => auditFilters({ changedFrom: '2026-11-04T00:00', changedTo: '2026-11-03T00:00' })).toThrow());
  it('rejects malformed operation IDs', () => expect(() => auditFilters({ operationId: 'bad' })).toThrow('UUID'));
});
