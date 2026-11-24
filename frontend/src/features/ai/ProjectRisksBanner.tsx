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
    <div className="mb-6 rounded-xl border border-semantic-warning-border bg-semantic-warning-subtle p-4 text-text shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-semantic-warning-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-1 text-semantic-warning border border-semantic-warning-border">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">
              AI Risk Engine Detected {risks.length} Bottleneck(s)
            </h4>
            <p className="text-xs text-text-2">
              {highRisks.length} high severity risks requiring team attention.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            onOpenAiAssistant?.('Scan and propose resolutions for project bottlenecks and risks')
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 border border-semantic-warning-border px-3 py-1.5 text-xs font-semibold text-semantic-warning transition-colors shadow-sm"
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
            className="flex items-start justify-between text-xs rounded-lg bg-surface-1 p-2.5 border border-border"
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    r.severity === 'HIGH'
                      ? 'bg-semantic-danger-subtle text-semantic-danger border border-semantic-danger-border'
                      : 'bg-semantic-warning-subtle text-semantic-warning border border-semantic-warning-border'
                  }`}
                >
                  {r.severity}
                </span>
                <span className="font-semibold text-text">{r.title}</span>
              </div>
              <p className="text-text-3 text-[11px]">{r.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ProjectRisksBanner;
