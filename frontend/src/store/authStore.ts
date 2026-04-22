import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IUser } from '../types';

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: IUser, token: string) => void;
  updateUser: (user: Partial<IUser>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },
      updateUser: (partial) =>
        set(s => ({ user: s.user ? { ...s.user, ...partial } : null })),
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    { name: 'verifact-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }) }
  )
);
