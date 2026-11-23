import { apiClient } from '@/lib/api';
import { DocItem, CreateDocDto, UpdateDocDto } from '@teamos/shared';

export const docsApi = {
  async getDocs(workspaceId: string, projectId?: string): Promise<DocItem[]> {
    const res = await apiClient.get<{ success: true; data: DocItem[] }>(
      `/workspaces/${workspaceId}/docs`,
      { params: { projectId } }
    );
    return res.data.data;
  },

  async getDoc(workspaceId: string, docId: string): Promise<DocItem> {
    const res = await apiClient.get<{ success: true; data: DocItem }>(
      `/workspaces/${workspaceId}/docs/${docId}`
    );
    return res.data.data;
  },

  async createDoc(workspaceId: string, dto: CreateDocDto): Promise<DocItem> {
    const res = await apiClient.post<{ success: true; data: DocItem }>(
      `/workspaces/${workspaceId}/docs`,
      dto
    );
    return res.data.data;
  },

  async updateDoc(workspaceId: string, docId: string, dto: UpdateDocDto): Promise<DocItem> {
    const res = await apiClient.patch<{ success: true; data: DocItem }>(
      `/workspaces/${workspaceId}/docs/${docId}`,
      dto
    );
    return res.data.data;
  },

  async deleteDoc(workspaceId: string, docId: string): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}/docs/${docId}`);
  },
};
