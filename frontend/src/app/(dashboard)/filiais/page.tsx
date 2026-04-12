// Listagem de filiais — S008 (Sprint 2)

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

interface Filial {
  id: string;
  nome: string;
  cnpj: string;
  diaVencimento: number;
  valorMensalidadeIntegral: string;
  valorMensalidadeMeioTurno: string;
  ativo: boolean;
}

export default function FiliaisPage() {
  const canManage = usePermission('ADMIN_MATRIZ');

  const { data: filiais = [], isLoading } = useQuery<Filial[]>({
    queryKey: ['filiais'],
    queryFn: () => api.get('/filiais').then((r) => r.data),
  });

  function formatCnpj(cnpj: string) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Filiais</h1>
        {canManage && (
          <Link
            href="/filiais/nova"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nova Filial
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : filiais.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-gray-400">
          Nenhuma filial cadastrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CNPJ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vencimento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Integral</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Meio Turno</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filiais.map((filial) => (
                <tr key={filial.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{filial.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCnpj(filial.cnpj)}</td>
                  <td className="px-4 py-3 text-gray-600">Dia {filial.diaVencimento}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatCurrency(filial.valorMensalidadeIntegral)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatCurrency(filial.valorMensalidadeMeioTurno)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        filial.ativo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {filial.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/filiais/${filial.id}/editar`}
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
