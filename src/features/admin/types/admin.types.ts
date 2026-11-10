export interface AdminTopic {
  id: number; name: string; description: string | null; iconUrl: string | null;
  imageUrl: string | null; orderNo: number | null; isActive: boolean;
}
export interface AdminVocabulary {
  id: number; topicId: number; topicName: string; word: string; meaningVi: string;
  ipa: string | null; audioUrl: string | null; active: boolean; orderNo: number;
}
export interface AdminPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; }
export interface AdminUser { id: number; email: string; displayName: string | null; role: 'admin' | 'learner'; status: 'ACTIVE' | 'BLOCKED'; createdAt?: string; updatedAt?: string; }
export type ConfigKey = 'max_attempt_per_word' | 'checkpoint_pass_points' | 'score_enabled' | 'streak_enabled';
export interface AdminConfig {
  topicId: number | null; configKey: ConfigKey; globalValue: string | null; globalActive: boolean;
  overrideValue: string | null; overrideActive: boolean | null; effectiveValue: string | null;
  source: 'GLOBAL' | 'TOPIC' | 'GLOBAL_INACTIVE'; globalDescription: string | null; overrideDescription: string | null;
}
export interface ConfigInput { configValue: string; description: string; active?: boolean; }
export interface AudioBackfill { topicId: number; totalMissing: number; generated: number; failed: number; failedVocabularyIds: number[]; }
export interface AuditItem {
  id: number; operationId: string; actorUserId: number | null; scope: 'GLOBAL' | 'TOPIC';
  topicId: number | null; configKey: string; action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValue: string | null; newValue: string | null; changedAt: string;
}
export interface AuditDetail extends Omit<AuditItem, 'oldValue' | 'newValue'> {
  beforeData: Record<string, unknown> | null; afterData: Record<string, unknown> | null;
}
