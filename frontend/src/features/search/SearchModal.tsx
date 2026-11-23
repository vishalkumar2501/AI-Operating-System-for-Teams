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
        return <CheckSquare className="h-4 w-4 text-blue-400 shrink-0" />;
      case 'DOC':
        return <FileText className="h-4 w-4 text-emerald-400 shrink-0" />;
      case 'TRANSCRIPT':
        return <Video className="h-4 w-4 text-purple-400 shrink-0" />;
      default:
        return <MessageSquare className="h-4 w-4 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, documents, transcripts, and comments (Hybrid RRF)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="py-12 flex items-center justify-center">
              <Spinner className="h-6 w-6 text-indigo-500" />
            </div>
          )}

          {!isLoading && debouncedQuery && results?.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              No results found for "{debouncedQuery}"
            </div>
          )}

          {!debouncedQuery && (
            <div className="py-10 text-center text-xs text-slate-500">
              Type keywords to search across tickets, design docs, and meeting discussions.
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelect(r.url)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{getIcon(r.entityType)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                          {r.title}
                        </span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[9px] font-bold text-slate-400 uppercase">
                          {r.entityType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5 max-w-md">{r.snippet}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded">
                      RRF: {r.score}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Powered by Postgres FTS + pgvector Cosine Distance</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
