import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
      },
      isAuthenticated: () => {
        return !!get().token;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
