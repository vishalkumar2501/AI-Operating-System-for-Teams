import { DndContext, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { TaskItem } from './tasks.queries';
import { TaskCard } from './TaskCard';
import type { TaskStatus } from '@teamos/shared';

interface KanbanBoardProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onOpenCreate: (status: TaskStatus) => void;
}

const COLUMNS: Array<{ status: TaskStatus; label: string; accent: string }> = [
  { status: 'BACKLOG', label: 'Backlog', accent: 'border-t-slate-500' },
  { status: 'TODO', label: 'To Do', accent: 'border-t-indigo-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', accent: 'border-t-amber-500' },
  { status: 'IN_REVIEW', label: 'In Review', accent: 'border-t-purple-500' },
  { status: 'DONE', label: 'Done', accent: 'border-t-emerald-500' },
];

function KanbanColumn({
  status,
  label,
  accent,
  tasks,
  onTaskClick,
  onOpenCreate,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onOpenCreate: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl bg-slate-900/60 border border-slate-800 ${accent} border-t-2 min-w-[280px] max-w-[320px] flex-1 ${
        isOver ? 'ring-2 ring-indigo-500/50 bg-slate-900/90' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{label}</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onOpenCreate(status)}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
          title={`Add task to ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards List */}
      <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[160px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}

        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center p-6 text-center text-xs text-slate-600 border border-dashed border-slate-800/60 rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onOpenCreate }: KanbanBoardProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const targetStatus = over.id as TaskStatus;
    const currentTask = tasks.find((t) => t.id === taskId);

    if (currentTask && currentTask.status !== targetStatus) {
      onStatusChange(taskId, targetStatus);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            accent={col.accent}
            tasks={tasks.filter((t) => t.status === col.status)}
            onTaskClick={onTaskClick}
            onOpenCreate={onOpenCreate}
          />
        ))}
      </div>
    </DndContext>
  );
}
