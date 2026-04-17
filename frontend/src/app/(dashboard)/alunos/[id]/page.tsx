// Perfil completo do aluno — S016/S019/S020/S022/S023 (Sprint 4/5/6)
// Tabs: Dados Pessoais | Responsáveis | Financeiro | Histórico

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import {
  vincularResponsavelSchema,
  createMatriculaSchema,
  createMensalidadeSchema,
  pagarMensalidadeSchema,
  type VincularResponsavelInput,
  type CreateMatriculaInput,
  type CreateMensalidadeInput,
  type PagarMensalidadeInput,
} from '@/schemas/index';

interface Responsavel { id: string; nome: string; telefone: string | null; email: string | null }
interface AlunoResponsavel { parentesco: string; isResponsavelFinanceiro: boolean; responsavel: Responsavel }
interface Matricula { id: string; status: string; turno: string; valorMensalidade: number; dataInicio: string; dataFim: string | null }
interface Mensalidade { id: string; status: string; mesReferencia: number; anoReferencia: number; valorOriginal: number }

interface AlunoProfile {
  id: string;
  nome: string;
  dataNascimento: string;
  status: string;
  turno: string;
  observacoes: string | null;
  consentimentoTimestamp: string | null;
  responsaveis: AlunoResponsavel[];
  matriculas: Matricula[];
  mensalidades: Mensalidade[];
}

const STATUS_BADGE: Record<string, string> = {
  PRE_MATRICULA: 'badge-blue',
  ATIVO: 'badge-green',
  INATIVO: 'badge-gray',
  LISTA_ESPERA: 'badge-yellow',
  TRANSFERIDO: 'badge-purple',
};
const STATUS_LABELS: Record<string, string> = {
  PRE_MATRICULA: 'Pré-Matrícula',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de Espera',
  TRANSFERIDO: 'Transferido',
};
const MENS_BADGE: Record<string, string> = {
  PAGO: 'badge-green',
  PENDENTE: 'badge-yellow',
  INADIMPLENTE: 'badge-red',
};
const MATR_BADGE: Record<string, string> = {
  ATIVA: 'badge-green',
  ENCERRADA: 'badge-gray',
};
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type Tab = 'dados' | 'responsaveis' | 'financeiro' | 'historico';

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function ServerError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
      {message}
    </div>
  );
}

