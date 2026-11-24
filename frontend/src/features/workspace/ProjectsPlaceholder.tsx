import { FolderKanban } from 'lucide-react';

export function ProjectsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FolderKanban className="h-10 w-10 text-text-3 mb-3" />
      <h2 className="text-lg font-semibold text-text">Projects</h2>
      <p className="mt-1 text-sm text-text-3">Projects feature coming in Phase 2.</p>
    </div>
  );
}
