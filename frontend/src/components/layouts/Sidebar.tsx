// Sidebar — S005: menus renderizados condicionalmente por role
// usePermission() determina quais itens são visíveis para cada usuário

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import { useSidebarStore } from '@/stores/sidebarStore';
import api from '@/lib/api';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: clearAuth } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();

  // S005: permissões por hierarquia de role
  const canManageUsers = usePermission('ADMIN_MATRIZ');
  const canManageFiliais = usePermission('ADMIN_MATRIZ');
  const canViewFinanceiro = usePermission('GERENTE_FILIAL');
  const canViewAuditoria = usePermission('ADMIN_MATRIZ');
  const canViewRelatorios = usePermission('GERENTE_FILIAL');

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearAuth();
      router.push('/login');
    },
  });

  const navItems: (NavItem & { visible: boolean })[] = [
    { label: 'Dashboard', href: '/kpis', icon: '📊', visible: true },
    { label: 'Alunos', href: '/alunos', icon: '🎓', visible: true },
    { label: 'Responsáveis', href: '/responsaveis', icon: '👨‍👩‍👧', visible: true },
    { label: 'Matrículas', href: '/matriculas', icon: '📋', visible: true },
    { label: 'Mensalidades', href: '/financeiro/mensalidades', icon: '💰', visible: canViewFinanceiro },
    { label: 'Transações', href: '/financeiro/transacoes', icon: '💳', visible: canViewFinanceiro },
    { label: 'Relatórios', href: '/relatorios', icon: '📈', visible: canViewRelatorios },
    { label: 'Filiais', href: '/filiais', icon: '🏫', visible: canManageFiliais },
    { label: 'Usuários', href: '/usuarios', icon: '👥', visible: canManageUsers },
    { label: 'Auditoria', href: '/auditoria', icon: '🔍', visible: canViewAuditoria },
  ].filter((item) => item.visible);

  return (
    <aside
      className={`flex h-full flex-col bg-gray-900 text-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        {!collapsed && <span className="text-lg font-bold">UpEdu</span>}
        <button
          onClick={toggle}
          className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navItems.map(({ label, href, icon }) => {
            const isActive = pathname != null && (pathname === href || pathname.startsWith(`${href}/`));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  title={collapsed ? label : undefined}
                >
                  <span className="text-base">{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: usuário + logout */}
      <div className="border-t border-gray-700 p-4">
        {!collapsed && user && (
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-white">{user.nome}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
          title={collapsed ? 'Sair' : undefined}
        >
          <span>🚪</span>
          {!collapsed && <span>{logoutMutation.isPending ? 'Saindo…' : 'Sair'}</span>}
        </button>
      </div>
    </aside>
  );
}
