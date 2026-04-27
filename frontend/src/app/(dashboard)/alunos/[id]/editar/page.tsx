// Edição de aluno — S013 (Sprint 4)
// Layout 2 colunas: dados do aluno (esq) + responsáveis (dir) — igual ao novo

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import api from '@/lib/api';
import { updateAlunoSchema, cpfSchema, type UpdateAlunoInput } from '@/schemas/index';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

// Schema local para adicionar responsável inline
const addRespSchema = z.object({
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
type AddRespInput = z.infer<typeof addRespSchema>;

// Schema local para editar responsável inline
const editRespSchema = z.object({
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
type EditRespInput = z.infer<typeof editRespSchema>;

interface ResponsavelInfo { id: string; nome: string; cpf: string | null; telefone: string | null; email: string | null }
interface AlunoResponsavel { parentesco: string; isResponsavelFinanceiro: boolean; responsavel: ResponsavelInfo }
interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  turno: string;
  status: string;
  observacoes: string | null;
  responsaveis: AlunoResponsavel[];
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

export default function EditarAlunoPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const queryClient = useQueryClient();

  // ── Aluno ──────────────────────────────────────────────────────────────────
  const [serverError, setServerError] = useState<string | null>(null);
  const [showInativarConfirm, setShowInativarConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<UpdateAlunoInput | null>(null);

  const { data: aluno, isLoading } = useQuery<Aluno>({
    queryKey: ['aluno-edit', id],
    queryFn: () => api.get(`/alunos/${id}`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<UpdateAlunoInput>({
    resolver: zodResolver(updateAlunoSchema),
  });


  useEffect(() => {
    if (aluno) {
      reset({
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento.slice(0, 10),
        turno: aluno.turno as UpdateAlunoInput['turno'],
        status: aluno.status as UpdateAlunoInput['status'],
        observacoes: aluno.observacoes ?? undefined,
      });
    }
  }, [aluno, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateAlunoInput) => api.patch(`/alunos/${id}`, data),
    onSuccess: (_, variables) => {
      const nome = variables.nome ?? aluno?.nome ?? 'Aluno';
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      queryClient.invalidateQueries({ queryKey: ['aluno', id] });
      queryClient.removeQueries({ queryKey: ['aluno-edit', id] });
      router.push(`/alunos?updated=${encodeURIComponent(nome)}`);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao atualizar aluno.');
    },
  });

  // ── Responsáveis ──────────────────────────────────────────────────────────
  const { toast, showToast, hideToast } = useToast();
  const [adicionarError, setAdicionarError] = useState<string | null>(null);
  const [editingResp, setEditingResp] = useState<(ResponsavelInfo & { isResponsavelFinanceiro: boolean; parentesco: string }) | null>(null);
  const [editRespError, setEditRespError] = useState<string | null>(null);
  const [desvinculaError, setDesvinculaError] = useState<string | null>(null);
  const [confirmRemover, setConfirmRemover] = useState<{ id: string; nome: string } | null>(null);

  const { register: registerAdd, handleSubmit: handleAdd, reset: resetAdd, formState: { errors: errorsAdd } } =
    useForm<AddRespInput>({ resolver: zodResolver(addRespSchema), defaultValues: { isResponsavelFinanceiro: false } });

  const { register: registerEdit, handleSubmit: handleEditResp, reset: resetEditResp, formState: { errors: errorsEditResp } } =
    useForm<EditRespInput>({ resolver: zodResolver(editRespSchema) });

  useEffect(() => {
    if (editingResp) {
      resetEditResp({
        nome: editingResp.nome,
        parentesco: editingResp.parentesco,
        cpf: editingResp.cpf ?? '',
        telefone: editingResp.telefone ?? '',
        email: editingResp.email ?? '',
        isResponsavelFinanceiro: !!editingResp.isResponsavelFinanceiro,
      });
    }
  }, [editingResp, resetEditResp]);

  const adicionarMutation = useMutation({
    mutationFn: async (data: AddRespInput) => {
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
      queryClient.invalidateQueries({ queryKey: ['aluno-edit', id] });
      resetAdd();
      setAdicionarError(null);
      showToast('Responsável adicionado', 'O responsável foi vinculado ao aluno com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message;
      setAdicionarError(msg && !msg.startsWith('Route ') ? msg : 'Erro ao adicionar responsável. Tente novamente.');
    },
  });

  const editRespMutation = useMutation({
    mutationFn: async (data: EditRespInput) => {
      await api.patch(`/responsaveis/${editingResp?.id}`, {
        nome: data.nome,
        cpf: data.cpf?.trim() || null,
        telefone: data.telefone?.trim() || null,
        email: data.email?.trim() || null,
      });
      const vinculoMudou = !!data.isResponsavelFinanceiro !== !!editingResp?.isResponsavelFinanceiro
        || data.parentesco !== editingResp?.parentesco;
      if (vinculoMudou) {
        await api.delete(`/alunos/${id}/responsaveis/${editingResp?.id}`);
        try {
          await api.post(`/alunos/${id}/responsaveis`, {
            responsavelId: editingResp?.id,
            parentesco: data.parentesco,
            isResponsavelFinanceiro: data.isResponsavelFinanceiro,
          });
        } catch (postErr) {
          // Restaura o vínculo original se o POST falhar
          await api.post(`/alunos/${id}/responsaveis`, {
            responsavelId: editingResp?.id,
            parentesco: editingResp?.parentesco,
            isResponsavelFinanceiro: editingResp?.isResponsavelFinanceiro,
          }).catch(() => {});
          // Propaga a mensagem original do backend
          const backendMsg = (postErr as AxiosError<{ message: string }>).response?.data?.message;
          throw new Error(backendMsg ?? 'Erro ao atualizar responsável. Tente novamente.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno-edit', id] });
      setEditingResp(null);
      resetEditResp();
      setEditRespError(null);
      showToast('Responsável atualizado', 'As informações foram salvas com sucesso.');
    },
    onError: (error: AxiosError<{ message: string }> | Error) => {
      const msg = (error as AxiosError<{ message: string }>).response?.data?.message ?? (error as Error).message;
      setEditRespError(msg && !msg.startsWith('Route ') ? msg : 'Erro ao atualizar responsável. Tente novamente.');
    },
  });

  const desvinculaMutation = useMutation({
    mutationFn: (responsavelId: string) => api.delete(`/alunos/${id}/responsaveis/${responsavelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aluno-edit', id] });
      setDesvinculaError(null);
      showToast('Responsável removido', 'O responsável foi desvinculado do aluno com sucesso.');
    },
    onError: () => setDesvinculaError('Não foi possível remover. Tente novamente.'),
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="card p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
          </div>
          <div className="card p-6 space-y-4">
            {[1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Aluno</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">{aluno?.nome}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((d) => {
          setServerError(null);
          if (d.status === 'INATIVO' && aluno?.status !== 'INATIVO') {
            setPendingData(d);
            setShowInativarConfirm(true);
            return;
          }
          mutation.mutate(d);
        })}
        noValidate
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* ── Coluna esq: Dados do aluno ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/10 dark:bg-brand-600/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-brand-600 dark:text-brand-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Dados do Aluno</h2>
            </div>

            <Field label="Nome completo" error={errors.nome?.message}>
              <input {...register('nome')} className={`input-base ${errors.nome ? 'input-error' : ''}`} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
                <Controller
                  control={control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      hasError={!!errors.dataNascimento}
                      placeholder="Selecionar data"
                    />
                  )}
                />
              </Field>

              <Field label="Turno" error={errors.turno?.message}>
                <select {...register('turno')} className={`input-base ${errors.turno ? 'input-error' : ''}`}>
                  <option value="MANHA">Manhã</option>
                  <option value="TARDE">Tarde</option>
                </select>
              </Field>
            </div>

            <Field label="Situação" error={errors.status?.message}>
              {aluno?.status === 'ATIVO' ? (
                <div className="flex items-center gap-3">
                  <div className="input-base flex flex-1 cursor-not-allowed items-center gap-2 bg-stone-50 dark:bg-white/[0.06]">
                    <span className="badge badge-green">Ativo</span>
                    <span className="text-sm text-stone-500 dark:text-slate-400">Matrícula ativa</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPendingData({ status: 'INATIVO' }); setShowInativarConfirm(true); }}
                    className="shrink-0 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700/40 dark:bg-yellow-700/10 dark:text-yellow-400 dark:hover:bg-yellow-700/20"
                  >
                    Inativar
                  </button>
                </div>
              ) : (
                <select {...register('status')} className={`input-base ${errors.status ? 'input-error' : ''}`}>
                  <option value="PRE_MATRICULA">Pré-Matrícula</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="LISTA_ESPERA">Lista de Espera</option>
                </select>
              )}
            </Field>

            <Field label="Observações" error={errors.observacoes?.message}>
              <textarea {...register('observacoes')} rows={3} className={`input-base resize-none ${errors.observacoes ? 'input-error' : ''}`} />
            </Field>
          </div>

          {/* ── Coluna dir: Responsáveis ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/10 dark:bg-brand-600/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-brand-600 dark:text-brand-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Responsáveis</h2>
            </div>

            {/* Lista de responsáveis existentes */}
            {desvinculaError && (
              <p className="text-xs text-crimson-500">{desvinculaError}</p>
            )}

            {(aluno?.responsaveis ?? []).length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-slate-500">Nenhum responsável vinculado.</p>
            ) : (
              <div className={`space-y-2 ${(aluno?.responsaveis ?? []).length > 3 ? 'max-h-[17rem] overflow-y-auto pr-1' : ''}`}>
                {(aluno?.responsaveis ?? []).map((ar) => (
                  <div key={ar.responsavel.id} className="rounded-xl border border-stone-200 p-3 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-stone-900 dark:text-slate-100">{ar.responsavel.nome}</span>
                          {ar.isResponsavelFinanceiro && (
                            <span className="badge badge-blue text-xs">Financeiro</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-slate-400">{ar.parentesco}</p>
                        {ar.responsavel.telefone && <p className="text-xs text-stone-500 dark:text-slate-400">{ar.responsavel.telefone}</p>}
                        {ar.responsavel.email && <p className="text-xs text-stone-500 dark:text-slate-400">{ar.responsavel.email}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingResp({ ...ar.responsavel, isResponsavelFinanceiro: ar.isResponsavelFinanceiro, parentesco: ar.parentesco }); setEditRespError(null); }}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDesvinculaError(null); setConfirmRemover({ id: ar.responsavel.id, nome: ar.responsavel.nome }); }}
                          className="text-xs font-medium text-crimson-500 hover:text-crimson-700"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário inline: adicionar responsável */}
            <div className="space-y-3 border-t border-stone-100 pt-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Adicionar responsável</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome" error={errorsAdd.nome?.message}>
                  <input {...registerAdd('nome')} placeholder="Ex: João da Silva" className={`input-base ${errorsAdd.nome ? 'input-error' : ''}`} />
                </Field>
                <Field label="Parentesco" error={errorsAdd.parentesco?.message}>
                  <input {...registerAdd('parentesco')} placeholder="Ex: Pai" className={`input-base ${errorsAdd.parentesco ? 'input-error' : ''}`} />
                </Field>
              </div>

              <Field label="CPF" error={errorsAdd.cpf?.message}>
                <input {...registerAdd('cpf')} type="text" autoComplete="off" placeholder="000.000.000-00" maxLength={14} className={`input-base ${errorsAdd.cpf ? 'input-error' : ''}`} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone">
                  <input {...registerAdd('telefone')} placeholder="(11) 99999-9999" className="input-base" />
                </Field>
                <Field label="E-mail" error={errorsAdd.email?.message}>
                  <input {...registerAdd('email')} type="email" placeholder="email@ex.com" className={`input-base ${errorsAdd.email ? 'input-error' : ''}`} />
                </Field>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" {...registerAdd('isResponsavelFinanceiro')} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
                <span className="text-sm text-stone-700 dark:text-slate-300">Responsável financeiro</span>
              </label>

              {adicionarError && <p className="text-xs text-crimson-500">{adicionarError}</p>}

              <button
                type="button"
                onClick={() => handleAdd((d) => { setAdicionarError(null); adicionarMutation.mutate(d); })()}
                disabled={adicionarMutation.isPending}
                className="btn-secondary w-full text-sm"
              >
                {adicionarMutation.isPending ? 'Adicionando…' : '+ Adicionar responsável'}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback de erro */}
        {serverError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
            {serverError}
          </div>
        )}

        {/* Confirmação inativar */}
        {showInativarConfirm && (
          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 dark:border-yellow-700/40 dark:bg-yellow-700/10">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Inativar este aluno?</p>
            <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
              A matrícula ativa será encerrada e mensalidades pendentes serão canceladas.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowInativarConfirm(false); mutation.mutate(pendingData ?? { status: 'INATIVO' }); }}
                className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
              >
                Confirmar inativação
              </button>
              <button type="button" onClick={() => setShowInativarConfirm(false)} className="btn-ghost text-xs">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.push('/alunos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary min-w-36">
            {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {/* Modal: Editar dados do responsável */}
      {editingResp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">Editar Responsável</h2>
              <button onClick={() => { setEditingResp(null); resetEditResp(); setEditRespError(null); }} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditResp((d) => { setEditRespError(null); editRespMutation.mutate(d); })} noValidate className="space-y-4">
              <Field label="Nome completo" error={errorsEditResp.nome?.message}>
                <input {...registerEdit('nome')} className={`input-base ${errorsEditResp.nome ? 'input-error' : ''}`} />
              </Field>
              <Field label="Parentesco" error={errorsEditResp.parentesco?.message}>
                <input {...registerEdit('parentesco')} placeholder="Ex: Pai" className={`input-base ${errorsEditResp.parentesco ? 'input-error' : ''}`} />
              </Field>
              <Field label="CPF" error={errorsEditResp.cpf?.message}>
                <input {...registerEdit('cpf')} type="text" autoComplete="off" placeholder="000.000.000-00" maxLength={14} className={`input-base ${errorsEditResp.cpf ? 'input-error' : ''}`} />
              </Field>
              <Field label="Telefone">
                <input {...registerEdit('telefone')} placeholder="(11) 99999-9999" className="input-base" />
              </Field>
              <Field label="E-mail" error={errorsEditResp.email?.message}>
                <input {...registerEdit('email')} type="email" className={`input-base ${errorsEditResp.email ? 'input-error' : ''}`} />
              </Field>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" {...registerEdit('isResponsavelFinanceiro')} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
                <span className="text-sm text-stone-700 dark:text-slate-300">Responsável financeiro</span>
              </label>
              {editRespError && <p className="text-xs text-crimson-500">{editRespError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={editRespMutation.isPending} className="btn-primary flex-1">
                  {editRespMutation.isPending ? 'Salvando…' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setEditingResp(null); resetEditResp(); setEditRespError(null); }} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* Modal: Confirmar remoção de responsável */}
      {confirmRemover && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">Remover responsável</h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
              Tem certeza que deseja remover <span className="font-medium text-stone-900 dark:text-slate-100">{confirmRemover.nome}</span> como responsável deste aluno?
            </p>
            {desvinculaError && <p className="mt-2 text-xs text-crimson-500">{desvinculaError}</p>}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  desvinculaMutation.mutate(confirmRemover.id, {
                    onSuccess: () => setConfirmRemover(null),
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
          </div>
        </div>,
        document.body,
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
