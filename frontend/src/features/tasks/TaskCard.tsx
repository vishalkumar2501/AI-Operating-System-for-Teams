import { useDraggable } from '@dnd-kit/core';
import { Calendar, CheckSquare, Paperclip } from 'lucide-react';
import type { TaskItem } from './tasks.queries';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

interface TaskCardProps {
  task: TaskItem;
  onClick: () => void;
}

const PRIORITY_BADGES: Record<string, 'info' | 'warning' | 'destructive' | 'default'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`p-3.5 bg-surface-1 border rounded-lg hover:border-accent/60 transition-all cursor-pointer group shadow-card select-none ${
        isDragging
          ? 'opacity-80 border-accent ring-2 ring-ring shadow-lg'
          : 'border-border hover:bg-surface-2'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-text-3 group-hover:text-accent transition-colors">
          {task.project.key}-{task.number}
        </span>
        <Badge
          variant={PRIORITY_BADGES[task.priority] || 'default'}
          className="text-[10px] px-1.5 py-0.5"
        >
          {task.priority}
        </Badge>
      </div>

      <h4 className="text-sm font-medium text-text line-clamp-2 leading-snug">{task.title}</h4>

      <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-3">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-text-2">
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}

          {(task._count?.subtasks ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <CheckSquare className="h-3 w-3" />
              {task._count?.subtasks}
            </span>
          )}

          {(task._count?.attachments ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <Paperclip className="h-3 w-3" />
              {task._count?.attachments}
            </span>
          )}
        </div>

        <div className="flex items-center">
          {task.assignee ? (
            <Avatar name={task.assignee.name || task.assignee.email} size="sm" />
          ) : (
            <div className="h-5 w-5 rounded-full border border-dashed border-border-strong flex items-center justify-center text-[10px] text-text-3">
              ?
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default TaskCard;
