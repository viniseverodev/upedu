'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

interface AlunoMatriculado {
  id: string;
  aluno: { id: string; nome: string; status: string; turno: string };
  createdAt: string;
}

interface AlunoAtivo {
  id: string;
  nome: string;
  status: string;
  turno: string;
}

interface Oficina {
  id: string;
  ativa: boolean;
}

const TURNO_LABEL: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde' };

export default function TurmaDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const turmaId = params?.turmaId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [searchMatriculados, setSearchMatriculados] = useState('');
  const [searchAluno, setSearchAluno] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ alunoId: string; nome: string } | null>(null);

  const { data: oficina } = useQuery<Oficina>({
    queryKey: ['oficinas', id],
    queryFn: () => api.get(`/oficinas/${id}`).then((r) => r.data),
    staleTime: 0,
  });

  const { data: matriculas = [], isLoading } = useQuery<AlunoMatriculado[]>({
    queryKey: ['turma-matriculas', turmaId],
    queryFn: () => api.get(`/oficinas/${id}/turmas/${turmaId}/alunos`).then((r) => r.data),
    staleTime: 0,
  });

  const { data: todosAlunos = [] } = useQuery<AlunoAtivo[]>({
    queryKey: ['alunos', 'ATIVO'],
    queryFn: () => api.get('/alunos?status=ATIVO').then((r) => r.data),
    staleTime: 0,
  });

  const matricularMutation = useMutation({
    mutationFn: (alunoId: string) => api.post(`/oficinas/${id}/turmas/${turmaId}/alunos`, { alunoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turma-matriculas', turmaId] });
      queryClient.invalidateQueries({ queryKey: ['oficinas', id] });
      setSearchAluno('');
    },
  });

  const desmatricularMutation = useMutation({
    mutationFn: (alunoId: string) => api.delete(`/oficinas/${id}/turmas/${turmaId}/alunos/${alunoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turma-matriculas', turmaId] });
      queryClient.invalidateQueries({ queryKey: ['oficinas', id] });
      setConfirmRemove(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setConfirmRemove(null);
      showToast('Erro', err.response?.data?.message ?? 'Não foi possível desmatricular o aluno. Tente novamente.');
    },
  });

  const matriculadosIds = new Set(matriculas.map((m) => m.aluno.id));
  const oficinaInativa = oficina && !oficina.ativa;

  const matriculadosFiltrados = matriculas.filter((m) =>
    m.aluno.nome.toLowerCase().includes(searchMatriculados.toLowerCase()),
  );

  const alunosFiltrados = todosAlunos
    .filter((a) => !matriculadosIds.has(a.id))
    .filter((a) => a.nome.toLowerCase().includes(searchAluno.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/oficinas/${id}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 dark:border-slate-700 dark:text-slate-500"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-stone-400 dark:text-slate-500">Oficinas / Turma</p>
          <h1 className="page-title">Alunos Matriculados</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Matriculados */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-stone-100 pb-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">
                Matriculados
                <span className="ml-1.5 text-xs font-normal text-stone-400">({matriculas.length})</span>
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">Alunos matriculados nesta turma</p>
          </div>

          <input
            type="text"
            value={searchMatriculados}
            onChange={(e) => setSearchMatriculados(e.target.value)}
            placeholder="Buscar por nome…"
            className="input-base"
            disabled={isLoading || matriculas.length === 0}
          />

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : matriculas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-stone-400 dark:text-slate-600">Nenhum aluno matriculado</p>
              <p className="mt-0.5 text-xs text-stone-300 dark:text-slate-700">Busque alunos ao lado para matricular</p>
            </div>
          ) : matriculadosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-stone-400 dark:text-slate-600">Nenhum aluno encontrado</p>
              <p className="mt-0.5 text-xs text-stone-300 dark:text-slate-700">Tente outro nome</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {matriculadosFiltrados.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-3 py-2.5 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-slate-200">{m.aluno.nome}</p>
                    <p className="text-xs text-stone-400 dark:text-slate-500">{TURNO_LABEL[m.aluno.turno] ?? m.aluno.turno}</p>
                  </div>
                  <button
                    onClick={() => setConfirmRemove({ alunoId: m.aluno.id, nome: m.aluno.nome })}
                    className="text-stone-300 hover:text-crimson-500 dark:text-slate-700 dark:hover:text-crimson-400 transition-colors"
                    title="Remover"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Adicionar alunos */}
        <div className={`card p-5 space-y-4 ${oficinaInativa ? 'opacity-60' : ''}`}>
          <div className="border-b border-stone-100 pb-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Adicionar Aluno</h2>
              {oficinaInativa && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-slate-800 dark:text-slate-500">
                  Oficina inativa
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">
              {oficinaInativa
                ? 'Reative a oficina para matricular novos alunos'
                : 'Apenas alunos com status ATIVO'}
            </p>
          </div>

          <input
            type="text"
            value={searchAluno}
            onChange={(e) => setSearchAluno(e.target.value)}
            placeholder="Buscar por nome…"
            className="input-base"
            disabled={!!oficinaInativa}
          />

          {matricularMutation.isError && (
            <p className="text-xs text-crimson-500">
              {(matricularMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao matricular.'}
            </p>
          )}

          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {oficinaInativa ? (
              <li className="py-6 text-center text-xs text-stone-400 dark:text-slate-600">
                Não é possível matricular com a oficina inativa
              </li>
            ) : alunosFiltrados.length === 0 ? (
              <li className="py-6 text-center text-xs text-stone-400 dark:text-slate-600">
                {searchAluno ? 'Nenhum aluno encontrado' : 'Todos os alunos ativos já estão matriculados'}
              </li>
            ) : (
              alunosFiltrados.map((aluno) => (
                <li key={aluno.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-3 py-2.5 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-slate-200">{aluno.nome}</p>
                    <p className="text-xs text-stone-400 dark:text-slate-500">{TURNO_LABEL[aluno.turno] ?? aluno.turno}</p>
                  </div>
                  <button
                    onClick={() => matricularMutation.mutate(aluno.id)}
                    disabled={matricularMutation.isPending}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    Matricular
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Confirm remove */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 shadow-card-lg">
            <h2 className="text-base font-semibold text-stone-800 dark:text-slate-200">Remover aluno?</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
              <span className="font-semibold text-stone-800 dark:text-slate-200">{confirmRemove.nome}</span>{' '}
              será desmatriculado desta turma e a mensalidade pendente será cancelada.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmRemove(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => desmatricularMutation.mutate(confirmRemove.alunoId)}
                disabled={desmatricularMutation.isPending}
                className="rounded-xl bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700 disabled:opacity-50"
              >
                {desmatricularMutation.isPending ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
