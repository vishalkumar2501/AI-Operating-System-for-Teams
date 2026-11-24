import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { useMyTasks, type TaskItem } from './tasks.queries';
import { TaskListView } from './TaskListView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { Spinner } from '@/components/ui/Spinner';

export function MyTasksPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: tasks = [], isLoading } = useMyTasks(workspaceId);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2.5">
          <CheckSquare className="h-6 w-6 text-primary dark:text-accent" />
          My Tasks
        </h1>
        <p className="text-sm text-text-3 mt-1">
          Everything assigned to you across all projects in this workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <TaskListView
          tasks={tasks}
          onTaskClick={(t) => setSelectedTask(t)}
          onStatusChange={() => {}}
        />
      )}

      {selectedTask && workspaceId && (
        <TaskDetailDrawer
          taskId={selectedTask.id}
          workspaceId={workspaceId}
          projectId={selectedTask.projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
