'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import api from '@/lib/api';

interface Oficina {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  ativa: boolean;
  _count: { turmas: number };
}

type FiltroStatus = 'TODAS' | 'ATIVAS' | 'INATIVAS';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export default function OficinasPage() {
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('ATIVAS');

  const { data: oficinas = [], isLoading } = useQuery<Oficina[]>({
    queryKey: ['oficinas'],
    queryFn: () => api.get('/oficinas').then((r) => r.data),
    staleTime: 0,
  });

  const oficinasVisiveis = oficinas
    .filter((o) => {
      if (filtroStatus === 'ATIVAS') return o.ativa;
      if (filtroStatus === 'INATIVAS') return !o.ativa;
      return true;
    })
    .filter((o) => o.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Oficinas</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            Gerencie as oficinas extracurriculares e suas turmas
          </p>
        </div>
        <Link href="/oficinas/nova" className="btn-primary">
          + Nova Oficina
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="relative min-w-48 flex-1 sm:flex-none sm:w-64">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-slate-500"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome…"
            className="input-base pl-9"
          />
        </div>

        {/* Tabs de status */}
        <div className="flex rounded-xl border border-stone-200 p-0.5 dark:border-slate-700">
          {(['TODAS', 'ATIVAS', 'INATIVAS'] as FiltroStatus[]).map((op) => (
            <button
              key={op}
              onClick={() => setFiltroStatus(op)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroStatus === op
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {op === 'TODAS' ? 'Todas' : op === 'ATIVAS' ? 'Ativas' : 'Inativas'}
              {op !== 'TODAS' && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  filtroStatus === op
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {op === 'ATIVAS'
                    ? oficinas.filter((o) => o.ativa).length
                    : oficinas.filter((o) => !o.ativa).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : oficinasVisiveis.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mb-3 h-10 w-10 text-stone-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          {oficinas.length > 0 ? (
            <>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-500">Nenhuma oficina encontrada</p>
              <p className="mt-1 text-xs text-stone-400 dark:text-slate-600">Tente ajustar os filtros</p>
              <button
                onClick={() => { setSearch(''); setFiltroStatus('TODAS'); }}
                className="btn-secondary mt-4 text-xs"
              >
                Limpar filtros
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-500">Nenhuma oficina cadastrada</p>
              <p className="mt-1 text-xs text-stone-400 dark:text-slate-600">Crie a primeira oficina para começar</p>
              <Link href="/oficinas/nova" className="btn-primary mt-4">
                Criar Oficina
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {oficinasVisiveis.map((oficina) => (
            <Link
              key={oficina.id}
              href={`/oficinas/${oficina.id}`}
              className="card p-5 group transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-lg dark:hover:border-brand-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 transition-colors group-hover:bg-brand-600/20 dark:bg-brand-600/20 dark:group-hover:bg-brand-600/30">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5 text-brand-600 dark:text-brand-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  oficina.ativa
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  {oficina.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <div className="mt-3">
                <h3 className="font-semibold text-stone-800 group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400 transition-colors">
                  {oficina.nome}
                </h3>
                {oficina.descricao && (
                  <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500 line-clamp-2">{oficina.descricao}</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-slate-800">
                <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {formatCurrency(Number(oficina.valor))}<span className="text-xs font-normal text-stone-400">/mês</span>
                </span>
                <span className="text-xs text-stone-400 dark:text-slate-500">
                  {oficina._count.turmas} {oficina._count.turmas === 1 ? 'turma' : 'turmas'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
