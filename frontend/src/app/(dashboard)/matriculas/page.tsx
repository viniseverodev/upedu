// Matrículas — S022

'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Matricula {
  id: string;
  status: 'ATIVA' | 'ENCERRADA' | 'CANCELADA';
  turno: 'MANHA' | 'TARDE';
  valorMensalidade: number;
  dataInicio: string;
  dataFim: string | null;
  createdAt: string;
  aluno: { id: string; nome: string };
}

const STATUS_LABEL: Record<Matricula['status'], string> = {
  ATIVA: 'Ativa',
  ENCERRADA: 'Encerrada',
  CANCELADA: 'Cancelada',
};

const STATUS_BADGE: Record<Matricula['status'], string> = {
  ATIVA: 'badge-green',
  ENCERRADA: 'badge-gray',
  CANCELADA: 'badge-red',
};

const TURNO_LABEL: Record<Matricula['turno'], string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
};

function fmtBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function fmtMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MatriculasPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('');

  const { data: matriculas = [], isLoading } = useQuery<Matricula[]>({
    queryKey: ['matriculas'],
    queryFn: () => api.get('/matriculas').then((r) => r.data),
  });

  const filtradas = useMemo(() => {
    return matriculas.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (turnoFilter && m.turno !== turnoFilter) return false;
      if (search && !m.aluno.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [matriculas, search, statusFilter, turnoFilter]);

  const hasFilters = search || statusFilter || turnoFilter;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Matrículas</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            {isLoading ? '…' : `${filtradas.length} de ${matriculas.length} matrícula${matriculas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno…"
              className="input-base pl-9"
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base w-auto">
            <option value="">Todos os status</option>
            <option value="ATIVA">Ativa</option>
            <option value="ENCERRADA">Encerrada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select value={turnoFilter} onChange={(e) => setTurnoFilter(e.target.value)} className="input-base w-auto">
            <option value="">Todos os turnos</option>
            <option value="MANHA">Manhã</option>
            <option value="TARDE">Tarde</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setTurnoFilter(''); }}
              className="btn-ghost text-sm"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="empty-state py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
              {hasFilters ? 'Nenhuma matrícula encontrada com esses filtros.' : 'Nenhuma matrícula registrada.'}
            </p>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); setTurnoFilter(''); }} className="mt-2 text-xs text-brand-600 hover:underline dark:text-brand-400">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Aluno</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Turno</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Valor</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Início</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Encerramento</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtradas.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-slate-100">
                    {m.aluno.nome}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${STATUS_BADGE[m.status]}`}>
                      {STATUS_LABEL[m.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400">
                    {TURNO_LABEL[m.turno]}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400">
                    {fmtMoeda(m.valorMensalidade)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400">
                    {fmtBR(m.dataInicio)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400">
                    {m.dataFim ? fmtBR(m.dataFim) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/alunos/${m.aluno.id}`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      Ver aluno →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
