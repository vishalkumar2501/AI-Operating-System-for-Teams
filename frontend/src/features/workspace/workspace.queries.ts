import apiClient, { unwrap } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

interface CreateWorkspaceDto {
  name: string;
  slug: string;
}

interface InviteMemberDto {
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<Workspace[]> => {
      const res = await apiClient.get('/workspaces');
      return unwrap<Workspace[]>(res);
    },
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'members'],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/members`);
      return unwrap<WorkspaceMember[]>(res);
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceInvites(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'invites'],
    queryFn: async (): Promise<WorkspaceInvite[]> => {
      const res = await apiClient.get(`/workspaces/${workspaceId}/invites`);
      return unwrap<WorkspaceInvite[]>(res);
    },
    enabled: !!workspaceId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateWorkspaceDto): Promise<Workspace> => {
      const res = await apiClient.post('/workspaces', dto);
      return unwrap<Workspace>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: InviteMemberDto): Promise<WorkspaceInvite> => {
      const res = await apiClient.post(`/workspaces/${workspaceId}/invites`, dto);
      return unwrap<WorkspaceInvite>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'invites'] });
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (token: string): Promise<Workspace> => {
      const res = await apiClient.post(`/invites/${token}/accept`);
      return unwrap<Workspace>(res);
    },
  });
}
