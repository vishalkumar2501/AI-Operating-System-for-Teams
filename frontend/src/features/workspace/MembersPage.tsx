import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useWorkspaceMembers,
  useWorkspaceInvites,
  useInviteMember,
  type WorkspaceMember,
  type WorkspaceInvite,
} from './workspace.queries';
import { Avatar, Badge, Button, Input, Modal, Spinner, useToast } from '@/components/ui';
import { AxiosError } from 'axios';

type Role = 'ADMIN' | 'MEMBER' | 'GUEST';

const roleBadgeVariant: Record<string, 'info' | 'warning' | 'default' | 'success'> = {
  OWNER: 'info',
  ADMIN: 'warning',
  MEMBER: 'default',
  GUEST: 'success',
};

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function MemberRow({ member }: { member: WorkspaceMember }) {
  return (
    <tr className="border-b border-border/60 hover:bg-surface-2/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.user.name} src={member.user.avatarUrl} size="sm" />
          <span className="text-sm font-medium text-text">{member.user.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-2">{member.user.email}</td>
      <td className="px-4 py-3">
        <Badge variant={roleBadgeVariant[member.role] ?? 'default'}>{member.role}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-text-3">
        {(() => {
          const rawDate = member.joinedAt || (member as any).createdAt;
          if (!rawDate) return 'Recently';
          const d = new Date(rawDate);
          return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
        })()}
      </td>
    </tr>
  );
}

function InviteRow({ invite }: { invite: WorkspaceInvite }) {
  return (
    <tr className="border-b border-border/60 hover:bg-surface-2/60 transition-colors">
      <td className="px-4 py-3 text-sm text-text">{invite.email}</td>
      <td className="px-4 py-3">
        <Badge variant={roleBadgeVariant[invite.role] ?? 'default'}>{invite.role}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="warning">PENDING</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-text-3">
        Expires {new Date(invite.expiresAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

function InviteMemberModal({
  workspaceId,
  isOpen,
  onClose,
}: {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const invite = useInviteMember(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'MEMBER' },
  });

  const onClose_ = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: InviteFormValues) => {
    try {
      await invite.mutateAsync({ email: data.email, role: data.role as Role });
      toast(`Invitation sent to ${data.email}`, 'success');
      onClose_();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      const msg = axiosErr.response?.data?.error?.message ?? 'Failed to send invitation.';
      toast(msg, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose_} title="Invite member" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          placeholder="colleague@company.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-2">Role</label>
          <select
            {...register('role')}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-bg"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="GUEST">Guest</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose_}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={invite.isPending}>
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function MembersPage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const [showInvite, setShowInvite] = useState(false);
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const { data: invites, isLoading: invitesLoading } = useWorkspaceInvites(workspaceId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Members</h1>
          <p className="mt-0.5 text-sm text-text-2">Manage who has access to this workspace</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowInvite(true)}>
          Invite member
        </Button>
      </div>

      {/* Members table */}
      <div className="rounded-xl border border-border bg-surface-1 overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-text">
            Members{members ? ` (${members.length})` : ''}
          </h2>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : !members || members.length === 0 ? (
          <div className="py-12 text-center text-text-3 text-sm">No members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Name</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Email</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Role</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending invites */}
      <div className="rounded-xl border border-border bg-surface-1 overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Mail className="h-4 w-4 text-text-3" />
          <h2 className="text-sm font-medium text-text">
            Pending invites{invites ? ` (${invites.length})` : ''}
          </h2>
        </div>

        {invitesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : !invites || invites.length === 0 ? (
          <div className="py-8 text-center text-text-3 text-sm">No pending invitations.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Email</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Role</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-text-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <InviteRow key={inv.id} invite={inv} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteMemberModal
        workspaceId={workspaceId}
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}
export default MembersPage;
