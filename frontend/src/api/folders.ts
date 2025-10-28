import apiClient from '@/lib/api-client';
import type { WebhookFolder, CreateFolderRequest, UpdateFolderRequest } from '@/types';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const foldersApi = {
  getAll: async (filters?: { account?: number }): Promise<WebhookFolder[]> => {
    const params = new URLSearchParams();
    if (filters?.account !== undefined) {
      params.append('account', filters.account.toString());
    }
    const queryString = params.toString();
    const url = queryString ? `/folders/?${queryString}` : '/folders/';
    const response = await apiClient.get<PaginatedResponse<WebhookFolder>>(url);
    return response.data.results;
  },

  getById: async (id: number): Promise<WebhookFolder> => {
    const response = await apiClient.get<WebhookFolder>(`/folders/${id}/`);
    return response.data;
  },

  create: async (folder: CreateFolderRequest): Promise<WebhookFolder> => {
    const response = await apiClient.post<WebhookFolder>('/folders/', folder);
    return response.data;
  },

  update: async (id: number, folder: UpdateFolderRequest): Promise<WebhookFolder> => {
    const response = await apiClient.patch<WebhookFolder>(`/folders/${id}/`, folder);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/folders/${id}/`);
  },

  moveWebhooks: async (folderId: number, webhookIds: number[]): Promise<{ detail: string; count: number }> => {
    const response = await apiClient.post(`/folders/${folderId}/move_webhooks/`, {
      webhook_ids: webhookIds,
    });
    return response.data;
  },

  getStats: async (folderId: number): Promise<any> => {
    const response = await apiClient.get(`/folders/${folderId}/stats/`);
    return response.data;
  },
};

export default foldersApi;
