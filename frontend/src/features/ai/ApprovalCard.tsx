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
    <div className="rounded-xl border border-indigo-500/30 bg-slate-900/90 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Action Approval Required
          </span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            status === 'EXECUTED'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
              : status === 'REJECTED'
              ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
              : 'bg-amber-950 text-amber-300 border border-amber-800/50 animate-pulse'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="my-3 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Action:</span>
          <span className="font-mono text-indigo-300 font-semibold">{action.tool}</span>
        </div>

        {/* Input Details */}
        <div className="rounded-lg bg-slate-950/80 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
          {Object.entries(action.input).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-slate-500">{k}:</span>
              <span className="text-slate-200 truncate">{String(v)}</span>
            </div>
          ))}
        </div>

        {/* Before / After Diff if present */}
        {action.before && (
          <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded bg-rose-950/20 border border-rose-900/30 p-2">
              <span className="text-rose-400 font-bold block mb-1">Current State</span>
              <p className="text-slate-400 truncate">{JSON.stringify(action.before)}</p>
            </div>
            <div className="rounded bg-emerald-950/20 border border-emerald-900/30 p-2">
              <span className="text-emerald-400 font-bold block mb-1">Proposed State</span>
              <p className="text-slate-300 truncate">{JSON.stringify(action.after)}</p>
            </div>
          </div>
        )}
      </div>

      {status === 'PROPOSED' ? (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5 text-rose-400" />
            Reject
          </button>
          <button
            onClick={() => approveMutation.mutate()}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {isPending ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            Approve & Execute
          </button>
        </div>
      ) : status === 'EXECUTED' ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-1 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Action executed successfully by user confirmation.
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1 font-medium">
          <XCircle className="h-4 w-4" />
          Action proposal was rejected.
        </div>
      )}
    </div>
  );
}
