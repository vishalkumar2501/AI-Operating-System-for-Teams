import { useState } from 'react';
import {
  X,
  CheckSquare,
  Paperclip,
  Trash2,
  Plus,
  Bell,
  BellOff,
  Upload,
  Link2,
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
  useProjectTasks,
} from './tasks.queries';
import {
  useAddDependency,
  useRemoveDependency,
} from '@/features/dependencies/dependencies.queries';
import { useTaskRealtime } from '@/features/realtime/useRealtime';
import { TaskCommentsSection } from '@/features/comments/TaskCommentsSection';
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
  const { viewers, typingUsers, sendTyping } = useTaskRealtime(taskId);
  const otherViewers = viewers.filter((v) => v.userId !== user?.id);

  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const createSubtask = useCreateTask(projectId);
  const addSubscriber = useAddSubscriber(taskId || '');
  const removeSubscriber = useRemoveSubscriber(taskId || '');
  const uploadAttachment = useUploadAttachment(taskId || '');
  const deleteAttachment = useDeleteAttachment(taskId || '');
  const addDependency = useAddDependency(projectId);
  const removeDependency = useRemoveDependency(projectId);
  const { data: allProjectTasks = [] } = useProjectTasks(projectId);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isAddingBlocker, setIsAddingBlocker] = useState(false);
  const [selectedBlockerId, setSelectedBlockerId] = useState('');

  const handleAddBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlockerId || !taskId) return;
    try {
      await addDependency.mutateAsync({
        taskId,
        data: { dependsOnTaskId: selectedBlockerId, type: 'BLOCKS' },
      });
      showToast('Blocker added', 'success');
      setSelectedBlockerId('');
      setIsAddingBlocker(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        'Failed to add blocker. Circular dependency detected.';
      showToast(msg, 'error');
    }
  };

  const handleRemoveBlocker = async (depId: string) => {
    if (!taskId) return;
    try {
      await removeDependency.mutateAsync({ taskId, depId });
      showToast('Blocker removed', 'success');
    } catch {
      showToast('Failed to remove blocker', 'error');
    }
  };

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
        position: 0,
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-bg/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-surface-1 border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-primary dark:text-accent">
              {task ? `${task.project.key}-${task.number}` : '...'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSubscribe}
              className="text-xs text-text-3 hover:text-text flex items-center gap-1.5"
            >
              {isSubscribed ? (
                <>
                  <BellOff className="h-3.5 w-3.5 text-primary dark:text-accent" />
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
            {otherViewers.length > 0 && (
              <div
                className="flex items-center gap-1.5 mr-2 rounded-full bg-surface-2 px-2 py-1 border border-border"
                title={`Currently viewing: ${otherViewers.map((v) => v.name).join(', ')}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-semantic-success animate-pulse" />
                <span className="text-[10px] text-text-3 font-medium hidden sm:inline">
                  Viewing:
                </span>
                <div className="flex -space-x-1.5 overflow-hidden">
                  {otherViewers.map((v) => (
                    <Avatar
                      key={v.userId}
                      name={v.name}
                      src={v.avatarUrl || undefined}
                      size="sm"
                      className="ring-2 ring-surface-1 !h-5 !w-5 text-[9px]"
                    />
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={handleDeleteTask}
              className="p-1.5 text-text-3 hover:text-semantic-danger hover:bg-surface-2 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-text-3 hover:text-text hover:bg-surface-2 rounded transition-colors"
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
                className="w-full text-xl font-bold bg-transparent border-0 text-text focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent rounded px-1 py-0.5"
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-2 border border-border text-sm">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-text-3 block mb-1">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-surface-1 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary dark:focus:border-accent"
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
                <label className="text-xs font-medium text-text-3 block mb-1">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  className="w-full bg-surface-1 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary dark:focus:border-accent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-text-3 block mb-1">Assignee</label>
                <select
                  value={task.assigneeId || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full bg-surface-1 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary dark:focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name || m.user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-text-3 block mb-1">Due Date</label>
                <input
                  type="date"
                  defaultValue={task.dueDate ? task.dueDate.split('T')[0] : ''}
                  onChange={handleDueDateChange}
                  className="w-full bg-surface-1 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary dark:focus:border-accent"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                Description
              </h4>
              <textarea
                rows={4}
                defaultValue={task.description || ''}
                placeholder="Add more details about this task..."
                onBlur={(e) => {
                  if (e.target.value !== (task.description || '')) {
                    updateTask.mutate({ id: taskId, data: { description: e.target.value } });
                  }
                }}
                className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm text-text placeholder-text-3 focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              />
            </div>

            {/* Dependencies & Blockers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-text-3" />
                  Dependencies
                </h4>
                {!isAddingBlocker && (
                  <button
                    onClick={() => setIsAddingBlocker(true)}
                    className="text-xs text-primary dark:text-accent hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Blocker
                  </button>
                )}
              </div>

              {/* Add Blocker Form */}
              {isAddingBlocker && (
                <form onSubmit={handleAddBlocker} className="flex gap-2 mb-3">
                  <select
                    value={selectedBlockerId}
                    onChange={(e) => setSelectedBlockerId(e.target.value)}
                    className="flex-1 bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary dark:focus:border-accent"
                    autoFocus
                  >
                    <option value="">Select prerequisite blocker task...</option>
                    {allProjectTasks
                      .filter(
                        (t) =>
                          t.id !== taskId &&
                          !task.dependencies?.some((d) => d.dependsOnTaskId === t.id)
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.project.key}-{t.number}: {t.title} ({t.status})
                        </option>
                      ))}
                  </select>
                  <Button type="submit" size="sm" disabled={!selectedBlockerId}>
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingBlocker(false);
                      setSelectedBlockerId('');
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              )}

              {/* Blocked By List */}
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-text-3">Blocked by:</div>
                {!task.dependencies || task.dependencies.length === 0 ? (
                  <p className="text-xs text-text-3 italic pl-1">No blocking tasks</p>
                ) : (
                  <div className="space-y-1.5">
                    {task.dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[11px] text-text-3">
                            {dep.dependsOnTask.project.key}-{dep.dependsOnTask.number}
                          </span>
                          <span className="font-medium text-text truncate">
                            {dep.dependsOnTask.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-surface-3 text-text-2 px-1.5 py-0.5 rounded">
                            {dep.dependsOnTask.status}
                          </span>
                          <button
                            onClick={() => handleRemoveBlocker(dep.id)}
                            className="text-text-3 hover:text-semantic-danger transition-colors"
                            title="Remove dependency"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blocking (Tasks waiting on this task) */}
                {task.blocking && task.blocking.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[11px] font-medium text-text-3">Blocks:</div>
                    {task.blocking.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[11px] text-text-3">
                            {b.task.project.key}-{b.task.number}
                          </span>
                          <span className="font-medium text-text truncate">{b.task.title}</span>
                        </div>
                        <span className="text-[10px] bg-surface-3 text-text-2 px-1.5 py-0.5 rounded">
                          {b.task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-text-3" />
                  Subtasks ({task.subtasks?.length ?? 0})
                </h4>
                {!isAddingSubtask && (
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="text-xs text-primary dark:text-accent hover:underline flex items-center gap-1 font-medium"
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
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border text-xs"
                  >
                    <span className="font-medium text-text">{sub.title}</span>
                    <span className="text-[10px] bg-surface-3 text-text-2 px-1.5 py-0.5 rounded">
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
                      className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text placeholder-text-3 focus:outline-none focus:border-primary dark:focus:border-accent"
                    />
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingSubtask(false)}
                    >
                      Cancel
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Subscribers */}
            <div>
              <h4 className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                Subscribers ({task.subscribers?.length ?? 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {task.subscribers?.map((sub) => (
                  <div
                    key={sub.userId}
                    className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-full px-2.5 py-1 text-xs text-text-2"
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
                <h4 className="text-xs font-semibold text-text-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-text-3" />
                  Attachments ({task.attachments?.length ?? 0})
                </h4>
                <label className="text-xs text-primary dark:text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium">
                  <Upload className="h-3.5 w-3.5" />
                  Upload File
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-1.5">
                {task.attachments?.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border text-xs"
                  >
                    <a
                      href={`http://localhost:5000${att.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary dark:text-accent hover:underline font-medium truncate max-w-xs"
                    >
                      {att.name}
                    </a>
                    <div className="flex items-center gap-3">
                      <span className="text-text-3 text-[11px]">
                        {(att.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        onClick={() => deleteAttachment.mutate(att.id)}
                        className="text-text-3 hover:text-semantic-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Realtime Comments Section */}
            <div className="border-t border-border pt-4">
              <TaskCommentsSection
                taskId={task.id}
                typingUsers={typingUsers}
                sendTyping={sendTyping}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
