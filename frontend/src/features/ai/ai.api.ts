import { apiClient } from '@/lib/api';
import { ProjectRisk, ProposedAction } from '@teamos/shared';

export interface ChatResponseData {
  runId: string;
  response: string;
  proposedActions: ProposedAction[];
  latencyMs: number;
}

export const aiApi = {
  async chat(
    workspaceId: string,
    prompt: string,
    context?: { projectId?: string; taskId?: string; meetingId?: string }
  ): Promise<ChatResponseData> {
    const res = await apiClient.post<{ success: true; data: ChatResponseData }>(
      `/workspaces/${workspaceId}/ai/chat`,
      { prompt, context }
    );
    return res.data.data;
  },

  async getRisks(workspaceId: string, projectId?: string): Promise<ProjectRisk[]> {
    const res = await apiClient.get<{ success: true; data: ProjectRisk[] }>(
      `/workspaces/${workspaceId}/ai/risks`,
      { params: { projectId } }
    );
    return res.data.data;
  },

  async approveAction(workspaceId: string, actionId: string): Promise<any> {
    const res = await apiClient.post(
      `/workspaces/${workspaceId}/ai/actions/${actionId}/approve`,
      {}
    );
    return res.data.data;
  },

  async rejectAction(workspaceId: string, actionId: string): Promise<any> {
    const res = await apiClient.post(
      `/workspaces/${workspaceId}/ai/actions/${actionId}/reject`,
      {}
    );
    return res.data.data;
  },
};
