// Lista de responsáveis — S018 (Sprint 5)

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Responsavel {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
}

export default function ResponsaveisPage() {
  // Lista responsáveis vinculados a alunos da filial atual
  const { data: responsaveis = [], isLoading } = useQuery<Responsavel[]>({
    queryKey: ['responsaveis'],
    queryFn: () => api.get('/responsaveis').then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Responsáveis</h1>
        <Link
          href="/responsaveis/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Responsável
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : responsaveis.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-gray-400">
          <p className="font-medium">Nenhum responsável encontrado.</p>
          <p className="mt-1 text-sm">Cadastre responsáveis e vincule-os a alunos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CPF</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {responsaveis.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.nome}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.cpf ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.telefone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/responsaveis/${r.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
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
