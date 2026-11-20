import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { FullPageSpinner } from '@/components/ui';
import apiClient, { unwrap } from '@/lib/api';
import type { AuthUser } from '@/features/auth/auth.queries';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      navigate('/login?error=no_token');
      return;
    }

    // Store token and fetch user
    localStorage.setItem('teamos_token', token);

    apiClient
      .get('/auth/me')
      .then((res) => {
        const user = unwrap<AuthUser>(res);
        setAuth(user, token);
        navigate('/workspaces');
      })
      .catch(() => {
        navigate('/login?error=invalid_token');
      });
  }, [params, setAuth, navigate]);

  return <FullPageSpinner />;
}
