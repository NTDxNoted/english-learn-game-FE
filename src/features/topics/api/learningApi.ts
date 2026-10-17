import { http } from '../../../lib/apiClient';
import type { ApiResponse } from '../../../types/api.types';
import type {
  LearningProgressRequest,
  LearningProgressResponse,
  LearningResponse,
} from '../types/learning.types';

export const learningApi = {
  /**
   * [LEARN-01] Mở màn hình học từ vựng theo chủ đề
   * GET /api/topics/:topicId/learning
   */
  getTopicLearning: (
    topicId: number,
    signal?: AbortSignal,
  ): Promise<ApiResponse<LearningResponse>> =>
    http.get<LearningResponse>(`/topics/${topicId}/learning`, undefined, { signal }),

  /**
   * [LEARN-02] Lưu tiến độ từ vựng xa nhất đã học trong chủ đề (tuần tự từng từ)
   * PUT /api/topics/:topicId/learning/progress
   */
  saveLearningProgress: (
    topicId: number,
    data: LearningProgressRequest,
  ): Promise<ApiResponse<LearningProgressResponse>> =>
    http.put<LearningProgressResponse>(`/topics/${topicId}/learning/progress`, data),

  /**
   * [LEARN-03] Làm mới presigned audioUrl của một từ vựng khi URL hết hạn
   */
  refreshVocabularyAudioUrl: async (
    topicId: number,
    vocabId: number,
  ): Promise<string | null> => {
    const res = await http.get<LearningResponse>(`/topics/${topicId}/learning`);
    return res.data.vocabularies.find((item) => item.id === vocabId)?.audioUrl ?? null;
  },
};

