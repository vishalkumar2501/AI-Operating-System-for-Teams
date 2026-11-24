import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Calendar, CheckSquare, Search } from 'lucide-react';
import { useProjects } from './projects.queries';
import { CreateProjectModal } from './CreateProjectModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export function ProjectsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading } = useProjects(workspaceId);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Projects</h1>
          <p className="text-sm text-text-2 mt-0.5">
            Manage your workspace projects, task roadmaps, and team deliverables.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
        <input
          type="text"
          placeholder="Search projects by name or key..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-surface-1">
          <FolderKanban className="h-10 w-10 text-text-3 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-text">No projects found</h3>
          <p className="text-sm text-text-3 mt-1 max-w-sm mx-auto">
            {search
              ? 'Try clearing your search query'
              : 'Get started by creating your first project to organize tasks.'}
          </p>
          {!search && (
            <Button onClick={() => setIsModalOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/workspaces/${workspaceId}/projects/${project.id}`)}
              className="p-5 bg-surface-1 border border-border rounded-xl hover:border-accent hover:bg-surface-2 transition-all cursor-pointer group shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="accent" className="font-mono text-xs">
                    {project.key}
                  </Badge>
                  <span className="text-xs text-text-3 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-text group-hover:text-accent transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-text-3 mt-1 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-text-3">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-text-3" />
                  {project._count?.tasks ?? 0} active tasks
                </span>
                <span className="text-accent font-medium group-hover:translate-x-0.5 transition-transform">
                  Open board &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceId && (
        <CreateProjectModal
          workspaceId={workspaceId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
export default ProjectsPage;