export default function AlunoPerfilPage() {
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [vincularError, setVincularError] = useState<string | null>(null);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaError, setMatriculaError] = useState<string | null>(null);
  const [showMensalidadeModal, setShowMensalidadeModal] = useState(false);
  const [mensalidadeError, setMensalidadeError] = useState<string | null>(null);
  const [pagarId, setPagarId] = useState<string | null>(null);
  const [pagarError, setPagarError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: aluno, isLoading } = useQuery<AlunoProfile>({
    queryKey: ['aluno', id],
    queryFn: () => api.get(`/alunos/${id}`).then((r) => r.data),
  });

  const { register: registerVincular, handleSubmit: handleVincular, reset: resetVincular, formState: { errors: errorsVincular } } =
    useForm<VincularResponsavelInput>({ resolver: zodResolver(vincularResponsavelSchema), defaultValues: { isResponsavelFinanceiro: false } });

  const vincularMutation = useMutation({
    mutationFn: (data: VincularResponsavelInput) => api.post(`/alunos/${id}/responsaveis`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aluno', id] }); setShowVincularModal(false); resetVincular(); setVincularError(null); },
    onError: (error: AxiosError<{ message: string }>) => setVincularError(error.response?.data?.message ?? 'Erro ao vincular responsável.'),
  });

  const desvinculaMutation = useMutation({
    mutationFn: (responsavelId: string) => api.delete(`/alunos/${id}/responsaveis/${responsavelId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aluno', id] }),
  });

  const now = new Date();
  const { register: registerMatricula, handleSubmit: handleMatricula, reset: resetMatricula, formState: { errors: errorsMatricula } } =
    useForm<CreateMatriculaInput>({ resolver: zodResolver(createMatriculaSchema), defaultValues: { alunoId: id, turno: 'INTEGRAL', dataInicio: now.toISOString().split('T')[0] } });

  const matriculaMutation = useMutation({
    mutationFn: (data: CreateMatriculaInput) => api.post('/matriculas', { ...data, alunoId: id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aluno', id] }); setShowMatriculaModal(false); resetMatricula(); setMatriculaError(null); },
    onError: (error: AxiosError<{ message: string }>) => setMatriculaError(error.response?.data?.message ?? 'Erro ao criar matrícula.'),
  });

  const { register: registerMensalidade, handleSubmit: handleMensalidade, reset: resetMensalidade, formState: { errors: errorsMensalidade } } =
    useForm<CreateMensalidadeInput>({ resolver: zodResolver(createMensalidadeSchema), defaultValues: { alunoId: id, mesReferencia: now.getMonth() + 1, anoReferencia: now.getFullYear() } });

  const mensalidadeMutation = useMutation({
    mutationFn: (data: CreateMensalidadeInput) => api.post('/mensalidades', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aluno', id] }); setShowMensalidadeModal(false); resetMensalidade(); setMensalidadeError(null); },
    onError: (error: AxiosError<{ message: string }>) => setMensalidadeError(error.response?.data?.message ?? 'Erro ao gerar mensalidade.'),
  });

  const { register: registerPagar, handleSubmit: handlePagar, reset: resetPagar, formState: { errors: errorsPagar } } =
    useForm<PagarMensalidadeInput>({ resolver: zodResolver(pagarMensalidadeSchema), defaultValues: { valorDesconto: 0, dataPagamento: now.toISOString().split('T')[0] } });

  const pagarMutation = useMutation({
    mutationFn: ({ mensId, data }: { mensId: string; data: PagarMensalidadeInput }) => api.patch(`/mensalidades/${mensId}/pagar`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aluno', id] }); setPagarId(null); resetPagar(); setPagarError(null); },
    onError: (error: AxiosError<{ message: string }>) => setPagarError(error.response?.data?.message ?? 'Erro ao registrar pagamento.'),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados', label: 'Dados Pessoais' },
    { key: 'responsaveis', label: 'Responsáveis' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'historico', label: 'Histórico' },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-10 w-full" />
        <div className="card p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="empty-state mt-12">
        <p className="text-sm text-gray-400 dark:text-slate-500">Aluno não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white">
            {aluno.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">{aluno.nome}</h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`badge ${STATUS_BADGE[aluno.status] ?? 'badge-gray'}`}>
                {STATUS_LABELS[aluno.status] ?? aluno.status}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {aluno.turno === 'INTEGRAL' ? 'Integral' : 'Meio Turno'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aluno.status === 'PRE_MATRICULA' && (
            <button
              onClick={() => { setShowMatriculaModal(true); setMatriculaError(null); }}
              className="btn-primary text-sm"
            >
              Nova Matrícula
            </button>
          )}
          <Link href={`/alunos/${id}/editar`} className="btn-secondary text-sm">Editar</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Dados Pessoais */}
      {activeTab === 'dados' && (
        <div className="card px-6 py-2">
          <InfoRow label="Nome completo" value={aluno.nome} />
          <InfoRow label="Data de nascimento" value={new Date(aluno.dataNascimento).toLocaleDateString('pt-BR')} />
          <InfoRow label="Turno" value={aluno.turno === 'INTEGRAL' ? 'Integral' : 'Meio Turno'} />
          {aluno.observacoes && <InfoRow label="Observações" value={aluno.observacoes} />}
          {aluno.consentimentoTimestamp && (
            <InfoRow
              label="Consentimento LGPD"
              value={`Registrado em ${new Date(aluno.consentimentoTimestamp).toLocaleDateString('pt-BR')}`}
            />
          )}
        </div>
      )}

      {/* Tab: Responsáveis */}
      {activeTab === 'responsaveis' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowVincularModal(true); setVincularError(null); }}
              className="btn-primary text-sm"
            >
              Vincular Responsável
            </button>
          </div>

          {aluno.responsaveis.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm text-gray-400 dark:text-slate-500">Nenhum responsável vinculado.</p>
            </div>
          ) : (
            aluno.responsaveis.map((ar) => (
              <div key={ar.responsavel.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-slate-100">{ar.responsavel.nome}</span>
                      {ar.isResponsavelFinanceiro && (
                        <span className="badge badge-blue">Responsável Financeiro</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{ar.parentesco}</p>
                    {ar.responsavel.telefone && (
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-slate-400">{ar.responsavel.telefone}</p>
                    )}
                    {ar.responsavel.email && (
                      <p className="text-sm text-gray-600 dark:text-slate-400">{ar.responsavel.email}</p>
                    )}
                    <Link href={`/responsaveis/${ar.responsavel.id}`} className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      Ver perfil completo →
                    </Link>
                  </div>
                  <button
                    onClick={() => desvinculaMutation.mutate(ar.responsavel.id)}
                    disabled={desvinculaMutation.isPending}
                    className="text-xs font-medium text-crimson-500 hover:text-crimson-700 disabled:opacity-50"
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowMensalidadeModal(true); setMensalidadeError(null); }}
              className="btn-primary text-sm"
            >
              Gerar Mensalidade
            </button>
          </div>

          {aluno.mensalidades.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm text-gray-400 dark:text-slate-500">Nenhuma mensalidade registrada.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Referência</th>
                    <th className="table-th">Valor</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {aluno.mensalidades.map((m) => (
                    <tr key={m.id} className="table-row">
                      <td className="table-td font-medium">{MESES[m.mesReferencia - 1]}/{m.anoReferencia}</td>
                      <td className="table-td">
                        {Number(m.valorOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="table-td">
                        <span className={`badge ${MENS_BADGE[m.status] ?? 'badge-gray'}`}>{m.status}</span>
                      </td>
                      <td className="table-td">
                        {(m.status === 'PENDENTE' || m.status === 'INADIMPLENTE') && (
                          <button
                            onClick={() => { setPagarId(m.id); setPagarError(null); resetPagar(); }}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          >
                            Registrar Pagamento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === 'historico' && (
        <div className="space-y-3">
          {aluno.matriculas.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm text-gray-400 dark:text-slate-500">Nenhuma matrícula registrada.</p>
            </div>
          ) : (
            aluno.matriculas.map((m) => (
              <div key={m.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {m.turno === 'INTEGRAL' ? 'Integral' : 'Meio Turno'} —{' '}
                    {Number(m.valorMensalidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
                    Início: {new Date(m.dataInicio).toLocaleDateString('pt-BR')}
                    {m.dataFim ? ` · Fim: ${new Date(m.dataFim).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                <span className={`badge ${MATR_BADGE[m.status] ?? 'badge-red'}`}>{m.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Vincular Responsável */}
      {showVincularModal && (
        <ModalShell title="Vincular Responsável" onClose={() => { setShowVincularModal(false); resetVincular(); setVincularError(null); }}>
          <form onSubmit={handleVincular((d) => { setVincularError(null); vincularMutation.mutate(d); })} noValidate className="space-y-4">
            <ModalField label="ID do Responsável" error={errorsVincular.responsavelId?.message}>
              <input {...registerVincular('responsavelId')} placeholder="UUID do responsável" className={`input-base ${errorsVincular.responsavelId ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Parentesco" error={errorsVincular.parentesco?.message}>
              <input {...registerVincular('parentesco')} placeholder="Ex: Mãe, Pai, Avó" className={`input-base ${errorsVincular.parentesco ? 'input-error' : ''}`} />
            </ModalField>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" id="isFinanceiro" {...registerVincular('isResponsavelFinanceiro')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Responsável financeiro</span>
            </label>

            {vincularError && <ServerError message={vincularError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={vincularMutation.isPending} className="btn-primary flex-1">
                {vincularMutation.isPending ? 'Vinculando…' : 'Vincular'}
              </button>
              <button type="button" onClick={() => { setShowVincularModal(false); resetVincular(); setVincularError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Nova Matrícula */}
      {showMatriculaModal && (
        <ModalShell title="Nova Matrícula" onClose={() => { setShowMatriculaModal(false); resetMatricula(); setMatriculaError(null); }}>
          <form onSubmit={handleMatricula((d) => { setMatriculaError(null); matriculaMutation.mutate({ ...d, alunoId: id }); })} noValidate className="space-y-4">
            <ModalField label="Turno" error={errorsMatricula.turno?.message}>
              <select {...registerMatricula('turno')} className={`input-base ${errorsMatricula.turno ? 'input-error' : ''}`}>
                <option value="INTEGRAL">Integral</option>
                <option value="MEIO_TURNO">Meio Turno</option>
              </select>
            </ModalField>

            <ModalField label="Data de Início" error={errorsMatricula.dataInicio?.message}>
              <input type="date" {...registerMatricula('dataInicio')} className={`input-base ${errorsMatricula.dataInicio ? 'input-error' : ''}`} />
            </ModalField>

            {matriculaError && <ServerError message={matriculaError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={matriculaMutation.isPending} className="btn-primary flex-1">
                {matriculaMutation.isPending ? 'Matriculando…' : 'Confirmar Matrícula'}
              </button>
              <button type="button" onClick={() => { setShowMatriculaModal(false); resetMatricula(); setMatriculaError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Gerar Mensalidade */}
      {showMensalidadeModal && (
        <ModalShell title="Gerar Mensalidade" onClose={() => { setShowMensalidadeModal(false); resetMensalidade(); setMensalidadeError(null); }}>
          <form onSubmit={handleMensalidade((d) => { setMensalidadeError(null); mensalidadeMutation.mutate({ ...d, alunoId: id }); })} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Mês" error={errorsMensalidade.mesReferencia?.message}>
                <input type="number" min={1} max={12} {...registerMensalidade('mesReferencia', { valueAsNumber: true })} className={`input-base ${errorsMensalidade.mesReferencia ? 'input-error' : ''}`} />
              </ModalField>
              <ModalField label="Ano" error={errorsMensalidade.anoReferencia?.message}>
                <input type="number" min={2020} {...registerMensalidade('anoReferencia', { valueAsNumber: true })} className={`input-base ${errorsMensalidade.anoReferencia ? 'input-error' : ''}`} />
              </ModalField>
            </div>

            {mensalidadeError && <ServerError message={mensalidadeError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={mensalidadeMutation.isPending} className="btn-primary flex-1">
                {mensalidadeMutation.isPending ? 'Gerando…' : 'Gerar Mensalidade'}
              </button>
              <button type="button" onClick={() => { setShowMensalidadeModal(false); resetMensalidade(); setMensalidadeError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Registrar Pagamento */}
      {pagarId && (
        <ModalShell title="Registrar Pagamento" onClose={() => { setPagarId(null); resetPagar(); setPagarError(null); }}>
          <form onSubmit={handlePagar((d) => { setPagarError(null); pagarMutation.mutate({ mensId: pagarId, data: d }); })} noValidate className="space-y-4">
            <ModalField label="Valor Pago (R$)" error={errorsPagar.valorPago?.message}>
              <input type="number" step="0.01" min="0.01" {...registerPagar('valorPago', { valueAsNumber: true })} className={`input-base ${errorsPagar.valorPago ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Desconto (R$)">
              <input type="number" step="0.01" min="0" {...registerPagar('valorDesconto', { valueAsNumber: true })} className="input-base" />
            </ModalField>

            <ModalField label="Forma de Pagamento" error={errorsPagar.formaPagamento?.message}>
              <select {...registerPagar('formaPagamento')} className={`input-base ${errorsPagar.formaPagamento ? 'input-error' : ''}`}>
                <option value="">Selecione…</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="DINHEIRO">Dinheiro</option>
              </select>
            </ModalField>

            <ModalField label="Data do Pagamento" error={errorsPagar.dataPagamento?.message}>
              <input type="date" {...registerPagar('dataPagamento')} className={`input-base ${errorsPagar.dataPagamento ? 'input-error' : ''}`} />
            </ModalField>

            {pagarError && <ServerError message={pagarError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={pagarMutation.isPending} className="btn-primary flex-1">
                {pagarMutation.isPending ? 'Salvando…' : 'Registrar Pagamento'}
              </button>
              <button type="button" onClick={() => { setPagarId(null); resetPagar(); setPagarError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
