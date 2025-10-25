import apiClient from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    console.log('Login attempt with credentials:', credentials);
    console.log('Sending POST to: /auth/token/');
    const response = await apiClient.post<LoginResponse>('/auth/token/', credentials);
    console.log('Login response:', response);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
};
