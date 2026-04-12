// Hook de filial ativa — acesso ao filialStore com invalidação de cache

'use client';

import { useFilialStore } from '@/stores/filialStore';
import { useQueryClient } from '@tanstack/react-query';

export function useFilial() {
  const store = useFilialStore();
  const queryClient = useQueryClient();

  function setActiveFilial(filial: { id: string; nome: string }) {
    store.setActiveFilial(filial);
    // Invalidar todo o cache ao trocar de filial — STORY-008
    queryClient.invalidateQueries();
  }

  return {
    activeFilialId: store.activeFilialId,
    activeFilial: store.activeFilial,
    setActiveFilial,
  };
}
