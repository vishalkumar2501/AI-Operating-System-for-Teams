import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Flame, AlertTriangle, Clock, CheckCircle2, Circle } from 'lucide-react';
import type { GraphNode, TaskStatus } from '@teamos/shared';

export interface TaskNodeData extends GraphNode {
  onSelectTask?: (taskId: string) => void;
}

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  BACKLOG: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' },
  TODO: { bg: 'bg-indigo-950/50', text: 'text-indigo-400', border: 'border-indigo-800/60' },
  IN_PROGRESS: { bg: 'bg-blue-950/50', text: 'text-blue-400', border: 'border-blue-800/60' },
  IN_REVIEW: { bg: 'bg-purple-950/50', text: 'text-purple-400', border: 'border-purple-800/60' },
  DONE: { bg: 'bg-emerald-950/50', text: 'text-emerald-400', border: 'border-emerald-800/60' },
  BLOCKED: { bg: 'bg-rose-950/50', text: 'text-rose-400', border: 'border-rose-800/60' },
};

const priorityColors: Record<string, string> = {
  LOW: 'text-slate-400',
  MEDIUM: 'text-blue-400',
  HIGH: 'text-amber-400',
  URGENT: 'text-rose-400 font-semibold',
};

export const TaskNode = memo(({ data }: NodeProps<any>) => {
  const nodeData = data as TaskNodeData;
  const isDone = nodeData.status === 'DONE';
  const isBlocked = nodeData.status === 'BLOCKED' || nodeData.isBlocked;
  const isCritical = nodeData.isCriticalPath;
  const statusTheme = statusColors[nodeData.status] ?? statusColors.TODO;

  return (
    <div
      onClick={() => nodeData.onSelectTask?.(nodeData.id)}
      className={`group relative w-64 rounded-xl border p-3.5 shadow-lg transition-all duration-150 cursor-pointer ${
        isCritical
          ? 'border-amber-500/80 bg-slate-900/95 shadow-amber-950/40 ring-2 ring-amber-500/25 hover:border-amber-400'
          : isBlocked
          ? 'border-rose-700/80 bg-slate-900/95 ring-1 ring-rose-500/20 hover:border-rose-500'
          : isDone
          ? 'border-slate-800/80 bg-slate-900/60 opacity-80 hover:opacity-100 hover:border-slate-700'
          : 'border-slate-800 bg-slate-900/95 hover:border-indigo-500/60 hover:shadow-indigo-950/20'
      }`}
    >
      {/* Target handle: prerequisite connects here */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-950 !bg-indigo-400 hover:!bg-indigo-300"
      />

      {/* Top Header: Key & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-semibold text-slate-400 group-hover:text-indigo-300 transition-colors">
          {nodeData.key}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${statusTheme.bg} ${statusTheme.text} ${statusTheme.border}`}
        >
          {isDone ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : isBlocked ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Circle className="h-2 w-2 fill-current" />
          )}
          {nodeData.status}
        </span>
      </div>

      {/* Task Title */}
      <p
        className={`text-xs font-medium leading-snug line-clamp-2 ${
          isDone ? 'text-slate-400 line-through' : 'text-slate-100'
        }`}
        title={nodeData.title}
      >
        {nodeData.title}
      </p>

      {/* Bottom row: Priority, Estimate, Badges */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className={priorityColors[nodeData.priority] ?? 'text-slate-400'}>
            {nodeData.priority}
          </span>
          {nodeData.estimate != null && (
            <span className="inline-flex items-center gap-0.5 text-slate-400">
              <Clock className="h-2.5 w-2.5" />
              {nodeData.estimate}h
            </span>
          )}
        </div>

        {/* Status flags */}
        <div className="flex items-center gap-1">
          {isCritical && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="On project critical path"
            >
              <Flame className="h-2.5 w-2.5 fill-current" />
              CPM
            </span>
          )}
          {isBlocked && !isDone && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"
              title="Blocked by prerequisite tasks"
            >
              Blocked
            </span>
          )}
        </div>
      </div>

      {/* Source handle: outgoing dependency connects to dependents */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-slate-950 !bg-indigo-400 hover:!bg-indigo-300"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
