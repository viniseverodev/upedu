// Perfil completo do aluno — S016/S019/S020 (Sprint 4/5)
// Tabs: Dados Pessoais | Responsáveis | Histórico

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { TimePickerInput } from '@/components/ui/TimePickerInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { z } from 'zod';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import {
  createMatriculaSchema,
  cpfSchema,
  type CreateMatriculaInput,
} from '@/schemas/index';

// Schema local: criar e vincular responsável em um único formulário
const addResponsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  cpf: cpfSchema.optional().or(z.literal('')),
  telefone: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  parentesco: z.string().min(2, 'Parentesco obrigatório'),
  isResponsavelFinanceiro: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.isResponsavelFinanceiro && !data.cpf?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CPF obrigatório para responsável financeiro',
      path: ['cpf'],
    });
  }
});
type AddResponsavelInput = z.infer<typeof addResponsavelSchema>;

// Schema local: editar dados do responsável
const editResponsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  parentesco: z.string().min(2, 'Parentesco obrigatório'),
  cpf: cpfSchema.optional().or(z.literal('')),
  telefone: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  isResponsavelFinanceiro: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.isResponsavelFinanceiro && !data.cpf?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF obrigatório para responsável financeiro', path: ['cpf'] });
  }
});
type EditResponsavelInput = z.infer<typeof editResponsavelSchema>;

// Schema local: criar/editar autorização de retirada
const autorizacaoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cpf: cpfSchema,
  relacao: z.string().min(2, 'Relação obrigatória'),
  tipo: z.enum(['PERMANENTE', 'TEMPORARIA']),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  horarioInicio: z.string().optional(),
  horarioFim: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo === 'TEMPORARIA' && !data.dataFim) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data fim é obrigatória para autorização temporária', path: ['dataFim'] });
  }
});
type AutorizacaoInput = z.infer<typeof autorizacaoSchema>;

function formatarCPFInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatHorarioInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

interface Responsavel { id: string; nome: string; cpf: string | null; telefone: string | null; email: string | null }
interface AlunoResponsavel { parentesco: string; isResponsavelFinanceiro: boolean; responsavel: Responsavel }
interface Matricula { id: string; status: string; turno: string; valorMensalidade: number; dataInicio: string; dataFim: string | null }
interface MensalidadeResumo {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  status: string;
  valorOriginal: number;
  valorPago: number | null;
  dataPagamento: string | null;
  dataVencimento: string;
}

