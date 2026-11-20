import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface InAppNotification {
  id: string;
  userId: string;
  type: string;
  payload: {
    taskId?: string;
    taskKey?: string;
    taskTitle?: string;
    summary?: string;
    assignedBy?: string;
    updatedBy?: string;
  };
  readAt: string | null;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<InAppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s in background
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
