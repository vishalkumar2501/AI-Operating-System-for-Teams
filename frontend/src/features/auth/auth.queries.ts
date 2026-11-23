import apiClient, { unwrap } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useLogin() {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: LoginDto): Promise<AuthResponse> => {
      const res = await apiClient.post('/auth/login', dto);
      return unwrap<AuthResponse>(res);
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      qc.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RegisterDto): Promise<AuthResponse> => {
      const res = await apiClient.post('/auth/register', dto);
      return unwrap<AuthResponse>(res);
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      qc.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSettled: () => {
      clearAuth();
      qc.clear();
    },
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<AuthUser> => {
      const res = await apiClient.get('/auth/me');
      return unwrap<AuthUser>(res);
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
