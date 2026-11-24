import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Flame, AlertTriangle, Clock, CheckCircle2, Circle } from 'lucide-react';
import type { GraphNode, TaskStatus } from '@teamos/shared';

export interface TaskNodeData extends GraphNode {
  onSelectTask?: (taskId: string) => void;
  [key: string]: unknown;
}

export type TaskNodeType = Node<TaskNodeData, 'taskNode'>;

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  BACKLOG: { bg: 'bg-surface-2', text: 'text-text-3', border: 'border-border' },
  TODO: {
    bg: 'bg-semantic-info-subtle',
    text: 'text-semantic-info',
    border: 'border-semantic-info-border',
  },
  IN_PROGRESS: { bg: 'bg-accent-subtle', text: 'text-accent', border: 'border-accent/30' },
  IN_REVIEW: {
    bg: 'bg-semantic-warning-subtle',
    text: 'text-semantic-warning',
    border: 'border-semantic-warning-border',
  },
  DONE: {
    bg: 'bg-semantic-success-subtle',
    text: 'text-semantic-success',
    border: 'border-semantic-success-border',
  },
  BLOCKED: {
    bg: 'bg-semantic-danger-subtle',
    text: 'text-semantic-danger',
    border: 'border-semantic-danger-border',
  },
};

const priorityColors: Record<string, string> = {
  LOW: 'text-text-3',
  MEDIUM: 'text-semantic-info',
  HIGH: 'text-semantic-warning',
  URGENT: 'text-semantic-danger font-semibold',
};

export const TaskNode = memo(({ data }: NodeProps<TaskNodeType>) => {
  const nodeData = data;
  const isDone = nodeData.status === 'DONE';
  const isBlocked = nodeData.status === 'BLOCKED' || nodeData.isBlocked;
  const isCritical = nodeData.isCriticalPath;
  const statusTheme = statusColors[nodeData.status] ?? statusColors.TODO;

  return (
    <div
      onClick={() => nodeData.onSelectTask?.(nodeData.id)}
      className={`group relative w-64 rounded-xl border p-3.5 shadow-card transition-all duration-150 cursor-pointer ${
        isCritical
          ? 'border-accent bg-surface-1 ring-2 ring-accent/30 hover:border-accent-hover'
          : isBlocked
            ? 'border-semantic-danger bg-surface-1 ring-1 ring-semantic-danger/30'
            : isDone
              ? 'border-border bg-surface-1 opacity-70 hover:opacity-100'
              : 'border-border bg-surface-1 hover:border-accent/60'
      }`}
    >
      {/* Target handle: prerequisite connects here */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-surface-1 !bg-accent hover:!bg-accent-hover"
      />

      {/* Top Header: Key & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-semibold text-text-3 group-hover:text-accent transition-colors">
          {nodeData.key}
        </span>
        <div className="flex items-center gap-1.5">
          {isCritical && (
            <span
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent text-on-accent"
              title="On Critical Path"
            >
              <Flame className="h-3 w-3" />
              Critical
            </span>
          )}
          {isBlocked && !isCritical && (
            <span
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-semantic-danger-subtle text-semantic-danger border border-semantic-danger-border"
              title="Blocked by incomplete dependency"
            >
              <AlertTriangle className="h-3 w-3" />
              Blocked
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${statusTheme.bg} ${statusTheme.text} ${statusTheme.border}`}
          >
            {nodeData.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="line-clamp-2 text-xs font-medium text-text leading-snug mb-3">
        {nodeData.title}
      </p>

      {/* Footer: Priority & Execution Times */}
      <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-text-3">
        <span className={priorityColors[nodeData.priority] ?? 'text-text-3'}>
          {nodeData.priority}
        </span>
        <div className="flex items-center gap-2">
          {Boolean(nodeData.estimatedHours) && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {String(nodeData.estimatedHours)}h
            </span>
          )}
          {isDone ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-semantic-success" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-text-3" />
          )}
        </div>
      </div>

      {/* Source handle: dependents connect here */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-surface-1 !bg-accent hover:!bg-accent-hover"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
export default TaskNode;
