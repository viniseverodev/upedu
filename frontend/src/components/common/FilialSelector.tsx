// FilialSelector — S008
// Busca filiais ativas do usuário, seleciona automaticamente se apenas 1
// Ao trocar de filial: invalida todo o cache TanStack Query

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilial } from '@/hooks/useFilial';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface Filial {
  id: string;
  nome: string;
  ativo: boolean;
}

export function FilialSelector() {
  const { activeFilial, setActiveFilial } = useFilial();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: filiais = [] } = useQuery<Filial[]>({
    queryKey: ['filiais-ativas'],
    queryFn: () => api.get('/filiais/ativas').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5min
  });

  // S008: seleção automática quando há apenas 1 filial
  useEffect(() => {
    if (filiais.length === 1 && !activeFilial) {
      setActiveFilial({ id: filiais[0].id, nome: filiais[0].nome });
    }
  }, [filiais, activeFilial, setActiveFilial]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (filiais.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Filial:</span>
        <span className="text-sm font-medium text-gray-700">
          {activeFilial?.nome ?? '—'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        <span className="text-xs text-gray-400">Filial:</span>
        <span className="font-medium text-gray-700">
          {activeFilial?.nome ?? 'Selecionar...'}
        </span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-white shadow-lg">
          {filiais.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFilial({ id: f.id, nome: f.nome });
                setOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                activeFilial?.id === f.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              {f.nome}
              {activeFilial?.id === f.id && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
