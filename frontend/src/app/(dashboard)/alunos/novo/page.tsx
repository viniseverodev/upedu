// Cadastro de aluno — S012

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { createAlunoSchema, type CreateAlunoInput } from '@/schemas/index';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

export default function NovoAlunoPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateAlunoInput>({
    resolver: zodResolver(createAlunoSchema),
    defaultValues: { status: 'PRE_MATRICULA' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateAlunoInput) => api.post('/alunos', data),
    onSuccess: () => setCreated(true),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar aluno.');
    },
  });

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 dark:bg-forest-700/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-8 w-8 text-forest-500 dark:text-forest-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Aluno cadastrado!</h2>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Registrado com status Pré-Matrícula.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setCreated(false); setServerError(null); }} className="btn-secondary">
              Cadastrar outro
            </button>
            <button onClick={() => router.push('/alunos')} className="btn-primary">
              Ver lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Aluno</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            Requer consentimento parental — LGPD Art. 14
          </p>
        </div>
        <Link href="/alunos" className="btn-ghost text-sm">Cancelar</Link>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })} noValidate className="space-y-4">
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} placeholder="Ex: Maria da Silva" className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
              <input {...register('dataNascimento')} type="date" className={`input-base ${errors.dataNascimento ? 'input-error' : ''}`} />
            </Field>

            <Field label="Turno" error={errors.turno?.message}>
              <select {...register('turno')} className={`input-base ${errors.turno ? 'input-error' : ''}`}>
                <option value="">Selecione…</option>
                <option value="MANHA">Manhã</option>
                <option value="TARDE">Tarde</option>
              </select>
            </Field>
          </div>

          <Field label="Situação" error={errors.status?.message}>
            <select {...register('status')} className={`input-base ${errors.status ? 'input-error' : ''}`}>
              <option value="PRE_MATRICULA">Pré-Matrícula</option>
              <option value="LISTA_ESPERA">Lista de Espera</option>
            </select>
          </Field>

          <Field label="Observações" error={errors.observacoes?.message}>
            <textarea {...register('observacoes')} rows={3} placeholder="Informações adicionais (opcional)" className={`input-base resize-none ${errors.observacoes ? 'input-error' : ''}`} />
          </Field>

          {/* Consentimento LGPD */}
          <div className={`rounded-xl border p-4 ${errors.consentimentoResponsavel ? 'border-crimson-300 bg-crimson-50 dark:border-crimson-700/40 dark:bg-crimson-700/10' : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                value="true"
                {...register('consentimentoResponsavel', { setValueAs: (v) => v === true || v === 'true' })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-brand-600"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">
                Confirmo que o responsável legal forneceu <strong>consentimento parental</strong> para o cadastro e tratamento de dados desta criança conforme a <strong>LGPD Art. 14</strong>.
              </span>
            </label>
            {errors.consentimentoResponsavel && (
              <p className="mt-2 text-xs text-crimson-500">{errors.consentimentoResponsavel.message}</p>
            )}
          </div>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cadastrando…
                </>
              ) : 'Cadastrar aluno'}
            </button>
            <button type="button" onClick={() => router.push('/alunos')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
