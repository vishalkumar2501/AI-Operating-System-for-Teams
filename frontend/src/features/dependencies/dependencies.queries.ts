import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import type { ProjectGraphData, ApiSuccessResponse, AddDependencyDto } from '@teamos/shared';

export function useProjectGraph(projectId: string) {
  return useQuery<ProjectGraphData>({
    queryKey: ['project-graph', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccessResponse<ProjectGraphData>>(
        `/projects/${projectId}/graph`
      );
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useAddDependency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: AddDependencyDto }) => {
      const res = await apiClient.post<ApiSuccessResponse<unknown>>(
        `/tasks/${taskId}/dependencies`,
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-graph', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });
}

export function useRemoveDependency(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, depId }: { taskId: string; depId: string }) => {
      const res = await apiClient.delete<ApiSuccessResponse<unknown>>(
        `/tasks/${taskId}/dependencies/${depId}`
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-graph', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });
}
