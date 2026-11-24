import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, CheckSquare, FileText, Video, MessageSquare, ArrowRight } from 'lucide-react';
import { searchApi } from './search.api';
import { Spinner } from '@/components/ui';

interface SearchModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ workspaceId, isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Global Ctrl+K / Cmd+K listener handled by parent or here
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', workspaceId, debouncedQuery],
    queryFn: () => searchApi.hybridSearch(workspaceId, { q: debouncedQuery, limit: 15 }),
    enabled: isOpen && debouncedQuery.length > 0,
  });

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK':
        return <CheckSquare className="h-4 w-4 text-primary dark:text-accent shrink-0" />;
      case 'DOC':
        return <FileText className="h-4 w-4 text-semantic-success shrink-0" />;
      case 'TRANSCRIPT':
        return <Video className="h-4 w-4 text-primary dark:text-accent shrink-0" />;
      default:
        return <MessageSquare className="h-4 w-4 text-semantic-warning shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-bg/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-surface-1 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="h-5 w-5 text-text-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, documents, transcripts, and comments (Hybrid RRF)..."
            className="flex-1 bg-transparent text-sm text-text placeholder-text-3 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-text-3 hover:text-text p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[10px] font-mono text-text-3 bg-surface-2 px-1.5 py-0.5 rounded border border-border">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="py-12 flex items-center justify-center">
              <Spinner className="h-6 w-6 text-primary dark:text-accent" />
            </div>
          )}

          {!isLoading && debouncedQuery && results?.length === 0 && (
            <div className="py-12 text-center text-sm text-text-3">
              No results found for "{debouncedQuery}"
            </div>
          )}

          {!debouncedQuery && (
            <div className="py-10 text-center text-xs text-text-3">
              Type keywords to search across tickets, design docs, and meeting discussions.
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelect(r.url)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{getIcon(r.entityType)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text group-hover:text-primary dark:group-hover:text-accent transition-colors truncate">
                          {r.title}
                        </span>
                        <span className="rounded bg-surface-2 border border-border px-1.5 py-0.2 text-[9px] font-bold text-text-3 uppercase">
                          {r.entityType}
                        </span>
                      </div>
                      <p className="text-xs text-text-3 truncate mt-0.5 max-w-md">{r.snippet}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-text-3 bg-surface-2 px-1.5 py-0.5 rounded border border-border/50">
                      RRF: {r.score}
                    </span>
                    <ArrowRight className="h-4 w-4 text-text-3 group-hover:text-primary dark:group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-surface-2 border-t border-border text-[11px] text-text-3 flex items-center justify-between">
          <span>Powered by Postgres FTS + pgvector Cosine Distance</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
}
