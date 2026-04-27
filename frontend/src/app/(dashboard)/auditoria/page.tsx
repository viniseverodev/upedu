// Auditoria — S035

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DatePickerInput } from '@/components/ui/DatePickerInput';

interface AuditLog {
  id: string; userId: string; userName: string; filialId: string | null;
  action: string; entityType: string; entityId: string;
  ipAddress: string | null; createdAt: string;
}
interface AuditResponse {
  data: AuditLog[]; total: number; page: number; pageSize: number; totalPages: number;
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'badge-green', UPDATE: 'badge-blue', DELETE: 'badge-red',
  LOGIN: 'badge-gray', LOGOUT: 'badge-gray', SUSPICIOUS_TOKEN_REUSE: 'badge-red',
};

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = new URLSearchParams({ page: String(page) });
  if (userId) params.set('userId', userId);
  if (entityType) params.set('entityType', entityType);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['auditoria', page, userId, entityType, dateFrom, dateTo],
    queryFn: () => api.get(`/auditoria?${params.toString()}`).then((r) => r.data),
  });

  const exportarCsv = async () => {
    const p = new URLSearchParams(params);
    p.set('format', 'csv');
    const res = await api.get(`/auditoria?${p.toString()}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'auditoria.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoria</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            Registro de todas as ações do sistema
          </p>
        </div>
        <button onClick={exportarCsv} className="btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Filtros</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-400">Entidade</label>
            <input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Aluno, Matricula…" className="input-base text-xs" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-400">ID do Usuário</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID" className="input-base text-xs" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-400">De</label>
            <DatePickerInput value={dateFrom} onChange={setDateFrom} placeholder="Data inicial" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-slate-400">Até</label>
            <DatePickerInput value={dateTo} onChange={setDateTo} placeholder="Data final" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setPage(1)} className="btn-primary py-2 text-xs">Filtrar</button>
          <button onClick={() => { setEntityType(''); setUserId(''); setDateFrom(''); setDateTo(''); setPage(1); }} className="btn-ghost py-2 text-xs">
            Limpar
          </button>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="skeleton h-64" />
      ) : data && data.data.length > 0 ? (
        <>
          <div className="table-container">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Timestamp</th>
                  <th className="table-th">Usuário</th>
                  <th className="table-th">Ação</th>
                  <th className="table-th">Entidade</th>
                  <th className="table-th">ID da Entidade</th>
                  <th className="table-th">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="table-td whitespace-nowrap text-xs text-stone-400 dark:text-slate-500">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="table-td font-medium text-stone-900 dark:text-slate-100">{log.userName}</td>
                    <td className="table-td">
                      <span className={`badge ${ACTION_BADGE[log.action] ?? 'badge-gray'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="table-td">{log.entityType}</td>
                    <td className="table-td max-w-[140px] truncate font-mono text-xs text-stone-400 dark:text-slate-500">
                      {log.entityId}
                    </td>
                    <td className="table-td text-xs text-stone-400 dark:text-slate-500">{log.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-400 dark:text-slate-500">
              {data.total} registros · página {data.page} de {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-2 text-xs disabled:opacity-40">
                Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="btn-secondary py-2 text-xs disabled:opacity-40">
                Próxima
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p className="text-sm text-stone-400 dark:text-slate-500">Nenhum registro encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}
