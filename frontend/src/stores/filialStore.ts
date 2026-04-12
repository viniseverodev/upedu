// filialStore — Zustand — seleção de filial ativa
// STORY-008: ao trocar de filial, invalidar todos os queries do TanStack Query

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Filial {
  id: string;
  nome: string;
}

interface FilialState {
  activeFilialId: string | null;
  activeFilial: Filial | null;
  setActiveFilial: (filial: Filial) => void;
  clearFilial: () => void;
}

export const useFilialStore = create<FilialState>()(
  persist(
    (set) => ({
      activeFilialId: null,
      activeFilial: null,

      setActiveFilial: (filial) =>
        set({ activeFilialId: filial.id, activeFilial: filial }),

      clearFilial: () =>
        set({ activeFilialId: null, activeFilial: null }),
    }),
    { name: 'upedu-filial', skipHydration: true }
  )
);
