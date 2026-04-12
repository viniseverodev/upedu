// TopBar — seletor de filial ativa — S008

'use client';

import { FilialSelector } from '@/components/common/FilialSelector';
import { useAuthStore } from '@/stores/authStore';

export function TopBar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
      <FilialSelector />
      {user && (
        <span className="text-sm text-gray-500">
          {user.nome} · <span className="text-gray-400">{user.role}</span>
        </span>
      )}
    </header>
  );
}
