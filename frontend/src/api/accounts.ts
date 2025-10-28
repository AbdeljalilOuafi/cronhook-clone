import apiClient from '@/lib/api-client';
import type { Account, PaginatedResponse } from '@/types';

export const accountsApi = {
  /**
   * Get all accounts (superuser only)
   */
  getAll: async (): Promise<Account[]> => {
    const response = await apiClient.get<PaginatedResponse<Account>>('/accounts/');
    return response.data.results;
  },

  /**
   * Get account by ID (superuser only)
   */
  getById: async (id: number): Promise<Account> => {
    const response = await apiClient.get<Account>(`/accounts/${id}/`);
    return response.data;
  },
};
