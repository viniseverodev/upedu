'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  descricao: z.string().max(500).optional(),
  valor: z.coerce.number({ invalid_type_error: 'Valor inválido' }).min(0, 'Valor não pode ser negativo'),
});

type FormData = z.infer<typeof schema>;

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
        {label}{required && <span className="ml-0.5 text-crimson-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

export default function NovaOficinaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { valor: 0 },
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setServerError(null);
    try {
      await api.post('/oficinas', data);
      await queryClient.invalidateQueries({ queryKey: ['oficinas'] });
      router.push('/oficinas');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setServerError(axiosErr.response?.data?.message ?? 'Erro ao criar oficina.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Oficina</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">Preencha os dados da oficina</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Nome da oficina" required error={errors.nome?.message}>
            <input {...register('nome')} autoFocus placeholder="Ex: Oficina de Inglês" className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <Field label="Descrição" hint="Breve descrição da oficina (opcional)">
            <textarea {...register('descricao')} rows={3} placeholder="Ex: Aulas de inglês para crianças de 6 a 12 anos…" className="input-base resize-none" />
          </Field>

          <Field label="Valor mensal (R$)" required error={errors.valor?.message} hint="Custo adicional cobrado mensalmente">
            <input
              {...register('valor')}
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              className={`input-base ${errors.valor ? 'input-error' : ''}`}
            />
          </Field>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/oficinas')} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary min-w-32">
              {submitting ? 'Criando…' : 'Criar Oficina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
