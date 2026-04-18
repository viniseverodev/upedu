// Listagem de alunos — S012

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Responsavel { id: string; nome: string; telefone: string | null }
interface AlunoResponsavel { responsavel: Responsavel }
interface Aluno {
  id: string; nome: string; dataNascimento: string;
  status: string; turno: string; responsaveis: AlunoResponsavel[];
}

const STATUS_LABELS: Record<string, string> = {
  PRE_MATRICULA: 'Pré-Matrícula', ATIVO: 'Ativo', INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de Espera', TRANSFERIDO: 'Transferido',
};

const STATUS_BADGE: Record<string, string> = {
  PRE_MATRICULA: 'badge-blue', ATIVO: 'badge-green', INATIVO: 'badge-gray',
  LISTA_ESPERA: 'badge-yellow', TRANSFERIDO: 'badge-purple',
};

const FILTERS = ['', 'PRE_MATRICULA', 'ATIVO', 'INATIVO', 'LISTA_ESPERA'];

export default function AlunosPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: alunos = [], isLoading } = useQuery<Aluno[]>({
    queryKey: ['alunos', statusFilter],
    queryFn: () =>
      api.get('/alunos', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alunos</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            {isLoading ? '…' : `${alunos.length} aluno${alunos.length !== 1 ? 's' : ''} encontrado${alunos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/alunos/novo" className="btn-primary">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
          </svg>
          Novo Aluno
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
            }`}
          >
            {s === '' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : alunos.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Nenhum aluno encontrado</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">Tente alterar o filtro ou cadastre um novo aluno.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">Nascimento</th>
                <th className="table-th">Turno</th>
                <th className="table-th">Responsável</th>
                <th className="table-th">Status</th>
                <th className="table-th w-24" />
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="table-row">
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{aluno.nome}</td>
                  <td className="table-td">{formatDate(aluno.dataNascimento)}</td>
                  <td className="table-td">
                    <span className={aluno.turno === 'MANHA' ? 'badge-blue badge' : 'badge-gray badge'}>
                      {aluno.turno === 'MANHA' ? 'Manhã' : 'Tarde'}
                    </span>
                  </td>
                  <td className="table-td">{aluno.responsaveis[0]?.responsavel.nome ?? '—'}</td>
                  <td className="table-td">
                    <span className={STATUS_BADGE[aluno.status] ?? 'badge-gray'}>
                      {STATUS_LABELS[aluno.status] ?? aluno.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/alunos/${aluno.id}`} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                        Ver
                      </Link>
                      <Link href={`/alunos/${aluno.id}/editar`} className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
