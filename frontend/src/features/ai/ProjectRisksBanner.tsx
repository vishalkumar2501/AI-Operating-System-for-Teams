import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { aiApi } from './ai.api';

interface ProjectRisksBannerProps {
  workspaceId: string;
  projectId?: string;
  onOpenAiAssistant?: (prompt?: string) => void;
}

export function ProjectRisksBanner({
  workspaceId,
  projectId,
  onOpenAiAssistant,
}: ProjectRisksBannerProps) {
  const { data: risks } = useQuery({
    queryKey: ['risks', workspaceId, projectId],
    queryFn: () => aiApi.getRisks(workspaceId, projectId),
    enabled: !!workspaceId,
    refetchInterval: 30000, // Poll every 30s
  });

  if (!risks || risks.length === 0) return null;

  const highRisks = risks.filter((r) => r.severity === 'HIGH');

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-300">
              AI Risk Engine Detected {risks.length} Bottleneck(s)
            </h4>
            <p className="text-xs text-amber-400/80">
              {highRisks.length} high severity risks requiring team attention.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            onOpenAiAssistant?.('Scan and propose resolutions for project bottlenecks and risks')
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Resolve with AI Assistant
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {risks.slice(0, 3).map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between text-xs rounded-lg bg-slate-950/40 p-2.5 border border-amber-500/10"
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                    r.severity === 'HIGH'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                  }`}
                >
                  {r.severity}
                </span>
                <span className="font-semibold text-white">{r.title}</span>
              </div>
              <p className="text-slate-400 text-[11px]">{r.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
