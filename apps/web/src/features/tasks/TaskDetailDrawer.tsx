import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  CheckSquare,
  Paperclip,
  Trash2,
  Plus,
  Bell,
  BellOff,
  Upload,
} from 'lucide-react';
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useCreateTask,
  useAddSubscriber,
  useRemoveSubscriber,
  useUploadAttachment,
  useDeleteAttachment,
} from './tasks.queries';
import { useWorkspaceMembers } from '@/features/workspace/workspace.queries';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { TaskStatus, TaskPriority } from '@teamos/shared';

interface TaskDetailDrawerProps {
  taskId: string | null;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
}

export function TaskDetailDrawer({
  taskId,
  workspaceId,
  projectId,
  onClose,
}: TaskDetailDrawerProps) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { data: task, isLoading } = useTask(taskId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const createSubtask = useCreateTask(projectId);
  const addSubscriber = useAddSubscriber(taskId || '');
  const removeSubscriber = useRemoveSubscriber(taskId || '');
  const uploadAttachment = useUploadAttachment(taskId || '');
  const deleteAttachment = useDeleteAttachment(taskId || '');

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  if (!taskId) return null;

  const isSubscribed = Boolean(task?.subscribers?.some((s) => s.userId === user?.id));

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status } });
      showToast('Status updated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { priority } });
      showToast('Priority updated', 'success');
    } catch {
      showToast('Failed to update priority', 'error');
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { assigneeId: assigneeId === '' ? null : assigneeId },
      });
      showToast('Assignee updated', 'success');
    } catch {
      showToast('Failed to update assignee', 'error');
    }
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: { dueDate: val ? new Date(val).toISOString() : null },
      });
      showToast('Due date updated', 'success');
    } catch {
      showToast('Failed to update due date', 'error');
    }
  };

  const handleToggleSubscribe = async () => {
    if (!user) return;
    try {
      if (isSubscribed) {
        await removeSubscriber.mutateAsync(user.id);
        showToast('Unsubscribed from notifications', 'info');
      } else {
        await addSubscriber.mutateAsync(user.id);
        showToast('Subscribed to task notifications', 'success');
      }
    } catch {
      showToast('Subscription update failed', 'error');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      await createSubtask.mutateAsync({
        title: newSubtaskTitle.trim(),
        parentTaskId: taskId,
        status: 'TODO',
        priority: 'MEDIUM',
      });
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      showToast('Subtask added', 'success');
    } catch {
      showToast('Failed to add subtask', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync(file);
      showToast('Attachment uploaded', 'success');
      e.target.value = '';
    } catch {
      showToast('Failed to upload file', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask.mutateAsync(taskId);
      showToast('Task deleted', 'success');
      onClose();
    } catch {
      showToast('Failed to delete task', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-indigo-400">
              {task ? `${task.project.key}-${task.number}` : '...'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSubscribe}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
            >
              {isSubscribed ? (
                <>
                  <BellOff className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Subscribed</span>
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5" />
                  <span>Subscribe</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}
            <div>
              <input
                type="text"
                defaultValue={task.title}
                onBlur={(e) => {
                  if (e.target.value.trim() !== task.title) {
                    updateTask.mutate({ id: taskId, data: { title: e.target.value.trim() } });
                  }
                }}
                className="w-full text-xl font-bold bg-transparent border-0 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5"
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Assignee</label>
                <select
                  value={task.assigneeId || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name || m.user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Due Date</label>
                <input
                  type="date"
                  defaultValue={task.dueDate ? task.dueDate.split('T')[0] : ''}
                  onChange={handleDueDateChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Description</h4>
              <textarea
                rows={4}
                defaultValue={task.description || ''}
                placeholder="Add more details about this task..."
                onBlur={(e) => {
                  if (e.target.value !== (task.description || '')) {
                    updateTask.mutate({ id: taskId, data: { description: e.target.value } });
                  }
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-slate-400" />
                  Subtasks ({task.subtasks?.length ?? 0})
                </h4>
                {!isAddingSubtask && (
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Subtask
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {task.subtasks?.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <span className="font-medium text-slate-200">{sub.title}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {sub.status}
                    </span>
                  </div>
                ))}

                {isAddingSubtask && (
                  <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Subtask title..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      autoFocus
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingSubtask(false)}>
                      Cancel
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Subscribers */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Subscribers ({task.subscribers?.length ?? 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {task.subscribers?.map((sub) => (
                  <div
                    key={sub.userId}
                    className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-full px-2.5 py-1 text-xs text-slate-300"
                  >
                    <Avatar name={sub.user.name || sub.user.email} size="sm" />
                    <span>{sub.user.name || sub.user.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  Attachments ({task.attachments?.length ?? 0})
                </h4>
                <label className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  Upload File
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-1.5">
                {task.attachments?.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <a
                      href={`http://localhost:5000${att.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline font-medium truncate max-w-xs"
                    >
                      {att.name}
                    </a>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">
                        {(att.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        onClick={() => deleteAttachment.mutate(att.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
