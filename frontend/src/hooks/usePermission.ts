// Hook de permissão por role — STORY-005 (RBAC)
// Uso: const canCreate = usePermission('ADMIN_MATRIZ')

'use client';

import { useAuthStore } from '@/stores/authStore';

type UserRole = 'SUPER_ADMIN' | 'ADMIN_MATRIZ' | 'GERENTE_FILIAL' | 'ATENDENTE' | 'PROFESSOR';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN_MATRIZ: 4,
  GERENTE_FILIAL: 3,
  ATENDENTE: 2,
  PROFESSOR: 1,
};

export function usePermission(requiredRole: UserRole): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  const userLevel = ROLE_HIERARCHY[user.role as UserRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

export function useRole(): UserRole | null {
  return useAuthStore((s) => s.user?.role as UserRole ?? null);
}
