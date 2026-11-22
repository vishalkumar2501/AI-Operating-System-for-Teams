import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CommentItem, CreateCommentDto, ApiSuccessResponse } from '@teamos/shared';

export function useComments(taskId: string | null) {
  return useQuery<CommentItem[]>({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await api.get<ApiSuccessResponse<CommentItem[]>>(`/tasks/${taskId}/comments`);
      return res.data.data ?? res.data;
    },
    enabled: Boolean(taskId),
  });
}

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCommentDto) => {
      const res = await api.post<ApiSuccessResponse<CommentItem>>(
        `/tasks/${taskId}/comments`,
        data
      );
      return res.data.data ?? res.data;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<CommentItem[]>(['comments', taskId], (old = []) => {
        // Prevent duplicate if already inserted via realtime socket event
        if (old.some((c) => c.id === newComment.id)) return old;
        return [...old, newComment];
      });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      return res.data;
    },
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<CommentItem[]>(['comments', taskId], (old = []) =>
        old.filter((c) => c.id !== commentId)
      );
    },
  });
}
