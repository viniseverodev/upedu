// Listagem de usuários — S009 (Sprint 3)

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';

interface UserFilial {
  filialId: string;
}

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  primeiroAcesso: boolean;
  filiais: UserFilial[];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_MATRIZ: 'Admin Matriz',
  GERENTE_FILIAL: 'Gerente de Filial',
  ATENDENTE: 'Atendente',
  PROFESSOR: 'Professor',
};

export default function UsuariosPage() {
  const canManage = usePermission('ADMIN_MATRIZ');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        {canManage && (
          <Link
            href="/usuarios/novo"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo Usuário
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-gray-400">
          Nenhum usuário cadastrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Filiais</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.nome}
                    {user.primeiroAcesso && (
                      <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                        1º acesso
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.filiais.length}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.ativo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/usuarios/${user.id}/editar`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
