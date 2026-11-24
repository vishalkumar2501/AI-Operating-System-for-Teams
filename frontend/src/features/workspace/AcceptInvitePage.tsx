import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useAcceptInvite } from './workspace.queries';
import { Button, Spinner, useToast } from '@/components/ui';
import apiClient, { unwrap } from '@/lib/api';
import { AxiosError } from 'axios';

interface InviteInfo {
  workspaceName: string;
  inviterName: string;
  role: string;
}

export function AcceptInvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const acceptInvite = useAcceptInvite();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/invite/${token}`, { replace: true });
    }
  }, [isAuthenticated, token, navigate]);

  // Fetch invite info
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    apiClient
      .get(`/invites/${token}`)
      .then((res) => {
        const data = unwrap<InviteInfo>(res);
        setInviteInfo(data);
      })
      .catch(() => {
        setLoadError('This invitation is invalid or has expired.');
      });
  }, [isAuthenticated, token]);

  const handleAccept = async () => {
    try {
      const ws = await acceptInvite.mutateAsync(token);
      toast(`Joined workspace "${ws.name}"!`, 'success');
      navigate(`/workspaces/${ws.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      const msg = axiosErr.response?.data?.error?.message ?? 'Failed to accept invitation.';
      toast(msg, 'error');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-8 text-center shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle dark:bg-accent-subtle mx-auto mb-5">
          <span className="text-2xl">✉️</span>
        </div>

        {loadError ? (
          <>
            <h1 className="text-lg font-bold text-text">Invalid invitation</h1>
            <p className="mt-2 text-sm text-text-3">{loadError}</p>
            <Button
              className="mt-6 w-full"
              variant="secondary"
              onClick={() => navigate('/workspaces')}
            >
              Go to workspaces
            </Button>
          </>
        ) : !inviteInfo ? (
          <div className="flex items-center justify-center py-4">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-text">You&apos;re invited!</h1>
            <p className="mt-2 text-sm text-text-3">
              Join <span className="font-semibold text-text">{inviteInfo.workspaceName}</span>{' '}
              as <span className="font-semibold text-text">{inviteInfo.role}</span>.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={handleAccept}
              isLoading={acceptInvite.isPending}
            >
              Accept invitation
            </Button>
            <Button className="mt-2 w-full" variant="ghost" onClick={() => navigate('/workspaces')}>
              Decline
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
