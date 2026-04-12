// TanStack Query defaults — ADR-006
// O QueryClient é instanciado no Providers (providers.tsx) para garantir
// isolamento por request no SSR. Este arquivo exporta apenas os defaults reutilizáveis.

export const queryClientDefaults = {
  queries: {
    staleTime: 1000 * 60 * 2,        // 2 min — dados considerados frescos
    gcTime: 1000 * 60 * 10,           // 10 min — manter em cache
    retry: 1 as const,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0 as const,
  },
};
