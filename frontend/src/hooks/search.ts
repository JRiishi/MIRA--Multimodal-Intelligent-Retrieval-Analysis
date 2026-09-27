import { useMutation } from '@tanstack/react-query';
import api from '../services/api';

export interface SearchResult {
  asset_id: string;
  project_id: string;
  description: string;
  activity: string;
  timestamp: string;
  cloudinary_url: string;
  score: number;
}

export function useSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const { data } = await api.post<SearchResult[]>('/search/', { query, limit: 10 });
      return data;
    },
  });
}
