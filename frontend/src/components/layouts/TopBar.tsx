'use client';

import { FilialSelector } from '@/components/common/FilialSelector';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDateLong() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.nome.split(' ')[0] ?? '';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200/70 bg-white px-6 dark:border-white/[0.06] dark:bg-[#0b0e14]">
      {/* Left — saudação */}
      <div className="min-w-0">
        {user && (
          <p className="truncate text-sm text-stone-500 dark:text-slate-500">
            {getGreeting()},{' '}
            <span className="font-semibold text-stone-900 dark:text-slate-100">{firstName}</span>
            <span className="hidden text-stone-400 dark:text-slate-600 sm:inline">
              {' '}·{' '}{formatDateLong()}
            </span>
          </p>
        )}
      </div>

      {/* Right */}
      <div className="flex shrink-0 items-center gap-2">
        <FilialSelector />
        <div className="mx-1 h-4 w-px bg-stone-200 dark:bg-white/[0.08]" />
        <ThemeToggle />
      </div>
    </header>
  );
}
