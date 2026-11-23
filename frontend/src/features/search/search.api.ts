import { apiClient } from '@/lib/api';
import { SearchResultItem } from '@teamos/shared';

export const searchApi = {
  async hybridSearch(
    workspaceId: string,
    params: { q: string; entityTypes?: string[]; limit?: number }
  ): Promise<SearchResultItem[]> {
    const res = await apiClient.get<{ success: true; data: SearchResultItem[] }>(
      `/workspaces/${workspaceId}/search`,
      { params }
    );
    return res.data.data;
  },
};
