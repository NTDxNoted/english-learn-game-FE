import { useQuery } from '@tanstack/react-query';
import { topicApi } from '../api/topicApi';
import type { TopicItem } from '../types/topic.types';

export const FALLBACK_TOPICS: TopicItem[] = [
  { id: 1, name: 'Food', description: 'Đồ ăn & Thức uống', iconUrl: null, orderNo: 1, totalWords: 20, completedWords: 8 },
  { id: 2, name: 'Travel', description: 'Du lịch & Khám phá', iconUrl: null, orderNo: 2, totalWords: 15, completedWords: 5 },
  { id: 3, name: 'Technology', description: 'Công nghệ thông tin', iconUrl: null, orderNo: 3, totalWords: 25, completedWords: 12 },
  { id: 4, name: 'Family', description: 'Gia đình & Người thân', iconUrl: null, orderNo: 4, totalWords: 18, completedWords: 10 },
  { id: 5, name: 'Animal', description: 'Thế giới động vật', iconUrl: null, orderNo: 5, totalWords: 22, completedWords: 4 },
  { id: 6, name: 'Nature', description: 'Thiên nhiên & Môi trường', iconUrl: null, orderNo: 6, totalWords: 16, completedWords: 0 },
  { id: 7, name: 'Sport', description: 'Thể thao & Sức khỏe', iconUrl: null, orderNo: 7, totalWords: 14, completedWords: 6 },
  { id: 8, name: 'School', description: 'Trường học & Giáo dục', iconUrl: null, orderNo: 8, totalWords: 20, completedWords: 2 },
  { id: 9, name: 'Work', description: 'Công việc & Văn phòng', iconUrl: null, orderNo: 9, totalWords: 24, completedWords: 7 },
  { id: 10, name: 'Daily Life', description: 'Đời sống hàng ngày', iconUrl: null, orderNo: 10, totalWords: 30, completedWords: 15 },
];

export const useTopics = () => {
  return useQuery<TopicItem[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      try {
        const res = await topicApi.getTopics();
        if (res.data && res.data.length > 0) {
          return res.data;
        }
        return FALLBACK_TOPICS;
      } catch {
        return FALLBACK_TOPICS;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 phút
  });
};
