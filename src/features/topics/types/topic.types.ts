/**
 * [TOPIC-01] Types cho Chủ đề học từ vựng
 */

export interface TopicItem {
  id: number;
  name: string;
  description: string;
  iconUrl?: string | null;
  orderNo?: number;
  imageUrl?: string | null;
  // Counts are available only when joined with the user's progress response.
  totalWords?: number;
  completedWords?: number;
  isActive?: boolean;
}
