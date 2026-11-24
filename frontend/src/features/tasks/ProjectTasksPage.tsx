import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Kanban, List, Network, Plus, Search, ArrowLeft } from 'lucide-react';
import { useProject } from '@/features/projects/projects.queries';
import { useProjectTasks, useUpdateTask, type TaskItem, type TaskFilters } from './tasks.queries';
import { KanbanBoard } from './KanbanBoard';
import { TaskListView } from './TaskListView';
import { DependencyGraphView } from '@/features/dependencies/DependencyGraphView';
import { useProjectRealtime } from '@/features/realtime/useRealtime';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { TaskStatus } from '@teamos/shared';

export function ProjectTasksPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'board' | 'list' | 'graph'>('board');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>('TODO');

  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  useProjectRealtime(projectId);

  const filters: TaskFilters = {
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  };

  const { data: tasks = [], isLoading: isTasksLoading } = useProjectTasks(projectId, filters);
  const updateTask = useUpdateTask(projectId);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask.mutate({ id: taskId, data: { status: newStatus } });
  };

  const handleOpenCreateWithStatus = (status: TaskStatus) => {
    setCreateDefaultStatus(status);
    setIsCreateModalOpen(true);
  };

  if (isProjectLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-text-3">
        <p>Project not found.</p>
        <Button
          variant="ghost"
          onClick={() => navigate(`/workspaces/${workspaceId}/projects`)}
          className="mt-4"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/workspaces/${workspaceId}/projects`)}
          className="p-1.5 rounded-lg text-text-3 hover:text-text hover:bg-surface-2 transition-colors"
          title="Back to Projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <Badge variant="info" className="font-mono text-xs">
            {project.key}
          </Badge>
          <h1 className="text-xl font-bold text-text tracking-tight">{project.name}</h1>
        </div>
      </div>

      {/* Action Bar: Controls, Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-2 border border-border rounded-lg text-xs text-text placeholder-text-3 focus:outline-none focus:border-primary dark:focus:border-accent transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-2 focus:outline-none focus:border-primary dark:focus:border-accent transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-2 focus:outline-none focus:border-primary dark:focus:border-accent transition-colors"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div className="flex items-center gap-3 justify-end">
          {/* View Toggle */}
          <div className="flex items-center bg-surface-2 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'board'
                  ? 'bg-surface-3 text-text font-semibold shadow-sm'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-surface-3 text-text font-semibold shadow-sm'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'graph'
                  ? 'bg-surface-3 text-text font-semibold shadow-sm'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Graph</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => handleOpenCreateWithStatus('TODO')}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      {isTasksLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : viewMode === 'board' ? (
        <KanbanBoard
          tasks={tasks}
          onTaskClick={(t) => setSelectedTask(t)}
          onStatusChange={handleStatusChange}
          onOpenCreate={handleOpenCreateWithStatus}
        />
      ) : viewMode === 'list' ? (
        <TaskListView
          tasks={tasks}
          onTaskClick={(t) => setSelectedTask(t)}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="h-[750px] w-full rounded-2xl border border-border overflow-hidden shadow-xl bg-surface-1">
          <DependencyGraphView
            projectId={projectId!}
            onSelectTask={(id) => {
              const found = tasks.find((t) => t.id === id);
              if (found) setSelectedTask(found);
            }}
          />
        </div>
      )}

      {/* Create Modal */}
      {workspaceId && projectId && (
        <CreateTaskModal
          workspaceId={workspaceId}
          projectId={projectId}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          defaultStatus={createDefaultStatus}
        />
      )}

      {/* Task Detail Drawer */}
      {workspaceId && projectId && (
        <TaskDetailDrawer
          taskId={selectedTask ? selectedTask.id : null}
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
