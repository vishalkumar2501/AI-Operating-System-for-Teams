import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProjectSchema, type CreateProjectDto } from '@teamos/shared';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateProject } from './projects.queries';
import { useToast } from '@/components/ui/Toast';

interface CreateProjectModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ workspaceId, isOpen, onClose }: CreateProjectModalProps) {
  const { showToast } = useToast();
  const createProject = useCreateProject(workspaceId);
  const [autoKey, setAutoKey] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectDto>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      startDate: null,
      targetDate: null,
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (autoKey && name) {
      // Auto-suggest uppercase 3-4 letter key from project name words
      const words = name.trim().split(/\s+/);
      let suggestedKey = '';
      if (words.length === 1) {
        suggestedKey = words[0]?.slice(0, 3).toUpperCase() ?? 'PRJ';
      } else {
        suggestedKey = words
          .slice(0, 4)
          .map((w) => w[0])
          .join('')
          .toUpperCase();
      }
      setValue('key', suggestedKey.replace(/[^A-Z0-9]/g, ''));
    }
  };

  const onSubmit = async (data: CreateProjectDto) => {
    try {
      await createProject.mutateAsync(data);
      showToast('Project created successfully', 'success');
      reset();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create project', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Project Name"
          placeholder="e.g. Mobile App Redesign"
          error={errors.name?.message}
          {...register('name', {
            onChange: handleNameChange,
          })}
        />

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Project Key"
              placeholder="e.g. MOB"
              hint="Used as prefix for tasks (e.g. MOB-1, MOB-2)"
              error={errors.key?.message}
              {...register('key', {
                onChange: () => setAutoKey(false),
              })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">
            Description (optional)
          </label>
          <textarea
            rows={3}
            placeholder="What is this project about?"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            {...register('description')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createProject.isPending}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
