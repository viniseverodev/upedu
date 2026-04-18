'use client';

// Providers client-side — TanStack Query
// QueryClient criado via useState para garantir instância isolada por request no SSR
// Padrão oficial: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFilialStore } from '@/stores/filialStore';
import { useSidebarStore } from '@/stores/sidebarStore';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });
}

// Singleton do browser — evita recriar a cada re-render
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // No servidor: sempre nova instância para isolar requests
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  // Reidrata os stores Zustand no cliente (skipHydration=true nos stores).
  // useEffect garante que roda apenas no cliente, após o SSR, evitando
  // hydration mismatch entre servidor e cliente.
  useEffect(() => {
    useAuthStore.persist.rehydrate();
    useFilialStore.persist.rehydrate();
    useSidebarStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
