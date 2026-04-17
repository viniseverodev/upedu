// Cadastro de responsável — S018 (Sprint 5)
// CPF com máscara e validação módulo 11

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { createResponsavelSchema, type CreateResponsavelInput } from '@/schemas/index';

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</label>
      {hint && <p className="mb-1 text-xs text-gray-400 dark:text-slate-500">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function NovoResponsavelPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateResponsavelInput>({
    resolver: zodResolver(createResponsavelSchema),
  });

  const { onChange: cpfOnChange, ...cpfRest } = register('cpf');

  const mutation = useMutation({
    mutationFn: (data: CreateResponsavelInput) => api.post('/responsaveis', data),
    onSuccess: (res) => router.push(`/responsaveis/${res.data.id}`),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar responsável.');
    },
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Responsável</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">CPF e RG são criptografados — LGPD Art. 46</p>
        </div>
        <button type="button" onClick={() => router.push('/responsaveis')} className="btn-ghost text-sm">Cancelar</button>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })} noValidate className="space-y-4">
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} placeholder="Ex: Ana Souza" className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <Field label="CPF" error={errors.cpf?.message} hint="Formato: 000.000.000-00 (opcional)">
            <input
              {...cpfRest}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`input-base ${errors.cpf ? 'input-error' : ''}`}
              onChange={(e) => {
                const masked = maskCpf(e.target.value);
                e.target.value = masked;
                setValue('cpf', masked, { shouldValidate: false });
                cpfOnChange(e);
              }}
            />
          </Field>

          <Field label="RG" error={errors.rg?.message} hint="Opcional">
            <input {...register('rg')} className={`input-base ${errors.rg ? 'input-error' : ''}`} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone" error={errors.telefone?.message}>
              <input {...register('telefone')} placeholder="(11) 99999-9999" className={`input-base ${errors.telefone ? 'input-error' : ''}`} />
            </Field>

            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="ana@email.com" className={`input-base ${errors.email ? 'input-error' : ''}`} />
            </Field>
          </div>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Cadastrando…' : 'Cadastrar responsável'}
            </button>
            <button type="button" onClick={() => router.push('/responsaveis')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
