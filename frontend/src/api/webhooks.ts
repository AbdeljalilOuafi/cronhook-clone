import apiClient from '@/lib/api-client';
import type {
  Webhook,
  WebhookExecution,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  PaginatedResponse,
} from '@/types';

export const webhooksApi = {
  getAll: async (): Promise<Webhook[]> => {
    const response = await apiClient.get<PaginatedResponse<Webhook>>('/webhooks/');
    return response.data.results;
  },

  getById: async (id: number): Promise<Webhook> => {
    const response = await apiClient.get<Webhook>(`/webhooks/${id}/`);
    return response.data;
  },

  create: async (data: CreateWebhookRequest): Promise<Webhook> => {
    const response = await apiClient.post<Webhook>('/webhooks/', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWebhookRequest): Promise<Webhook> => {
    const response = await apiClient.patch<Webhook>(`/webhooks/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/webhooks/${id}/`);
  },

  cancel: async (id: number): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(`/webhooks/${id}/cancel/`);
    return response.data;
  },

  activate: async (id: number): Promise<{ detail: string }> => {
    const response = await apiClient.post<{ detail: string }>(`/webhooks/${id}/activate/`);
    return response.data;
  },

  getExecutions: async (webhookId: number): Promise<WebhookExecution[]> => {
    const response = await apiClient.get<PaginatedResponse<WebhookExecution>>(
      `/webhooks/${webhookId}/executions/`
    );
    return response.data.results;
  },
};
