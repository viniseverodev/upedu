// FilialSelector — seleção de filial ativa — STORY-008
// Ao trocar de filial: invalidar todos os queries

'use client';

import { useFilial } from '@/hooks/useFilial';

export function FilialSelector() {
  const { activeFilial } = useFilial();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Filial:</span>
      <span className="font-medium">{activeFilial?.nome ?? 'Selecionar...'}</span>
      {/* TODO: dropdown com listagem de filiais — STORY-008 */}
    </div>
  );
}
