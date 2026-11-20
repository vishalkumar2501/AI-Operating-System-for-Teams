import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateWorkspace } from './workspace.queries';
import { Modal, Input, Button, useToast } from '@/components/ui';
import { AxiosError } from 'axios';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers, and hyphens only'),
});

type FormValues = z.infer<typeof schema>;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createWorkspace = useCreateWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const nameValue = watch('name', '');

  // Auto-generate slug from name
  useEffect(() => {
    setValue('slug', toSlug(nameValue));
  }, [nameValue, setValue]);

  const onClose_ = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const ws = await createWorkspace.mutateAsync(data);
      toast(`Workspace "${ws.name}" created!`, 'success');
      onClose_();
      navigate(`/workspaces/${ws.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      const msg = axiosErr.response?.data?.error?.message ?? 'Failed to create workspace.';
      toast(msg, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose_} title="Create workspace" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Workspace name"
          placeholder="Acme Corporation"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Slug"
          placeholder="acme-corporation"
          hint={`teamos.app/${watch('slug') || 'your-workspace'}`}
          error={errors.slug?.message}
          {...register('slug')}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose_}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={createWorkspace.isPending}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
