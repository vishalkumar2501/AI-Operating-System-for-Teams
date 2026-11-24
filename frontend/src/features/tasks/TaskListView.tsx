import { Calendar, CheckCircle2, Circle } from 'lucide-react';
import type { TaskItem } from './tasks.queries';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { TaskStatus } from '@teamos/shared';

interface TaskListViewProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const PRIORITY_BADGES: Record<string, 'info' | 'warning' | 'destructive' | 'default'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export function TaskListView({ tasks, onTaskClick, onStatusChange }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 bg-surface-1 border border-dashed border-border rounded-xl text-text-3 text-sm">
        No tasks match the active filters.
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="divide-y divide-border">
        {tasks.map((task) => {
          const isDone = task.status === 'DONE';

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-surface-2 cursor-pointer transition-colors group"
            >
              {/* Left: Checkbox + Key + Title */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, isDone ? 'TODO' : 'DONE');
                  }}
                  className="text-text-3 hover:text-semantic-success transition-colors flex-shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-semantic-success" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <span className="font-mono text-xs font-semibold text-text-3 group-hover:text-primary dark:group-hover:text-accent transition-colors flex-shrink-0">
                  {task.project.key}-{task.number}
                </span>

                <span
                  className={`text-sm font-medium truncate ${
                    isDone ? 'line-through text-text-3' : 'text-text'
                  }`}
                >
                  {task.title}
                </span>
              </div>

              {/* Right: Status + Priority + Assignee + Due Date */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="hidden md:inline-block text-xs text-text-2 bg-surface-2 px-2 py-0.5 rounded border border-border/50">
                  {task.status.replace('_', ' ')}
                </span>

                <Badge
                  variant={PRIORITY_BADGES[task.priority] || 'default'}
                  className="text-[10px]"
                >
                  {task.priority}
                </Badge>

                {task.dueDate && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-text-3 font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(task.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}

                {task.assignee ? (
                  <Avatar name={task.assignee.name || task.assignee.email} size="sm" />
                ) : (
                  <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center text-[10px] text-text-3">
                    ?
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
