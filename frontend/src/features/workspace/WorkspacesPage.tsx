import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { useWorkspaces } from './workspace.queries';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { Button, Spinner } from '@/components/ui';
import type { Workspace } from './workspace.queries';

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/workspaces/${workspace.id}`)}
      className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition-all hover:border-slate-700 hover:bg-slate-800/60 w-full"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
        <Building2 className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-100 truncate">{workspace.name}</p>
        <p className="text-sm text-slate-500 truncate">{workspace.slug}</p>
      </div>
    </button>
  );
}

export function WorkspacesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: workspaces, isLoading, isError } = useWorkspaces();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm">
              T
            </div>
            <span className="text-lg font-semibold text-slate-100">TeamOS</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Your workspaces</h1>
            <p className="mt-1 text-sm text-slate-400">
              Select a workspace to continue or create a new one.
            </p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            New workspace
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">Failed to load workspaces. Please refresh.</p>
          </div>
        )}

        {!isLoading && !isError && workspaces && workspaces.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-20 text-center">
            <Building2 className="h-10 w-10 text-slate-700 mb-3" />
            <p className="text-slate-400 font-medium">No workspaces yet</p>
            <p className="text-sm text-slate-600 mt-1 mb-5">Create one to get started</p>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Create workspace
            </Button>
          </div>
        )}

        {workspaces && workspaces.length > 0 && (
          <div className="flex flex-col gap-3">
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} />
            ))}
          </div>
        )}
      </main>

      <CreateWorkspaceModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