interface AutorizacaoRetirada {
  id: string;
  nome: string;
  cpf: string;
  relacao: string;
  tipo: 'PERMANENTE' | 'TEMPORARIA';
  dataInicio: string | null;
  dataFim: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
  ativo: boolean;
}

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
  mensalidades: MensalidadeResumo[];
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
const MATR_BADGE: Record<string, string> = {
  ATIVA: 'badge-green',
  ENCERRADA: 'badge-gray',
  CANCELADA: 'badge-red',
};
const MATR_STATUS_LABEL: Record<string, string> = {
  ATIVA: 'Ativa',
  ENCERRADA: 'Encerrada',
  CANCELADA: 'Cancelada',
};
const TURNO_LABEL: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde' };
const MENS_BADGE: Record<string, string> = {
  PENDENTE: 'badge-yellow',
  PARCIAL: 'badge-orange',
  PAGO: 'badge-green',
  INADIMPLENTE: 'badge-red',
  CANCELADA: 'badge-gray',
};
const MENS_STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  INADIMPLENTE: 'Inadimplente',
  CANCELADA: 'Cancelada',
};
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
type Tab = 'dados' | 'responsaveis' | 'matricula' | 'autorizacoes';

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ModalField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const hasAsterisk = label.endsWith(' *') || label.endsWith('*');
  const labelText = hasAsterisk ? label.replace(/ ?\*$/, '') : label;
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
        {labelText}{hasAsterisk && <span className="text-crimson-500"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-stone-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-stone-900 dark:text-slate-100">{value}</span>
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
  const { toast, showToast, hideToast } = useToast();
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);
  const [adicionarError, setAdicionarError] = useState<string | null>(null);
  const [editingResponsavel, setEditingResponsavel] = useState<(Responsavel & { isResponsavelFinanceiro: boolean; parentesco: string }) | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [desvinculaError, setDesvinculaError] = useState<string | null>(null);
  const [confirmRemover, setConfirmRemover] = useState<{ id: string; nome: string } | null>(null);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaError, setMatriculaError] = useState<string | null>(null);
  const [showAddAutorizacaoModal, setShowAddAutorizacaoModal] = useState(false);
  const [addAutorizacaoError, setAddAutorizacaoError] = useState<string | null>(null);
  const [editingAutorizacao, setEditingAutorizacao] = useState<AutorizacaoRetirada | null>(null);
  const [editAutorizacaoError, setEditAutorizacaoError] = useState<string | null>(null);
  const [confirmDeleteAutorizacao, setConfirmDeleteAutorizacao] = useState<{ id: string; nome: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: aluno, isLoading } = useQuery<AlunoProfile>({
    queryKey: ['aluno', id],
    queryFn: () => api.get(`/alunos/${id}`).then((r) => r.data),
  });

  const { data: autorizacoes, isLoading: isLoadingAutorizacoes } = useQuery<AutorizacaoRetirada[]>({
    queryKey: ['autorizacoes', id],
    queryFn: () => api.get(`/retiradas/alunos/${id}/autorizacoes`).then((r) => r.data),
    enabled: activeTab === 'autorizacoes',
  });

  const { register: registerAddAuth, handleSubmit: handleAddAuth, reset: resetAddAuth, watch: watchAddAuth, setValue: setValueAddAuth, control: controlAddAuth, formState: { errors: errorsAddAuth } } =
    useForm<AutorizacaoInput>({ resolver: zodResolver(autorizacaoSchema), defaultValues: { tipo: 'PERMANENTE' } });

  const { register: registerEditAuth, handleSubmit: handleEditAuth, reset: resetEditAuth, watch: watchEditAuth, setValue: setValueEditAuth, control: controlEditAuth, formState: { errors: errorsEditAuth } } =
    useForm<AutorizacaoInput>({ resolver: zodResolver(autorizacaoSchema) });

  const tipoAdd = watchAddAuth('tipo');
  const tipoEdit = watchEditAuth('tipo');

  useEffect(() => {
    if (editingAutorizacao) {
      // Prisma retorna timestamps completos (ex: "2026-05-01T00:00:00.000Z")
      // DatePickerInput espera apenas "YYYY-MM-DD" — fatiar os primeiros 10 caracteres
      const toDateOnly = (v: string | null) => (v ? v.slice(0, 10) : '');
      resetEditAuth({
        nome: editingAutorizacao.nome,
        cpf: editingAutorizacao.cpf,
        relacao: editingAutorizacao.relacao,
        tipo: editingAutorizacao.tipo,
        dataInicio: toDateOnly(editingAutorizacao.dataInicio),
        dataFim: toDateOnly(editingAutorizacao.dataFim),
        horarioInicio: editingAutorizacao.horarioInicio ?? '',
        horarioFim: editingAutorizacao.horarioFim ?? '',
      });
    }
  }, [editingAutorizacao, resetEditAuth]);

  const { register: registerAdicionar, handleSubmit: handleAdicionar, reset: resetAdicionar, formState: { errors: errorsAdicionar } } =
    useForm<AddResponsavelInput>({ resolver: zodResolver(addResponsavelSchema), defaultValues: { isResponsavelFinanceiro: false } });

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: errorsEdit } } =
    useForm<EditResponsavelInput>({ resolver: zodResolver(editResponsavelSchema) });

  useEffect(() => {
    if (editingResponsavel) {
      resetEdit({
        nome: editingResponsavel.nome,
        parentesco: editingResponsavel.parentesco,
        cpf: editingResponsavel.cpf ?? '',
        telefone: editingResponsavel.telefone ?? '',
        email: editingResponsavel.email ?? '',
        isResponsavelFinanceiro: !!editingResponsavel.isResponsavelFinanceiro,
      });
    }
  }, [editingResponsavel, resetEdit]);

  // Cria o responsável e já vincula ao aluno em sequência
  const adicionarMutation = useMutation({
    mutationFn: async (data: AddResponsavelInput) => {
      const resp = await api.post<{ id: string }>('/responsaveis', {
        nome: data.nome,
        cpf: data.cpf?.trim() || undefined,
        telefone: data.telefone?.trim() || undefined,
        email: data.email?.trim() || undefined,
      });
      await api.post(`/alunos/${id}/responsaveis`, {
        responsavelId: resp.data.id,
        parentesco: data.parentesco,
        isResponsavelFinanceiro: data.isResponsavelFinanceiro,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno', id] });
      setShowAdicionarModal(false);
      resetAdicionar();
      setAdicionarError(null);
      showToast('Responsável adicionado', 'O responsável foi vinculado ao aluno com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message;
      setAdicionarError(msg && !msg.startsWith('Route ') ? msg : 'Erro ao adicionar responsável. Tente novamente.');
    },
  });

  // Edita os dados pessoais do responsável e o vínculo financeiro
  const editMutation = useMutation({
    mutationFn: async (data: EditResponsavelInput) => {
      await api.patch(`/responsaveis/${editingResponsavel?.id}`, {
        nome: data.nome,
        cpf: data.cpf?.trim() || null,
        telefone: data.telefone?.trim() || null,
        email: data.email?.trim() || null,
      });
      const vinculoMudou = !!data.isResponsavelFinanceiro !== !!editingResponsavel?.isResponsavelFinanceiro
        || data.parentesco !== editingResponsavel?.parentesco;
      if (vinculoMudou) {
        await api.delete(`/alunos/${id}/responsaveis/${editingResponsavel?.id}`);
        try {
          await api.post(`/alunos/${id}/responsaveis`, {
            responsavelId: editingResponsavel?.id,
            parentesco: data.parentesco,
            isResponsavelFinanceiro: data.isResponsavelFinanceiro,
          });
        } catch (postErr) {
          await api.post(`/alunos/${id}/responsaveis`, {
            responsavelId: editingResponsavel?.id,
            parentesco: editingResponsavel?.parentesco,
            isResponsavelFinanceiro: editingResponsavel?.isResponsavelFinanceiro,
          }).catch(() => {});
          const backendMsg = (postErr as AxiosError<{ message: string }>).response?.data?.message;
          throw new Error(backendMsg ?? 'Erro ao atualizar responsável. Tente novamente.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno', id] });
      setEditingResponsavel(null);
      resetEdit();
      setEditError(null);
      showToast('Responsável atualizado', 'As informações foram salvas com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }> | Error) => {
      const msg = (error as AxiosError<{ message: string }>).response?.data?.message ?? (error as Error).message;
      setEditError(msg && !msg.startsWith('Route ') ? msg : 'Erro ao atualizar responsável. Tente novamente.');
    },
  });

  const desvinculaMutation = useMutation({
    mutationFn: (responsavelId: string) => api.delete(`/alunos/${id}/responsaveis/${responsavelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno', id] });
      setDesvinculaError(null);
      showToast('Responsável removido', 'O responsável foi desvinculado do aluno com sucesso.');
    },
    onError: () => setDesvinculaError('Não foi possível remover. Tente novamente.'),
  });

  const now = new Date();
  const { register: registerMatricula, handleSubmit: handleMatricula, reset: resetMatricula, control: controlMatricula, formState: { errors: errorsMatricula } } =
    useForm<CreateMatriculaInput>({ resolver: zodResolver(createMatriculaSchema), defaultValues: { alunoId: id, turno: 'MANHA', dataInicio: now.toISOString().split('T')[0] } });

  const matriculaMutation = useMutation({
    mutationFn: (data: CreateMatriculaInput) => api.post('/matriculas', { ...data, alunoId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno', id] });
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setShowMatriculaModal(false);
      resetMatricula();
      setMatriculaError(null);
      showToast('Matrícula realizada', 'A matrícula foi registrada com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }>) => setMatriculaError(error.response?.data?.message ?? 'Erro ao criar matrícula.'),
  });

  const addAutorizacaoMutation = useMutation({
    mutationFn: (data: AutorizacaoInput) => api.post(`/retiradas/alunos/${id}/autorizacoes`, {
      ...data,
      cpf: data.cpf.replace(/\D/g, ''),
      dataInicio: data.dataInicio || undefined,
      dataFim: data.dataFim || undefined,
      horarioInicio: data.horarioInicio || undefined,
      horarioFim: data.horarioFim || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autorizacoes', id] });
      setShowAddAutorizacaoModal(false);
      resetAddAuth();
      setAddAutorizacaoError(null);
      showToast('Autorização adicionada', 'A autorização de retirada foi cadastrada com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message;
      setAddAutorizacaoError(msg && !msg.startsWith('Route ') ? msg : 'Erro ao adicionar autorização. Tente novamente.');
    },
  });

  const editAutorizacaoMutation = useMutation({
    mutationFn: (data: AutorizacaoInput) => api.patch(`/retiradas/alunos/${id}/autorizacoes/${editingAutorizacao?.id}`, {
      ...data,
      cpf: data.cpf.replace(/\D/g, ''),
      dataInicio: data.dataInicio || undefined,
      dataFim: data.dataFim || undefined,
      horarioInicio: data.horarioInicio || undefined,
      horarioFim: data.horarioFim || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autorizacoes', id] });
      setEditingAutorizacao(null);
      resetEditAuth();
      setEditAutorizacaoError(null);
      showToast('Autorização atualizada', 'As informações foram salvas com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message;
      setEditAutorizacaoError(msg && !msg.startsWith('Route ') ? msg : 'Erro ao atualizar autorização. Tente novamente.');
    },
  });

  const deleteAutorizacaoMutation = useMutation({
    mutationFn: (authId: string) => api.delete(`/retiradas/alunos/${id}/autorizacoes/${authId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autorizacoes', id] });
      setConfirmDeleteAutorizacao(null);
      showToast('Autorização removida', 'A autorização foi removida com sucesso.');
    },
    onError: () => showToast('Erro', 'Não foi possível remover a autorização. Tente novamente.'),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dados', label: 'Dados Pessoais' },
    { key: 'responsaveis', label: 'Responsáveis' },
    { key: 'matricula', label: 'Matrículas' },
    { key: 'autorizacoes', label: 'Autorizações' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
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
        <p className="text-sm text-stone-400 dark:text-slate-500">Aluno não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
              <span className="text-xs text-stone-400 dark:text-slate-500">
                {aluno.turno === 'MANHA' ? 'Manhã' : 'Tarde'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(aluno.status === 'PRE_MATRICULA' || aluno.status === 'INATIVO') && (
            <button
              onClick={() => { setShowMatriculaModal(true); setMatriculaError(null); }}
              className="btn-primary text-sm"
            >
              {aluno.status === 'INATIVO' ? 'Rematricular' : 'Nova Matrícula'}
            </button>
          )}
          <Link href="/alunos" className="btn-ghost text-sm">Voltar</Link>
          <Link href={`/alunos/${id}/editar`} className="btn-secondary text-sm">Editar</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-slate-700 dark:bg-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-stone-900 shadow-sm dark:bg-[#0c0e14] dark:text-slate-100'
                : 'text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-slate-300'
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
          <InfoRow label="Data de nascimento" value={formatDate(aluno.dataNascimento.slice(0, 10))} />
          <InfoRow label="Turno" value={aluno.turno === 'MANHA' ? 'Manhã' : 'Tarde'} />
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
              onClick={() => { setShowAdicionarModal(true); setAdicionarError(null); }}
              className="btn-primary text-sm"
            >
              Adicionar Responsável
            </button>
          </div>

          {desvinculaError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {desvinculaError}
            </div>
          )}

          {aluno.responsaveis.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm text-stone-400 dark:text-slate-500">Nenhum responsável vinculado.</p>
            </div>
          ) : (
            aluno.responsaveis.map((ar) => (
              <div key={ar.responsavel.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 dark:text-slate-100">{ar.responsavel.nome}</span>
                      {ar.isResponsavelFinanceiro && (
                        <span className="badge badge-blue">Responsável Financeiro</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-slate-400">{ar.parentesco}</p>
                    {ar.responsavel.telefone && (
                      <p className="mt-0.5 text-sm text-stone-600 dark:text-slate-400">{ar.responsavel.telefone}</p>
                    )}
                    {ar.responsavel.email && (
                      <p className="text-sm text-stone-600 dark:text-slate-400">{ar.responsavel.email}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => {
                        setEditingResponsavel({ ...ar.responsavel, isResponsavelFinanceiro: ar.isResponsavelFinanceiro, parentesco: ar.parentesco });
                        setEditError(null);
                      }}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { setDesvinculaError(null); setConfirmRemover({ id: ar.responsavel.id, nome: ar.responsavel.nome }); }}
                      className="text-xs font-medium text-crimson-500 hover:text-crimson-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Matrículas */}
      {activeTab === 'matricula' && (
        <div className="space-y-6">
          {/* Tabela de matrículas */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Matrículas</p>
            {aluno.matriculas.length === 0 ? (
              <div className="empty-state">
                <p className="text-sm text-stone-400 dark:text-slate-500">Nenhuma matrícula registrada.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table-base">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">Status</th>
                      <th className="table-th">Turno</th>
                      <th className="table-th">Valor/mês</th>
                      <th className="table-th">Início</th>
                      <th className="table-th">Encerramento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aluno.matriculas.map((m) => (
                      <tr key={m.id} className="table-row">
                        <td className="table-td">
                          <span className={`badge ${MATR_BADGE[m.status] ?? 'badge-gray'}`}>
                            {MATR_STATUS_LABEL[m.status] ?? m.status}
                          </span>
                        </td>
                        <td className="table-td">{TURNO_LABEL[m.turno] ?? m.turno}</td>
                        <td className="table-td">
                          {Number(m.valorMensalidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="table-td">{new Date(m.dataInicio).toLocaleDateString('pt-BR')}</td>
                        <td className="table-td">
                          {m.dataFim ? new Date(m.dataFim).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico de mensalidades */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
              Histórico de Mensalidades {aluno.mensalidades.length > 0 && <span className="ml-1 font-normal normal-case">(últimas {aluno.mensalidades.length})</span>}
            </p>
            {aluno.mensalidades.length === 0 ? (
              <div className="empty-state">
                <p className="text-sm text-stone-400 dark:text-slate-500">Nenhuma mensalidade registrada.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table-base">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">Referência</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Valor</th>
                      <th className="table-th">Pago</th>
                      <th className="table-th">Data Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aluno.mensalidades.map((mens) => (
                      <tr key={mens.id} className="table-row">
                        <td className="table-td font-medium">
                          {MONTH_NAMES[(mens.mesReferencia - 1)] ?? mens.mesReferencia}/{mens.anoReferencia}
                        </td>
                        <td className="table-td">
                          <span className={`badge ${MENS_BADGE[mens.status] ?? 'badge-gray'}`}>
                            {MENS_STATUS_LABEL[mens.status] ?? mens.status}
                          </span>
                        </td>
                        <td className="table-td">
                          {Number(mens.valorOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="table-td">
                          {mens.valorPago != null
                            ? Number(mens.valorPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : '—'}
                        </td>
                        <td className="table-td">
                          {mens.dataPagamento
                            ? new Date(mens.dataPagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Autorizações de Retirada */}
      {activeTab === 'autorizacoes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowAddAutorizacaoModal(true); setAddAutorizacaoError(null); resetAddAuth({ tipo: 'PERMANENTE' }); }}
              className="btn-primary text-sm"
            >
              Nova Autorização
            </button>
          </div>

          {isLoadingAutorizacoes ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
            </div>
          ) : !autorizacoes || autorizacoes.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm text-stone-400 dark:text-slate-500">Nenhuma autorização cadastrada.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {(['PERMANENTE', 'TEMPORARIA'] as const).map((tipo) => {
                const lista = autorizacoes.filter((a) => a.tipo === tipo);
                if (lista.length === 0) return null;
                return (
                  <div key={tipo}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
                      {tipo === 'PERMANENTE' ? 'Permanentes' : 'Temporárias'}
                    </p>
                    <div className="space-y-2">
                      {lista.map((auth) => (
                        <div key={auth.id} className="card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-stone-900 dark:text-slate-100">{auth.nome}</span>
                                <span className={`badge ${auth.tipo === 'PERMANENTE' ? 'badge-green' : 'badge-blue'}`}>
                                  {auth.tipo === 'PERMANENTE' ? 'Permanente' : 'Temporária'}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-stone-500 dark:text-slate-400">{auth.relacao} · CPF: {auth.cpf}</p>
                              {auth.tipo === 'TEMPORARIA' && (
                                <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">
                                  {auth.dataInicio ? new Date(auth.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                                  {' → '}
                                  {auth.dataFim ? new Date(auth.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                                  {auth.horarioInicio && auth.horarioFim && ` · ${auth.horarioInicio}–${auth.horarioFim}`}
                                </p>
                              )}
                              {auth.tipo === 'PERMANENTE' && auth.horarioInicio && auth.horarioFim && (
                                <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">
                                  Horário: {auth.horarioInicio}–{auth.horarioFim}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <button
                                onClick={() => { setEditingAutorizacao(auth); setEditAutorizacaoError(null); }}
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setConfirmDeleteAutorizacao({ id: auth.id, nome: auth.nome })}
                                className="text-xs font-medium text-crimson-500 hover:text-crimson-700"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Adicionar Responsável */}
      {showAdicionarModal && (
        <ModalShell title="Adicionar Responsável" onClose={() => { setShowAdicionarModal(false); resetAdicionar(); setAdicionarError(null); }}>
          <form onSubmit={handleAdicionar((d) => { setAdicionarError(null); adicionarMutation.mutate(d); })} noValidate className="space-y-4">
            <ModalField label="Nome completo" error={errorsAdicionar.nome?.message}>
              <input {...registerAdicionar('nome')} placeholder="Ex: Maria da Silva" className={`input-base ${errorsAdicionar.nome ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Parentesco" error={errorsAdicionar.parentesco?.message}>
              <input {...registerAdicionar('parentesco')} placeholder="Ex: Mãe, Pai, Avó" className={`input-base ${errorsAdicionar.parentesco ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="CPF" error={errorsAdicionar.cpf?.message}>
              <input {...registerAdicionar('cpf')} type="text" autoComplete="off" placeholder="000.000.000-00" maxLength={14} className={`input-base ${errorsAdicionar.cpf ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Telefone">
              <input {...registerAdicionar('telefone')} placeholder="(11) 99999-9999" className="input-base" />
            </ModalField>

            <ModalField label="Email" error={errorsAdicionar.email?.message}>
              <input {...registerAdicionar('email')} type="email" placeholder="email@exemplo.com" className={`input-base ${errorsAdicionar.email ? 'input-error' : ''}`} />
            </ModalField>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" {...registerAdicionar('isResponsavelFinanceiro')} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
              <span className="text-sm text-stone-700 dark:text-slate-300">Responsável financeiro</span>
            </label>

            {adicionarError && <ServerError message={adicionarError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={adicionarMutation.isPending} className="btn-primary flex-1">
                {adicionarMutation.isPending ? 'Salvando…' : 'Adicionar'}
              </button>
              <button type="button" onClick={() => { setShowAdicionarModal(false); resetAdicionar(); setAdicionarError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Editar Responsável */}
      {editingResponsavel && (
        <ModalShell title="Editar Responsável" onClose={() => { setEditingResponsavel(null); resetEdit(); setEditError(null); }}>
          <form onSubmit={handleEditSubmit((d) => { setEditError(null); editMutation.mutate(d); })} noValidate className="space-y-4">
            <ModalField label="Nome completo" error={errorsEdit.nome?.message}>
              <input {...registerEdit('nome')} className={`input-base ${errorsEdit.nome ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Parentesco" error={errorsEdit.parentesco?.message}>
              <input {...registerEdit('parentesco')} placeholder="Ex: Pai" className={`input-base ${errorsEdit.parentesco ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="CPF" error={errorsEdit.cpf?.message}>
              <input {...registerEdit('cpf')} type="text" autoComplete="off" placeholder="000.000.000-00" maxLength={14} className={`input-base ${errorsEdit.cpf ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Telefone">
              <input {...registerEdit('telefone')} placeholder="(11) 99999-9999" className="input-base" />
            </ModalField>

            <ModalField label="Email" error={errorsEdit.email?.message}>
              <input {...registerEdit('email')} type="email" className={`input-base ${errorsEdit.email ? 'input-error' : ''}`} />
            </ModalField>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" {...registerEdit('isResponsavelFinanceiro')} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
              <span className="text-sm text-stone-700 dark:text-slate-300">Responsável financeiro</span>
            </label>

            {editError && <ServerError message={editError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={editMutation.isPending} className="btn-primary flex-1">
                {editMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={() => { setEditingResponsavel(null); resetEdit(); setEditError(null); }} className="btn-secondary">
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
                <option value="MANHA">Manhã</option>
                <option value="TARDE">Tarde</option>
              </select>
            </ModalField>

            <ModalField label="Data de Início" error={errorsMatricula.dataInicio?.message}>
              <Controller
                control={controlMatricula}
                name="dataInicio"
                render={({ field }) => (
                  <DatePickerInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    hasError={!!errorsMatricula.dataInicio}
                    placeholder="Selecione a data"
                  />
                )}
              />
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

      {/* Modal: Confirmar remoção de responsável */}
      {confirmRemover && (
        <ModalShell title="Remover responsável" onClose={() => { setConfirmRemover(null); setDesvinculaError(null); }}>
          <p className="text-sm text-stone-500 dark:text-slate-400">
            Tem certeza que deseja remover <span className="font-medium text-stone-900 dark:text-slate-100">{confirmRemover.nome}</span> como responsável deste aluno?
          </p>
          {desvinculaError && <p className="mt-2 text-xs text-crimson-500">{desvinculaError}</p>}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => {
                desvinculaMutation.mutate(confirmRemover.id, {
                  onSuccess: () => { setConfirmRemover(null); },
                });
              }}
              disabled={desvinculaMutation.isPending}
              className="btn-primary flex-1 bg-crimson-600 hover:bg-crimson-700 focus-visible:ring-crimson-500 disabled:opacity-50"
            >
              {desvinculaMutation.isPending ? 'Removendo…' : 'Remover'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmRemover(null); setDesvinculaError(null); }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal: Adicionar Autorização */}
      {showAddAutorizacaoModal && (
        <ModalShell title="Nova Autorização de Retirada" onClose={() => { setShowAddAutorizacaoModal(false); resetAddAuth(); setAddAutorizacaoError(null); }}>
          <form onSubmit={handleAddAuth((d) => { setAddAutorizacaoError(null); addAutorizacaoMutation.mutate(d); })} noValidate className="space-y-4">
            <ModalField label="Nome completo *" error={errorsAddAuth.nome?.message}>
              <input {...registerAddAuth('nome')} placeholder="Ex: Maria da Silva" className={`input-base ${errorsAddAuth.nome ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="CPF *" error={errorsAddAuth.cpf?.message}>
              <input
                {...registerAddAuth('cpf')}
                placeholder="000.000.000-00"
                maxLength={14}
                autoComplete="off"
                className={`input-base ${errorsAddAuth.cpf ? 'input-error' : ''}`}
                onChange={(e) => setValueAddAuth('cpf', formatarCPFInput(e.target.value))}
              />
            </ModalField>

            <ModalField label="Relação com o aluno *" error={errorsAddAuth.relacao?.message}>
              <input {...registerAddAuth('relacao')} placeholder="Ex: Mãe, Avó, Tio" className={`input-base ${errorsAddAuth.relacao ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Tipo de autorização *" error={errorsAddAuth.tipo?.message}>
              <select {...registerAddAuth('tipo')} className="input-base">
                <option value="PERMANENTE">Permanente</option>
                <option value="TEMPORARIA">Temporária</option>
              </select>
            </ModalField>

            {tipoAdd === 'TEMPORARIA' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Data início" error={errorsAddAuth.dataInicio?.message}>
                    <Controller
                      control={controlAddAuth}
                      name="dataInicio"
                      render={({ field }) => (
                        <DatePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          hasError={!!errorsAddAuth.dataInicio}
                          placeholder="Selecione"
                        />
                      )}
                    />
                  </ModalField>
                  <ModalField label="Data fim *" error={errorsAddAuth.dataFim?.message}>
                    <Controller
                      control={controlAddAuth}
                      name="dataFim"
                      render={({ field }) => (
                        <DatePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          hasError={!!errorsAddAuth.dataFim}
                          placeholder="Selecione"
                        />
                      )}
                    />
                  </ModalField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Horário início" error={errorsAddAuth.horarioInicio?.message}>
                    <Controller
                      control={controlAddAuth}
                      name="horarioInicio"
                      render={({ field }) => (
                        <TimePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          hasError={!!errorsAddAuth.horarioInicio}
                        />
                      )}
                    />
                  </ModalField>
                  <ModalField label="Horário fim" error={errorsAddAuth.horarioFim?.message}>
                    <Controller
                      control={controlAddAuth}
                      name="horarioFim"
                      render={({ field }) => (
                        <TimePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          hasError={!!errorsAddAuth.horarioFim}
                        />
                      )}
                    />
                  </ModalField>
                </div>
              </>
            )}

            {tipoAdd === 'PERMANENTE' && (
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Horário início (opcional)">
                  <Controller
                    control={controlAddAuth}
                    name="horarioInicio"
                    render={({ field }) => (
                      <TimePickerInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </ModalField>
                <ModalField label="Horário fim (opcional)">
                  <Controller
                    control={controlAddAuth}
                    name="horarioFim"
                    render={({ field }) => (
                      <TimePickerInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </ModalField>
              </div>
            )}

            {addAutorizacaoError && <ServerError message={addAutorizacaoError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={addAutorizacaoMutation.isPending} className="btn-primary flex-1">
                {addAutorizacaoMutation.isPending ? 'Salvando…' : 'Adicionar'}
              </button>
              <button type="button" onClick={() => { setShowAddAutorizacaoModal(false); resetAddAuth(); setAddAutorizacaoError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Editar Autorização */}
      {editingAutorizacao && (
        <ModalShell title="Editar Autorização" onClose={() => { setEditingAutorizacao(null); resetEditAuth(); setEditAutorizacaoError(null); }}>
          <form onSubmit={handleEditAuth((d) => { setEditAutorizacaoError(null); editAutorizacaoMutation.mutate(d); })} noValidate className="space-y-4">
            <ModalField label="Nome completo *" error={errorsEditAuth.nome?.message}>
              <input {...registerEditAuth('nome')} className={`input-base ${errorsEditAuth.nome ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="CPF *" error={errorsEditAuth.cpf?.message}>
              <input
                {...registerEditAuth('cpf')}
                placeholder="000.000.000-00"
                maxLength={14}
                autoComplete="off"
                className={`input-base ${errorsEditAuth.cpf ? 'input-error' : ''}`}
                onChange={(e) => setValueEditAuth('cpf', formatarCPFInput(e.target.value))}
              />
            </ModalField>

            <ModalField label="Relação com o aluno *" error={errorsEditAuth.relacao?.message}>
              <input {...registerEditAuth('relacao')} className={`input-base ${errorsEditAuth.relacao ? 'input-error' : ''}`} />
            </ModalField>

            <ModalField label="Tipo de autorização *" error={errorsEditAuth.tipo?.message}>
              <select {...registerEditAuth('tipo')} className="input-base">
                <option value="PERMANENTE">Permanente</option>
                <option value="TEMPORARIA">Temporária</option>
              </select>
            </ModalField>

            {tipoEdit === 'TEMPORARIA' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Data início" error={errorsEditAuth.dataInicio?.message}>
                    <Controller
                      control={controlEditAuth}
                      name="dataInicio"
                      render={({ field }) => (
                        <DatePickerInput
                          value={(field.value ?? '').slice(0, 10)}
                          onChange={field.onChange}
                          hasError={!!errorsEditAuth.dataInicio}
                          placeholder="Selecione"
                        />
                      )}
                    />
                  </ModalField>
                  <ModalField label="Data fim *" error={errorsEditAuth.dataFim?.message}>
                    <Controller
                      control={controlEditAuth}
                      name="dataFim"
                      render={({ field }) => (
                        <DatePickerInput
                          value={(field.value ?? '').slice(0, 10)}
                          onChange={field.onChange}
                          hasError={!!errorsEditAuth.dataFim}
                          placeholder="Selecione"
                        />
                      )}
                    />
                  </ModalField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Horário início" error={errorsEditAuth.horarioInicio?.message}>
                    <Controller
                      control={controlEditAuth}
                      name="horarioInicio"
                      render={({ field }) => (
                        <TimePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          hasError={!!errorsEditAuth.horarioInicio}
                        />
                      )}
                    />
                  </ModalField>
                  <ModalField label="Horário fim" error={errorsEditAuth.horarioFim?.message}>
                    <Controller
                      control={controlEditAuth}
                      name="horarioFim"
                      render={({ field }) => (
                        <TimePickerInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          hasError={!!errorsEditAuth.horarioFim}
                        />
                      )}
                    />
                  </ModalField>
                </div>
              </>
            )}

            {tipoEdit === 'PERMANENTE' && (
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Horário início (opcional)">
                  <Controller
                    control={controlEditAuth}
                    name="horarioInicio"
                    render={({ field }) => (
                      <TimePickerInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </ModalField>
                <ModalField label="Horário fim (opcional)">
                  <Controller
                    control={controlEditAuth}
                    name="horarioFim"
                    render={({ field }) => (
                      <TimePickerInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </ModalField>
              </div>
            )}

            {editAutorizacaoError && <ServerError message={editAutorizacaoError} />}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={editAutorizacaoMutation.isPending} className="btn-primary flex-1">
                {editAutorizacaoMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={() => { setEditingAutorizacao(null); resetEditAuth(); setEditAutorizacaoError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Confirmar remoção de autorização */}
      {confirmDeleteAutorizacao && (
        <ModalShell title="Remover autorização" onClose={() => setConfirmDeleteAutorizacao(null)}>
          <p className="text-sm text-stone-500 dark:text-slate-400">
            Tem certeza que deseja remover a autorização de{' '}
            <span className="font-medium text-stone-900 dark:text-slate-100">{confirmDeleteAutorizacao.nome}</span>?
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => deleteAutorizacaoMutation.mutate(confirmDeleteAutorizacao.id)}
              disabled={deleteAutorizacaoMutation.isPending}
              className="btn-primary flex-1 bg-crimson-600 hover:bg-crimson-700 focus-visible:ring-crimson-500 disabled:opacity-50"
            >
              {deleteAutorizacaoMutation.isPending ? 'Removendo…' : 'Remover'}
            </button>
            <button type="button" onClick={() => setConfirmDeleteAutorizacao(null)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </ModalShell>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
