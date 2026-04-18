'use client';

import { FilialSelector } from '@/components/common/FilialSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite'; // 18h–4h59
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
      </div>
    </header>
  );
}
