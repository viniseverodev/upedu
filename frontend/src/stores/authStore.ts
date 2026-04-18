// authStore — Zustand — ADR-006
// Estado de autenticação: user, accessToken, isAuthenticated
// TanStack Query gerencia cache de servidor; este store apenas estado de sessão

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  filiais: Array<{ filialId: string }>;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  setAuth: (user: User, accessToken: string, requiresPasswordChange?: boolean) => void;
  setAccessToken: (token: string) => void;
  updateUser: (data: Partial<Pick<User, 'nome' | 'email'>>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      requiresPasswordChange: false,

      setAuth: (user, accessToken, requiresPasswordChange = false) =>
        set({ user, accessToken, isAuthenticated: true, requiresPasswordChange }),

      setAccessToken: (accessToken) => set({ accessToken }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, requiresPasswordChange: false }),
    }),
    {
      name: 'upedu-auth',
      // Persistir user e isAuthenticated; accessToken não é persistido (renovado via refresh)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      skipHydration: true, // evita mismatch SSR/cliente no Next.js App Router
    }
  )
);
