// Cadastro de filial — S006 (Sprint 2)

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { createFilialSchema, type CreateFilialInput } from '@/schemas/index';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

export default function NovaFilialPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFilialInput>({
    resolver: zodResolver(createFilialSchema),
    defaultValues: { diaVencimento: 10 },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateFilialInput) => api.post('/filiais', data),
    onSuccess: (_, vars) => router.push(`/filiais?created=${encodeURIComponent(vars.nome)}`),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar filial.');
    },
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Filial</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">Preencha os dados da nova unidade.</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })} noValidate className="space-y-4">
          <Field label="Nome da filial" error={errors.nome?.message}>
            <input {...register('nome')} placeholder="Ex: Filial Centro" className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <Field label="CNPJ" error={errors.cnpj?.message}>
            <input {...register('cnpj')} placeholder="XX.XXX.XXX/XXXX-XX" maxLength={18} className={`input-base ${errors.cnpj ? 'input-error' : ''}`} />
          </Field>

          <Field label="Dia de vencimento (1–28)" error={errors.diaVencimento?.message}>
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
                placeholder="1200.00"
                className={`input-base ${errors.valorMensalidadeManha ? 'input-error' : ''}`}
              />
            </Field>

            <Field label="Mensalidade tarde (R$)" error={errors.valorMensalidadeTarde?.message}>
              <input
                {...register('valorMensalidadeTarde')}
                type="number"
                step="0.01"
                min="0"
                placeholder="700.00"
                className={`input-base ${errors.valorMensalidadeTarde ? 'input-error' : ''}`}
              />
            </Field>
          </div>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Salvando…' : 'Cadastrar filial'}
            </button>
            <button type="button" onClick={() => router.push('/filiais')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
