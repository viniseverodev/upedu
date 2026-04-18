// Listagem de filiais — S008

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

interface Filial {
  id: string; nome: string; cnpj: string; diaVencimento: number;
  valorMensalidadeManha: string; valorMensalidadeTarde: string; ativo: boolean;
}

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export default function FiliaisPage() {
  const canManage = usePermission('ADMIN_MATRIZ');

  const { data: filiais = [], isLoading } = useQuery<Filial[]>({
    queryKey: ['filiais'],
    queryFn: () => api.get('/filiais').then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Filiais</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            {isLoading ? '…' : `${filiais.length} filial${filiais.length !== 1 ? 'is' : ''} cadastrada${filiais.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <Link href="/filiais/nova" className="btn-primary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
            </svg>
            Nova Filial
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : filiais.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Nenhuma filial cadastrada</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">CNPJ</th>
                <th className="table-th">Vencimento</th>
                <th className="table-th text-right">Mensalidade Manhã</th>
                <th className="table-th text-right">Mensalidade Tarde</th>
                <th className="table-th">Status</th>
                {canManage && <th className="table-th w-20" />}
              </tr>
            </thead>
            <tbody>
              {filiais.map((filial) => (
                <tr key={filial.id} className="table-row">
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{filial.nome}</td>
                  <td className="table-td font-mono text-xs">{formatCnpj(filial.cnpj)}</td>
                  <td className="table-td">Dia {filial.diaVencimento}</td>
                  <td className="table-td text-right">{formatCurrency(filial.valorMensalidadeManha)}</td>
                  <td className="table-td text-right">{formatCurrency(filial.valorMensalidadeTarde)}</td>
                  <td className="table-td">
                    <span className={filial.ativo ? 'badge-green' : 'badge-gray'}>
                      {filial.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="table-td text-right">
                      <Link href={`/filiais/${filial.id}/editar`} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
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
