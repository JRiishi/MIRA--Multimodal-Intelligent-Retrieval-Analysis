import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import type { SearchResponse } from '../types';

export interface SearchRequestParams {
  query: string;
  project_id?: string | null;
  activity?: string | null;
  location?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  use_cloudinary_hybrid?: boolean;
  cloudinary_tag?: string | null;
  cloudinary_expression?: string | null;
  top_k?: number;
  min_score?: number;
}

export function useSearch() {
  return useMutation({
    mutationFn: async (params: string | SearchRequestParams) => {
      const payload = typeof params === 'string' 
        ? { query: params, top_k: 12, min_score: 0.35, use_cloudinary_hybrid: false } 
        : { 
            ...params, 
            top_k: params.top_k || 12, 
            min_score: params.min_score ?? 0.35,
            use_cloudinary_hybrid: params.use_cloudinary_hybrid ?? false
          };
      const { data } = await api.post<SearchResponse>('/search/', payload);
      return data;
    },
  });
}


