import { FolderKanban } from 'lucide-react';

export function ProjectsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FolderKanban className="h-10 w-10 text-slate-700 mb-3" />
      <h2 className="text-lg font-semibold text-slate-300">Projects</h2>
      <p className="mt-1 text-sm text-slate-500">Projects feature coming in Phase 2.</p>
    </div>
  );
}
