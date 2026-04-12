// Listagem de alunos — S012 (Sprint 4)

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Responsavel {
  id: string;
  nome: string;
  telefone: string | null;
}

interface AlunoResponsavel {
  responsavel: Responsavel;
}

interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  status: string;
  turno: string;
  responsaveis: AlunoResponsavel[];
}

const STATUS_LABELS: Record<string, string> = {
  PRE_MATRICULA: 'Pré-Matrícula',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de Espera',
  TRANSFERIDO: 'Transferido',
};

const STATUS_COLORS: Record<string, string> = {
  PRE_MATRICULA: 'bg-blue-100 text-blue-700',
  ATIVO: 'bg-green-100 text-green-700',
  INATIVO: 'bg-gray-100 text-gray-500',
  LISTA_ESPERA: 'bg-yellow-100 text-yellow-700',
  TRANSFERIDO: 'bg-purple-100 text-purple-700',
};

const TURNO_LABELS: Record<string, string> = {
  INTEGRAL: 'Integral',
  MEIO_TURNO: 'Meio Turno',
};

export default function AlunosPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: alunos = [], isLoading } = useQuery<Aluno[]>({
    queryKey: ['alunos', statusFilter],
    queryFn: () =>
      api
        .get('/alunos', { params: statusFilter ? { status: statusFilter } : {} })
        .then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
        <Link
          href="/alunos/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Aluno
        </Link>
      </div>

      {/* Filtros de status */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'PRE_MATRICULA', 'ATIVO', 'INATIVO', 'LISTA_ESPERA'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {s === '' ? 'Todos' : (STATUS_LABELS[s] ?? s)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : alunos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-gray-400">
          Nenhum aluno encontrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nascimento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Turno</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Responsável</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{aluno.nome}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(aluno.dataNascimento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TURNO_LABELS[aluno.turno] ?? aluno.turno}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {aluno.responsaveis[0]?.responsavel.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[aluno.status] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABELS[aluno.status] ?? aluno.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/alunos/${aluno.id}`}
                      className="text-sm text-blue-600 hover:underline mr-3"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/alunos/${aluno.id}/editar`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
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
