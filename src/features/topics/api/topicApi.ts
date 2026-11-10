import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type { TopicItem } from '../types/topic.types';

export const topicApi = {
  /**
   * [TOPIC-01] Lấy danh sách toàn bộ chủ đề
   * GET /api/topics
   */
  getTopics: (signal?: AbortSignal): Promise<ApiResponse<TopicItem[]>> =>
    http.get<TopicItem[]>('/topics', undefined, { signal }),

  /**
   * Lấy chi tiết một chủ đề theo id
   * GET /api/topics/:id
   */
  getTopicById: (id: number): Promise<ApiResponse<TopicItem>> =>
    http.get<TopicItem>(`/topics/${id}`),
};
