import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type { 
  ChatMessageResponse, 
  ChatHistoryItem, 
  ProjectTimelineItem, 
  ProjectReportResponse,
  ChangeAnalysisResult
} from '../types';

export function useProjectChat(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!projectId) throw new Error('Project ID required');
      const { data } = await api.post<ChatMessageResponse>(`/projects/${projectId}/chat`, { message });
      return data;
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project_chat_history', projectId] });
      }
    }
  });
}

export function useProjectChatHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_chat_history', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await api.get<ChatHistoryItem[]>(`/projects/${projectId}/chat/history`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useClearProjectChat(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const { data } = await api.delete(`/projects/${projectId}/chat/history`);
      return data;
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.setQueryData(['project_chat_history', projectId], []);
      }
    }
  });
}

export function useProjectTimeline(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_timeline', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await api.get<ProjectTimelineItem[]>(`/projects/${projectId}/timeline`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useGenerateProjectReport(projectId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const { data } = await api.post<ProjectReportResponse>(`/projects/${projectId}/report`);
      return data;
    }
  });
}

export function useProjectChangeAnalysis(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (params?: { before_asset_id?: string; after_asset_id?: string }) => {
      if (!projectId) throw new Error('Project ID required');
      const { data } = await api.post<ChangeAnalysisResult>(`/projects/${projectId}/change`, params || {});
      return data;
    }
  });
}
