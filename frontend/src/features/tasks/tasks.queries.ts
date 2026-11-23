import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateTaskDto, UpdateTaskDto, TaskStatus, TaskPriority } from '@teamos/shared';

export interface TaskItem {
  id: string;
  workspaceId: string;
  projectId: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  parentTaskId: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimate: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    key: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  reporter?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  subscribers?: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
    userId: string;
  }>;
  subtasks?: Array<{
    id: string;
    number: number;
    title: string;
    status: TaskStatus;
    assignee?: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    } | null;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    fileUrl: string;
    size: number;
    mime: string;
    createdAt: string;
  }>;
  dependencies?: Array<{
    id: string;
    dependsOnTaskId: string;
    dependsOnTask: {
      id: string;
      number: number;
      title: string;
      status: TaskStatus;
      project: { key: string };
    };
  }>;
  blocking?: Array<{
    id: string;
    taskId: string;
    task: {
      id: string;
      number: number;
      title: string;
      status: TaskStatus;
      project: { key: string };
    };
  }>;
  _count?: {
    subtasks: number;
    comments: number;
    attachments: number;
  };
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

export function useProjectTasks(projectId: string | undefined, filters?: TaskFilters) {
  return useQuery<TaskItem[]>({
    queryKey: ['tasks', projectId, filters],
    queryFn: async () => {
      if (!projectId) return [];
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters?.search) params.append('search', filters.search);

      const res = await api.get(`/projects/${projectId}/tasks?${params.toString()}`);
      return res.data.data ?? res.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useTask(taskId: string | null) {
  return useQuery<TaskItem>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`);
      return res.data.data ?? res.data;
    },
    enabled: Boolean(taskId),
  });
}

export function useMyTasks(workspaceId?: string) {
  return useQuery<TaskItem[]>({
    queryKey: ['tasks', 'my', workspaceId],
    queryFn: async () => {
      const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
      const res = await api.get(`/tasks/my${query}`);
      return res.data.data ?? res.data;
    },
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTaskDto) => {
      const res = await api.post(`/projects/${projectId}/tasks`, dto);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });
}

export function useUpdateTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskDto }) => {
      const res = await api.patch(`/tasks/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });
}

export function useDeleteTask(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });
}

export function useAddSubscriber(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/tasks/${taskId}/subscribers`, { userId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useRemoveSubscriber(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/tasks/${taskId}/subscribers/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}
