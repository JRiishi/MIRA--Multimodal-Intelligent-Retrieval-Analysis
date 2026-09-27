import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { TERMINAL_STATUSES, type MediaAsset, type MediaDetail } from '../types';

export function useMediaLibrary() {
  return useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const { data } = await api.get<MediaAsset[]>('/media/');
      return data;
    },
    // Poll every 3 seconds if there are items that are not READY/FAILED
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.some(
        asset => !TERMINAL_STATUSES.includes(asset.processing_status)
      );
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useMediaDetail(assetId: string) {
  return useQuery({
    queryKey: ['media', assetId],
    queryFn: async () => {
      const { data } = await api.get<MediaDetail>(`/media/${assetId}`);
      return data;
    },
    enabled: !!assetId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isProcessing = !TERMINAL_STATUSES.includes(data.processing_status);
      return isProcessing ? 3000 : false;
    },
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: File | { file: File; latitude?: number | null; longitude?: number | null }) => {
      const formData = new FormData();
      if (input instanceof File) {
        formData.append('file', input);
      } else {
        formData.append('file', input.file);
        if (input.latitude != null && !isNaN(input.latitude)) {
          formData.append('latitude', input.latitude.toString());
        }
        if (input.longitude != null && !isNaN(input.longitude)) {
          formData.append('longitude', input.longitude.toString());
        }
      }
      
      const { data } = await api.post<{asset_id: string, status: string}>('/media/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      await api.delete(`/media/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useAssignMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, projectId }: { assetId: string; projectId: string }) => {
      const { data } = await api.post(`/media/${assetId}/assign`, { project_id: projectId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAssetTransformations(assetId: string | null) {
  return useQuery({
    queryKey: ['media', assetId, 'transformations'],
    queryFn: async () => {
      if (!assetId) return null;
      const { data } = await api.get<import('../types').AssetTransformations>(`/media/${assetId}/transformations`);
      return data;
    },
    enabled: !!assetId,
  });
}

export function useSyncAllCloudinaryMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/media/sync-all-metadata');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}


