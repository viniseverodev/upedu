// Lista de responsáveis — S018

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Responsavel {
  id: string; nome: string; cpf: string | null;
  telefone: string | null; email: string | null;
}

export default function ResponsaveisPage() {
  const { data: responsaveis = [], isLoading } = useQuery<Responsavel[]>({
    queryKey: ['responsaveis'],
    queryFn: () => api.get('/responsaveis').then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Responsáveis</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            {isLoading ? '…' : `${responsaveis.length} responsável${responsaveis.length !== 1 ? 'is' : ''}`}
          </p>
        </div>
        <Link href="/responsaveis/novo" className="btn-primary">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
          </svg>
          Novo Responsável
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : responsaveis.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Nenhum responsável encontrado</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">Cadastre responsáveis e vincule-os a alunos.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">CPF</th>
                <th className="table-th">Telefone</th>
                <th className="table-th">Email</th>
                <th className="table-th w-20" />
              </tr>
            </thead>
            <tbody>
              {responsaveis.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{r.nome}</td>
                  <td className="table-td font-mono text-xs">{r.cpf ?? '—'}</td>
                  <td className="table-td">{r.telefone ?? '—'}</td>
                  <td className="table-td">{r.email ?? '—'}</td>
                  <td className="table-td text-right">
                    <Link href={`/responsaveis/${r.id}`} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                      Ver
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
