'use client';

import { FilialSelector } from '@/components/common/FilialSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_MATRIZ: 'Admin Matriz',
  GERENTE_FILIAL: 'Gerente de Filial',
  ATENDENTE: 'Atendente',
  PROFESSOR: 'Professor',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDateLong() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const initials = user?.nome
    ? user.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Left — saudação */}
      <div className="min-w-0">
        {user && (
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
            {getGreeting()}, {user.nome.split(' ')[0]}!{' '}
            <span className="hidden font-normal text-gray-400 dark:text-slate-500 sm:inline">
              · {formatDateLong()}
            </span>
          </p>
        )}
      </div>

      {/* Right — filial, tema, avatar */}
      <div className="flex shrink-0 items-center gap-2">
        <FilialSelector />

        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-slate-700" />

        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-gray-900 dark:text-slate-100">
                {user.nome.split(' ')[0]}
              </p>
              <p className="text-[11px] leading-tight text-gray-400 dark:text-slate-500">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
