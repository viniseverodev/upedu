// Edição de filial — S007 (Sprint 2)

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { updateFilialSchema, type UpdateFilialInput } from '@/schemas/index';

interface Filial {
  id: string;
  nome: string;
  cnpj: string;
  diaVencimento: number;
  valorMensalidadeManha: string;
  valorMensalidadeTarde: string;
  ativo: boolean;
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

export default function EditarFilialPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const { data: filial, isLoading } = useQuery<Filial>({
    queryKey: ['filial', id],
    queryFn: () =>
      api.get('/filiais').then((r) => {
        const list: Filial[] = r.data;
        const found = list.find((f) => f.id === id);
        if (!found) throw new Error('Filial não encontrada');
        return found;
      }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateFilialInput>({
    resolver: zodResolver(updateFilialSchema),
  });

  useEffect(() => {
    if (filial) {
      reset({
        nome: filial.nome,
        cnpj: filial.cnpj,
        diaVencimento: filial.diaVencimento,
        valorMensalidadeManha: Number(filial.valorMensalidadeManha),
        valorMensalidadeTarde: Number(filial.valorMensalidadeTarde),
        ativo: filial.ativo,
      });
    }
  }, [filial, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateFilialInput) => api.patch(`/filiais/${id}`, data),
    onSuccess: () => router.push(`/filiais?updated=${encodeURIComponent(filial?.nome ?? 'Filial')}`),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao atualizar filial.');
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
          <h1 className="page-title">Editar Filial</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">{filial?.nome}</p>
        </div>
      </div>

      <div className="card p-6">
        <form
          onSubmit={handleSubmit((d) => {
            setServerError(null);
            if (d.ativo === false && filial?.ativo === true) {
              setShowDeactivateConfirm(true);
              return;
            }
            mutation.mutate(d);
          })}
          noValidate
          className="space-y-4"
        >
          <Field label="Nome da filial" error={errors.nome?.message}>
            <input {...register('nome')} className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <Field label="CNPJ" error={errors.cnpj?.message}>
            <input {...register('cnpj')} maxLength={18} className={`input-base ${errors.cnpj ? 'input-error' : ''}`} />
          </Field>

          <Field label="Dia de vencimento" error={errors.diaVencimento?.message}>
            <select {...register('diaVencimento')} className={`input-base ${errors.diaVencimento ? 'input-error' : ''}`}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mensalidade manhã (R$)" error={errors.valorMensalidadeManha?.message}>
              <input
                {...register('valorMensalidadeManha')}
                type="number"
                step="0.01"
                min="0"
                className={`input-base ${errors.valorMensalidadeManha ? 'input-error' : ''}`}
              />
            </Field>

            <Field label="Mensalidade tarde (R$)" error={errors.valorMensalidadeTarde?.message}>
              <input
                {...register('valorMensalidadeTarde')}
                type="number"
                step="0.01"
                min="0"
                className={`input-base ${errors.valorMensalidadeTarde ? 'input-error' : ''}`}
              />
            </Field>
          </div>

          {/* Toggle de ativação */}
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-slate-700">
            <input
              {...register('ativo')}
              type="checkbox"
              id="ativo"
              className="h-4 w-4 rounded border-stone-300 accent-brand-600"
            />
            <label htmlFor="ativo" className="text-sm text-stone-700 dark:text-slate-300">Filial ativa</label>
          </div>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          {showDeactivateConfirm && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 dark:border-yellow-700/40 dark:bg-yellow-700/10">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Desativar esta filial?</p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                A filial deixará de aparecer para seleção. Alunos ativos impedirão a desativação.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeactivateConfirm(false); mutation.mutate({ ativo: false }); }}
                  className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
                >
                  Confirmar desativação
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(false)}
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
            <button type="button" onClick={() => router.push('/filiais')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
