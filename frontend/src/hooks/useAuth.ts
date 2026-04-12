// Hook de autenticação — acesso ao authStore com helpers

'use client';

import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    requiresPasswordChange: store.requiresPasswordChange,
    logout: store.logout,
  };
}
