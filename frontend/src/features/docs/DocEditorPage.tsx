import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, FolderKanban, Eye, Edit3, Columns, Trash2 } from 'lucide-react';
import { docsApi } from './docs.api';
import { useProjects } from '../projects/projects.queries';
import { Spinner } from '@/components/ui';

export function DocEditorPage() {
  const { workspaceId, docId } = useParams<{ workspaceId: string; docId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [isSaved, setIsSaved] = useState(true);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['doc', workspaceId, docId],
    queryFn: () => docsApi.getDoc(workspaceId!, docId!),
    enabled: !!workspaceId && !!docId,
  });

  const { data: projects } = useProjects(workspaceId);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setProjectId(doc.projectId || '');
    }
  }, [doc]);

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; content?: string; projectId?: string | null }) =>
      docsApi.updateDoc(workspaceId!, docId!, data),
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['docs', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['doc', workspaceId, docId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => docsApi.deleteDoc(workspaceId!, docId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', workspaceId] });
      navigate(`/workspaces/${workspaceId}/docs`);
    },
  });

  // Debounced auto-save on content change
  useEffect(() => {
    if (!doc) return;
    if (title === doc.title && content === doc.content && projectId === (doc.projectId || '')) {
      return;
    }

    setIsSaved(false);
    const timer = setTimeout(() => {
      updateMutation.mutate({
        title,
        content,
        projectId: projectId || null,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, projectId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <Spinner className="h-8 w-8 text-primary dark:text-accent" />
      </div>
    );
  }

  if (!doc) {
    return <div className="p-8 text-center bg-bg text-text-3">Document not found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg text-text overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-surface-1 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/docs`)}
            className="inline-flex items-center gap-1.5 text-xs text-text-3 hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Docs
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title"
            className="flex-1 bg-transparent text-lg font-bold text-text focus:outline-none max-w-lg border-b border-transparent focus:border-primary dark:focus:border-accent px-1 py-0.5 transition-colors"
          />

          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-text-3" />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded bg-surface-2 border border-border px-2 py-1 text-xs text-text focus:outline-none transition-colors"
            >
              <option value="">No Project</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status indicator */}
          <div className="text-xs text-text-3 flex items-center gap-1">
            {updateMutation.isPending ? (
              <>
                <Spinner className="h-3 w-3" />
                <span>Saving...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-semantic-success" />
                <span>Saved</span>
              </>
            ) : (
              <span>Unsaved changes</span>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-surface-2 border border-border p-0.5 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'edit' ? 'bg-surface-3 text-text font-semibold shadow-sm' : 'text-text-3 hover:text-text'}`}
              title="Edit Only"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'split' ? 'bg-surface-3 text-text font-semibold shadow-sm' : 'text-text-3 hover:text-text'}`}
              title="Split View"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'preview' ? 'bg-surface-3 text-text font-semibold shadow-sm' : 'text-text-3 hover:text-text'}`}
              title="Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm('Delete this document?')) {
                deleteMutation.mutate();
              }
            }}
            className="p-1.5 rounded text-text-3 hover:text-semantic-danger hover:bg-surface-2 transition-colors"
            title="Delete Doc"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`flex-1 flex flex-col h-full border-r border-border bg-bg p-6 overflow-hidden`}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write Markdown or design specs here..."
              className="w-full h-full resize-none bg-transparent font-mono text-sm text-text placeholder-text-3 focus:outline-none leading-relaxed"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 h-full overflow-y-auto p-8 bg-surface-1 prose prose-invert max-w-none">
            <div className="space-y-4">
              {content.split('\n\n').map((block, idx) => {
                if (block.startsWith('# ')) {
                  return (
                    <h1 key={idx} className="text-2xl font-bold text-text">
                      {block.replace('# ', '')}
                    </h1>
                  );
                }
                if (block.startsWith('## ')) {
                  return (
                    <h2 key={idx} className="text-xl font-semibold text-text">
                      {block.replace('## ', '')}
                    </h2>
                  );
                }
                if (block.startsWith('### ')) {
                  return (
                    <h3 key={idx} className="text-lg font-medium text-text-2">
                      {block.replace('### ', '')}
                    </h3>
                  );
                }
                if (block.startsWith('- ')) {
                  const items = block.split('\n').map((line) => line.replace('- ', ''));
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1 text-sm text-text-2">
                      {items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={idx} className="text-sm text-text-2 leading-relaxed whitespace-pre-wrap">
                    {block}
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
