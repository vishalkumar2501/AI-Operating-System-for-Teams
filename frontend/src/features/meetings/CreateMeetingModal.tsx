import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Video, FolderKanban } from 'lucide-react';
import { meetingApi } from './meeting.api';
import { useProjects } from '../projects/projects.queries';
import { Spinner } from '@/components/ui';

interface CreateMeetingModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMeetingModal({ workspaceId, isOpen, onClose }: CreateMeetingModalProps) {
  const queryClient = useQueryClient();

  // Load projects to allow linking meeting to a project
  const { data: projects } = useProjects(isOpen ? workspaceId : undefined);

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 30 * 60 * 1000).toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 90 * 60 * 1000).toISOString().slice(0, 16);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState(defaultEnd);
  const [projectId, setProjectId] = useState<string>('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      meetingApi.createMeeting(workspaceId, {
        title,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        projectId: projectId || null,
        meetingUrl: meetingUrl || null,
        participantIds: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['calendar', workspaceId] });
      onClose();
      setTitle('');
      setDescription('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || 'Failed to create meeting');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting title is required');
      return;
    }
    setError(null);
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-3 hover:text-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
          <Video className="h-5 w-5 text-primary dark:text-accent" />
          Schedule New Meeting
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-semantic-danger/10 border border-semantic-danger/20 p-3 text-sm text-semantic-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-3 mb-1">Meeting Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Architecture Sync"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder-text-3 focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-3 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-3 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> End Time *
              </label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-3 mb-1 flex items-center gap-1">
              <FolderKanban className="h-3.5 w-3.5" /> Project (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
            >
              <option value="">No Project Linked</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-3 mb-1">
              Meeting Link (URL)
            </label>
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder-text-3 focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-3 mb-1">
              Agenda / Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key discussion topics, goals..."
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder-text-3 focus:border-primary dark:focus:border-accent focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-2 hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary dark:bg-accent px-4 py-2 text-sm font-semibold text-on-primary dark:text-on-accent hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {createMutation.isPending && <Spinner className="h-4 w-4" />}
              Schedule Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
