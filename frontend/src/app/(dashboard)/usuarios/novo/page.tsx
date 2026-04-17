// Cadastro de usuário — S009

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { usePermission, useRole } from '@/hooks/usePermission';
import { createUserSchema, type CreateUserInput } from '@/schemas/index';

interface Filial { id: string; nome: string }

const ROLES_BY_LEVEL: Record<string, { value: string; label: string }[]> = {
  SUPER_ADMIN: [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'ADMIN_MATRIZ', label: 'Admin Matriz' },
    { value: 'GERENTE_FILIAL', label: 'Gerente de Filial' },
    { value: 'ATENDENTE', label: 'Atendente' },
    { value: 'PROFESSOR', label: 'Professor' },
  ],
  ADMIN_MATRIZ: [
    { value: 'GERENTE_FILIAL', label: 'Gerente de Filial' },
    { value: 'ATENDENTE', label: 'Atendente' },
    { value: 'PROFESSOR', label: 'Professor' },
  ],
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

export default function NovoUsuarioPage() {
  const router = useRouter();
  const callerRole = useRole() ?? 'ATENDENTE';
  const canManage = usePermission('ADMIN_MATRIZ');
  const [serverError, setServerError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const availableRoles = ROLES_BY_LEVEL[callerRole] ?? ROLES_BY_LEVEL['ADMIN_MATRIZ'];

  const { data: filiais = [] } = useQuery<Filial[]>({
    queryKey: ['filiais'],
    queryFn: () => api.get('/filiais').then((r) => r.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { filialIds: [] },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateUserInput) => api.post('/users', data),
    onSuccess: (res) => { setTempPassword(res.data.tempPassword); },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar usuário.');
    },
  });

  if (tempPassword) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 dark:bg-forest-700/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-8 w-8 text-forest-500 dark:text-forest-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Usuário criado!</h2>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Compartilhe a senha temporária. O usuário deverá trocá-la no primeiro acesso.</p>
          </div>
          <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Senha temporária</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-brand-600 dark:text-brand-300">{tempPassword}</p>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-700 dark:border-yellow-700/40 dark:bg-yellow-700/10 dark:text-yellow-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
            Esta senha não será exibida novamente.
          </div>
          <button onClick={() => router.push('/usuarios')} className="btn-primary w-full">Concluir</button>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="empty-state mt-12">
        <p className="text-sm text-gray-400 dark:text-slate-500">Sem permissão para criar usuários.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Usuário</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">Uma senha temporária será gerada automaticamente.</p>
        </div>
        <button type="button" onClick={() => router.push('/usuarios')} className="btn-ghost text-sm">Cancelar</button>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })} noValidate className="space-y-4">
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} placeholder="Ex: João da Silva" className={`input-base ${errors.nome ? 'input-error' : ''}`} />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="joao@escola.com" className={`input-base ${errors.email ? 'input-error' : ''}`} />
          </Field>

          <Field label="Perfil de acesso" error={errors.role?.message}>
            <select {...register('role')} className={`input-base ${errors.role ? 'input-error' : ''}`}>
              <option value="">Selecione…</option>
              {availableRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>

          <Field label="Filiais de acesso" error={errors.filialIds?.message}>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3 dark:border-slate-700">
              {filiais.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma filial disponível.</p>
              ) : (
                filiais.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" value={f.id} {...register('filialIds')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
                    <span className="text-sm text-gray-700 dark:text-slate-300">{f.nome}</span>
                  </label>
                ))
              )}
            </div>
          </Field>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Criando…' : 'Criar usuário'}
            </button>
            <button type="button" onClick={() => router.push('/usuarios')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
