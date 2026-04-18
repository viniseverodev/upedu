// Edição de aluno — S013 (Sprint 4)

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { updateAlunoSchema, type UpdateAlunoInput } from '@/schemas/index';
import { DatePickerModal, fmtDateBR } from '@/components/ui/DatePickerModal';

interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  turno: string;
  status: string;
  observacoes: string | null;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</label>
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [showInativarConfirm, setShowInativarConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<UpdateAlunoInput | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: aluno, isLoading } = useQuery<Aluno>({
    queryKey: ['aluno-edit', id],
    queryFn: () => api.get(`/alunos/${id}`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UpdateAlunoInput>({
    resolver: zodResolver(updateAlunoSchema),
  });

  const dataNascimento = watch('dataNascimento');

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
      // Invalida cache da lista e do perfil para refletir as alterações imediatamente
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      queryClient.invalidateQueries({ queryKey: ['aluno', id] });
      router.push(`/alunos?updated=${encodeURIComponent(nome)}`);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao atualizar aluno.');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="card p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Aluno</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">{aluno?.nome}</p>
        </div>
        <button type="button" onClick={() => router.push('/alunos')} className="btn-ghost text-sm">Cancelar</button>
      </div>

      <div className="card p-6">
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
          className="space-y-4"
        >
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
              {/* Campo oculto registrado no RHF — valor definido via DatePickerModal */}
              <input type="hidden" {...register('dataNascimento')} />
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={`input-base flex items-center justify-between text-left ${
                  errors.dataNascimento ? 'input-error' : ''
                } ${!dataNascimento ? 'text-gray-400 dark:text-slate-500' : ''}`}
              >
                <span>{dataNascimento ? fmtDateBR(dataNascimento) : 'Selecionar data'}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </button>
            </Field>

            <Field label="Turno" error={errors.turno?.message}>
              <select {...register('turno')} className={`input-base ${errors.turno ? 'input-error' : ''}`}>
                <option value="MANHA">Manhã</option>
                <option value="TARDE">Tarde</option>
              </select>
            </Field>
          </div>

          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')} className={`input-base ${errors.status ? 'input-error' : ''}`}>
              <option value="PRE_MATRICULA">Pré-Matrícula</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="LISTA_ESPERA">Lista de Espera</option>
            </select>
          </Field>

          <Field label="Observações" error={errors.observacoes?.message}>
            <textarea {...register('observacoes')} rows={3} className={`input-base resize-none ${errors.observacoes ? 'input-error' : ''}`} />
          </Field>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          {showInativarConfirm && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 dark:border-yellow-700/40 dark:bg-yellow-700/10">
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
                <button
                  type="button"
                  onClick={() => setShowInativarConfirm(false)}
                  className="btn-ghost text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button type="button" onClick={() => router.push('/alunos')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>

      {/* DatePickerModal — mesmo componente do cadastro */}
      {showDatePicker && (
        <DatePickerModal
          value={dataNascimento ?? ''}
          onSelect={(d) => setValue('dataNascimento', d, { shouldValidate: true })}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}
