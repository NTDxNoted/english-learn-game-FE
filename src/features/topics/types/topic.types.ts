/**
 * [TOPIC-01] Types cho Chủ đề học từ vựng
 */

export interface TopicItem {
  id: number;
  name: string;
  description: string;
  iconUrl?: string | null;
  orderNo?: number;
  totalWords: number;
  completedWords: number;
  isActive?: boolean;
}
