import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Calendar, FolderKanban, Trash2 } from 'lucide-react';
import { docsApi } from './docs.api';
import { useProjects } from '../projects/projects.queries';
import { Avatar, Spinner } from '@/components/ui';

export function DocsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs', workspaceId, selectedProjectId],
    queryFn: () => docsApi.getDocs(workspaceId!, selectedProjectId || undefined),
    enabled: !!workspaceId,
  });

  const { data: projects } = useProjects(workspaceId);

  const createMutation = useMutation({
    mutationFn: () =>
      docsApi.createDoc(workspaceId!, {
        title: 'Untitled Document',
        content: '# Untitled Document\n\nStart writing here...',
        projectId: selectedProjectId || null,
      }),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['docs', workspaceId] });
      navigate(`/workspaces/${workspaceId}/docs/${newDoc.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => docsApi.deleteDoc(workspaceId!, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', workspaceId] });
    },
  });

  const filteredDocs = docs?.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-400" />
            Documents & Knowledge Base
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Collaborative team specifications, meeting notes, and engineering documentation.
          </p>
        </div>

        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {createMutation.isPending ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          New Document
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title or content..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Docs Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-500" />
        </div>
      ) : !filteredDocs || filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/40">
          <FileText className="h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-white">No documents found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            Create project blueprints, API docs, and architecture decisions for your team.
          </p>
          <button
            onClick={() => createMutation.mutate()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Create First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const updatedDate = new Date(doc.updatedAt);
            const previewText = doc.content
              .replace(/#+\s+/g, '')
              .replace(/[*_`]/g, '')
              .slice(0, 120);

            return (
              <div
                key={doc.id}
                onClick={() => navigate(`/workspaces/${workspaceId}/docs/${doc.id}`)}
                className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm hover:border-slate-700 transition-all hover:shadow-md cursor-pointer relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {doc.project ? (
                      <span className="rounded bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 text-xs font-semibold text-indigo-300 flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" />
                        [{doc.project.key}]
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Workspace Doc</span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this document?')) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {previewText || 'Empty document'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Avatar
                      name={doc.author.name}
                      src={doc.author.avatarUrl}
                      className="h-5 w-5 text-[9px]"
                    />
                    <span className="truncate max-w-[100px]">{doc.author.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{updatedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
