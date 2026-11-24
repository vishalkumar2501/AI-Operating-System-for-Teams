import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTaskSchema, type CreateTaskDto } from '@teamos/shared';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateTask } from './tasks.queries';
import { useWorkspaceMembers } from '@/features/workspace/workspace.queries';
import { useToast } from '@/components/ui/Toast';

interface CreateTaskModalProps {
  workspaceId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: string;
}

export function CreateTaskModal({
  workspaceId,
  projectId,
  isOpen,
  onClose,
  defaultStatus = 'TODO',
}: CreateTaskModalProps) {
  const { showToast } = useToast();
  const createTask = useCreateTask(projectId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskDto>({
    resolver: zodResolver(CreateTaskSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus as any,
      priority: 'MEDIUM',
      assigneeId: null,
      estimate: null,
      dueDate: null,
    },
  });

  const onSubmit = async (data: CreateTaskDto) => {
    try {
      await createTask.mutateAsync(data);
      showToast('Task created successfully', 'success');
      reset();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create task', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Task Title"
          placeholder="e.g. Implement user invite acceptance flow"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Status</label>
            <select
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              {...register('status')}
            >
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Priority</label>
            <select
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              {...register('priority')}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Assignee</label>
            <select
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              {...register('assigneeId')}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name || m.user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">
              Estimate (hours)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 4"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder-text-3 focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              {...register('estimate', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">
            Description (optional)
          </label>
          <textarea
            rows={3}
            placeholder="Detailed task description..."
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder-text-3 focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
            {...register('description')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createTask.isPending}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
