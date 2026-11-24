import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { aiApi } from './ai.api';
import { ProposedAction } from '@teamos/shared';
import { Spinner } from '@/components/ui';

interface ApprovalCardProps {
  workspaceId: string;
  action: ProposedAction;
  onResolved?: () => void;
}

export function ApprovalCard({ workspaceId, action, onResolved }: ApprovalCardProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(action.status);

  const approveMutation = useMutation({
    mutationFn: () => aiApi.approveAction(workspaceId, action.id),
    onSuccess: () => {
      setStatus('EXECUTED');
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['calendar', workspaceId] });
      onResolved?.();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => aiApi.rejectAction(workspaceId, action.id),
    onSuccess: () => {
      setStatus('REJECTED');
      onResolved?.();
    },
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="rounded-xl border border-ai-border/60 bg-ai-subtle p-4 shadow-card text-text">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-semantic-warning" />
          <span className="text-xs font-bold uppercase tracking-wider text-text">
            Action Approval Required
          </span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            status === 'EXECUTED'
              ? 'bg-semantic-success-subtle text-semantic-success border border-semantic-success-border'
              : status === 'REJECTED'
                ? 'bg-semantic-danger-subtle text-semantic-danger border border-semantic-danger-border'
                : 'bg-ai-bg text-ai-text border border-ai-border animate-pulse'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="my-3 space-y-2 text-xs">
        <div className="flex items-center justify-between text-text-2">
          <span>Action:</span>
          <span className="font-mono text-accent font-semibold">{action.tool}</span>
        </div>

        {/* Input Details */}
        <div className="rounded-lg bg-surface-1 border border-border p-2.5 font-mono text-[11px] text-text overflow-x-auto space-y-1">
          {Object.entries(action.input).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-text-3">{k}:</span>
              <span className="text-text truncate">{String(v)}</span>
            </div>
          ))}
        </div>

        {/* Before / After Diff if present */}
        {action.before && (
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded bg-semantic-danger-subtle border border-semantic-danger-border p-2">
              <span className="text-semantic-danger font-bold block mb-1">Current State</span>
              <p className="text-text-2 truncate">{JSON.stringify(action.before)}</p>
            </div>
            <div className="rounded bg-semantic-success-subtle border border-semantic-success-border p-2">
              <span className="text-semantic-success font-bold block mb-1">Proposed State</span>
              <p className="text-text truncate">{JSON.stringify(action.after)}</p>
            </div>
          </div>
        )}
      </div>

      {status === 'PROPOSED' ? (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-surface-2 disabled:opacity-50 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-semantic-danger" />
            Reject
          </button>
          <button
            onClick={() => approveMutation.mutate()}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-ai-bg border border-ai-border px-3 py-1.5 text-xs font-bold text-ai-text hover:bg-accent-hover disabled:opacity-50 shadow-sm transition-colors"
          >
            {isPending ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />}
            Approve & Execute
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-border flex items-center gap-1.5 text-xs text-text-3 font-medium">
          {status === 'EXECUTED' ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-semantic-success" />
              <span>Executed and logged in audit log</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-semantic-danger" />
              <span>Action rejected by user</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default ApprovalCard;
