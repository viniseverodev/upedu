'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(150),
  horario: z.string().max(150).optional(),
  vagas: z.coerce.number().int().min(1, 'Mínimo 1 vaga').optional().or(z.literal('')),
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

export default function NovaTurmaPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setServerError(null);
    try {
      await api.post(`/oficinas/${id}/turmas`, {
        nome: data.nome,
        horario: data.horario || undefined,
        vagas: data.vagas ? Number(data.vagas) : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['oficinas', id] });
      sessionStorage.setItem('turma-criada', `"${data.nome}" foi criada com sucesso.`);
      router.push(`/oficinas/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setServerError(axiosErr.response?.data?.message ?? 'Erro ao criar turma.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Turma</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">Adicione uma turma à oficina</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Nome da turma" required error={errors.nome?.message}>
            <input {...register('nome')} autoFocus placeholder="Ex: Turma A, Iniciantes, Segunda-feira" className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <Field label="Horário" hint="Ex: Segunda e Quarta, 14h–15h (opcional)">
            <input {...register('horario')} placeholder="Ex: Seg/Qua 14h–15h" className="input-base" />
          </Field>

          <Field label="Vagas" hint="Deixe em branco para vagas ilimitadas">
            <input
              {...register('vagas')}
              type="number"
              min="1"
              placeholder="Ex: 20"
              className={`input-base ${errors.vagas ? 'input-error' : ''}`}
            />
          </Field>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push(`/oficinas/${id}`)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary min-w-32">
              {submitting ? 'Criando…' : 'Criar Turma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
