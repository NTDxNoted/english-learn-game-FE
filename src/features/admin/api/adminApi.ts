import { http } from '../../../lib/apiClient';
import type { AdminTopic, AdminVocabulary, AdminUser, AdminPage, AdminConfig, ConfigKey, ConfigInput, AudioBackfill, AuditItem, AuditDetail } from '../types/admin.types';

export const adminKeys = {
  all: ['admin'] as const,
  topics: ['admin', 'topics'] as const,
  vocabularies: (topicId: number) => ['admin', 'vocabularies', topicId] as const,
  configs: ['admin', 'configs'] as const,
  config: (topicId?: number) => ['admin', 'configs', topicId ?? 'global'] as const,
  users: ['admin', 'users'] as const,
  audits: ['admin', 'audits'] as const,
};
const configsPath = (topicId?: number) => topicId === undefined ? '/admin/game-configs/global' : `/admin/game-configs/topics/${topicId}`;
const vocabPath = (topicId: number) => `/admin/topics/${topicId}/vocabularies`;
export const adminApi = {
  topics: async (signal?: AbortSignal) => (await http.get<AdminTopic[]>('/admin/topics', undefined, { signal })).data,
  saveTopic: async (form: FormData, id?: number) => id === undefined
    ? (await http.post<AdminTopic>('/admin/topics', form)).data
    : (await http.put<AdminTopic>(`/admin/topics/${id}`, form)).data,
  hideTopic: async (id: number) => { await http.delete(`/admin/topics/${id}`); },
  restoreTopic: async (id: number) => (await http.patch<AdminTopic>(`/admin/topics/${id}/restore`)).data,
  vocabularies: async (topicId: number, signal?: AbortSignal) => (await http.get<AdminVocabulary[]>(vocabPath(topicId), undefined, { signal })).data,
  saveVocabulary: async (topicId: number, body: { word?: string; meaningVi?: string }, id?: number) => id === undefined
    ? (await http.post<AdminVocabulary>(vocabPath(topicId), body, { timeout: 60000 })).data
    : (await http.put<AdminVocabulary>(`${vocabPath(topicId)}/${id}`, body, { timeout: 60000 })).data,
  hideVocabulary: async (topicId: number, id: number) => { await http.delete(`${vocabPath(topicId)}/${id}`); },
  ipa: async (word: string, signal?: AbortSignal) => (await http.get<{ word: string; ipa: string }>('/admin/vocabularies/ipa', { word }, { signal })).data,
  backfill: async (topicId: number) => (await http.post<AudioBackfill>(`${vocabPath(topicId)}/generate-missing-audio`, undefined, { timeout: 180000 })).data,
  configs: async (topicId?: number, signal?: AbortSignal) => (await http.get<AdminConfig[]>(configsPath(topicId), undefined, { signal })).data,
  saveConfig: async (key: ConfigKey, input: ConfigInput, topicId?: number) => (await http.put<AdminConfig>(`${configsPath(topicId)}/${key}`, input)).data,
  resetConfig: async (topicId: number, key?: ConfigKey) => { await http.delete(`${configsPath(topicId)}${key ? '/' + key : ''}`); },
  users: async (filters: Record<string, unknown>, signal?: AbortSignal) => (await http.get<AdminPage<AdminUser>>('/admin/users', filters, { signal })).data,
  userStatus: async (id: number, status: AdminUser['status']) => (await http.patch<AdminUser>(`/admin/users/${id}/status`, { status }, { timeout: 30000 })).data,
  audits: async (filters: Record<string, unknown>, signal?: AbortSignal) => (await http.get<AdminPage<AuditItem>>('/admin/game-configs/audits', filters, { signal })).data,
  audit: async (id: number, signal?: AbortSignal) => (await http.get<AuditDetail>(`/admin/game-configs/audits/${id}`, undefined, { signal })).data,
};
