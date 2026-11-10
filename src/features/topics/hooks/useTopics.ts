import { useQuery } from '@tanstack/react-query';
import { topicApi } from '../api/topicApi';

export const useTopics = () => useQuery({
  queryKey: ['topics'],
  queryFn: async ({ signal }) => (await topicApi.getTopics(signal)).data,
  staleTime: 5 * 60 * 1000,
  retry: false,
});
