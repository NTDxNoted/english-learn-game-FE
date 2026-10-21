import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type { TopicItem } from '../types/topic.types';

export const topicApi = {
  /**
   * [TOPIC-01] Lấy danh sách toàn bộ chủ đề
   * GET /api/v1/topics
   */
  getTopics: (): Promise<ApiResponse<TopicItem[]>> =>
    http.get<TopicItem[]>('/topics'),

  /**
   * Lấy chi tiết một chủ đề theo id
   * GET /api/v1/topics/:id
   */
  getTopicById: (id: number): Promise<ApiResponse<TopicItem>> =>
    http.get<TopicItem>(`/topics/${id}`),
};
