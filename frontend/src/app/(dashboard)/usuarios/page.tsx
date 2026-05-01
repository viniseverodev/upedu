// Listagem de usuários — S009

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

interface UserFilial { filialId: string }
interface User {
  id: string; nome: string; email: string; role: string;
  ativo: boolean; primeiroAcesso: boolean; filiais: UserFilial[];
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN_MATRIZ: 'Admin Matriz',
  GERENTE_FILIAL: 'Gerente de Filial', ATENDENTE: 'Atendente', PROFESSOR: 'Professor',
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'badge-red', ADMIN_MATRIZ: 'badge-purple',
  GERENTE_FILIAL: 'badge-blue', ATENDENTE: 'badge-gray', PROFESSOR: 'badge-green',
};

export default function UsuariosPage() {
  const canManage = usePermission('ADMIN_MATRIZ');
  const searchParams = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const created = searchParams?.get('created');
    const updated = searchParams?.get('updated');
    if (created) showToast('Usuário cadastrado', `${decodeURIComponent(created)} foi cadastrado com sucesso.`);
    if (updated) showToast('Usuário atualizado', `${decodeURIComponent(updated)} foi atualizado com sucesso.`);
  }, [searchParams, showToast]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            {isLoading ? '…' : `${users.length} usuário${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <Link href="/usuarios/novo" className="btn-primary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
            </svg>
            Novo Usuário
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm font-medium text-stone-500 dark:text-slate-400">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">Email</th>
                <th className="table-th">Perfil</th>
                <th className="table-th text-center">Filiais</th>
                <th className="table-th">Status</th>
                {canManage && <th className="table-th w-20" />}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                        {user.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900 dark:text-slate-100">{user.nome}</p>
                        {user.primeiroAcesso && (
                          <span className="badge-yellow text-[10px]">1º acesso pendente</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-xs">{user.email}</td>
                  <td className="table-td">
                    <span className={`badge ${ROLE_BADGE[user.role] ?? 'badge-gray'}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="table-td text-center">{user.filiais.length}</td>
                  <td className="table-td">
                    <span className={user.ativo ? 'badge-green' : 'badge-gray'}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="table-td text-right">
                      <Link href={`/usuarios/${user.id}/editar`} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
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
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
