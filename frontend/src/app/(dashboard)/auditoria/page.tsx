// Auditoria — S035
// Consulta de audit logs com filtros, paginação e exportação CSV
// Acesso: SUPER_ADMIN e ADMIN_MATRIZ

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  filialId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN:  'bg-gray-100 text-gray-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

export default function AuditoriaPage() {
  const [page, setPage]               = useState(1);
  const [userId, setUserId]           = useState('');
  const [entityType, setEntityType]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  const params = new URLSearchParams({ page: String(page) });
  if (userId)     params.set('userId', userId);
  if (entityType) params.set('entityType', entityType);
  if (dateFrom)   params.set('dateFrom', dateFrom);
  if (dateTo)     params.set('dateTo', dateTo);

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['auditoria', page, userId, entityType, dateFrom, dateTo],
    queryFn: () => api.get(`/auditoria?${params.toString()}`).then((r) => r.data),
  });

  const exportarCsv = async () => {
    const csvParams = new URLSearchParams(params);
    csvParams.set('format', 'csv');
    const res = await api.get(`/auditoria?${csvParams.toString()}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auditoria.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const aplicarFiltros = () => setPage(1);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <button
          onClick={exportarCsv}
          className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-xl bg-white shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Entidade</label>
            <input
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="ex: Aluno, Matricula..."
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ID do Usuário</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID do usuário"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={aplicarFiltros}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Filtrar
          </button>
          <button
            onClick={() => { setEntityType(''); setUserId(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="rounded-md border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="rounded-xl bg-white shadow-sm overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Usuário</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ação</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Entidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ID da Entidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.userName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.entityType}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-[140px]">
                      {log.entityId}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{data.total} registros — página {data.page} de {data.totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
          Nenhum registro encontrado com os filtros aplicados.
        </div>
      )}
    </div>
  );
}
