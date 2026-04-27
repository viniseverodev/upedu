// Edição de usuário — S010 (Sprint 3)

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRole } from '@/hooks/usePermission';
import { updateUserSchema, type UpdateUserInput } from '@/schemas/index';

interface UserFilial { filialId: string }
interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  filiais: UserFilial[];
}
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
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const callerRole = useRole() ?? 'ADMIN_MATRIZ';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<UpdateUserInput | null>(null);

  const availableRoles = ROLES_BY_LEVEL[callerRole] ?? ROLES_BY_LEVEL['ADMIN_MATRIZ'];

  const { data: user, isLoading: loadingUser } = useQuery<User>({
    queryKey: ['user', id],
    queryFn: () =>
      api.get('/users').then((r) => {
        const list: User[] = r.data;
        const found = list.find((u) => u.id === id);
        if (!found) throw new Error('Usuário não encontrado');
        return found;
      }),
  });

  const { data: filiais = [] } = useQuery<Filial[]>({
    queryKey: ['filiais'],
    queryFn: () => api.get('/filiais').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        nome: user.nome,
        role: user.role as UpdateUserInput['role'],
        filialIds: user.filiais.map((f) => f.filialId),
        ativo: user.ativo,
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateUserInput) => api.patch(`/users/${id}`, data),
    onSuccess: () => router.push('/usuarios'),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao atualizar usuário.');
    },
  });

  if (loadingUser) {
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
          <h1 className="page-title">Editar Usuário</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">{user?.email}</p>
        </div>
      </div>

      <div className="card p-6">
        <form
          onSubmit={handleSubmit((d) => {
            setServerError(null);
            if (d.ativo === false && user?.ativo === true) {
              setPendingData(d);
              setShowDeactivateConfirm(true);
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

          <Field label="Perfil de acesso" error={errors.role?.message}>
            <select {...register('role')} className={`input-base ${errors.role ? 'input-error' : ''}`}>
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Filiais de acesso" error={errors.filialIds?.message}>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-stone-200 p-3 dark:border-slate-700">
              {filiais.length === 0 ? (
                <p className="text-xs text-stone-400">Nenhuma filial disponível.</p>
              ) : (
                filiais.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" value={f.id} {...register('filialIds')} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
                    <span className="text-sm text-stone-700 dark:text-slate-300">{f.nome}</span>
                  </label>
                ))
              )}
            </div>
          </Field>

          <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-slate-700">
            <input
              {...register('ativo')}
              type="checkbox"
              id="ativo"
              className="h-4 w-4 rounded border-stone-300 accent-brand-600"
            />
            <label htmlFor="ativo" className="text-sm text-stone-700 dark:text-slate-300">Usuário ativo</label>
          </div>

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
              {serverError}
            </div>
          )}

          {showDeactivateConfirm && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 dark:border-yellow-700/40 dark:bg-yellow-700/10">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Desativar este usuário imediatamente?</p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                Todas as sessões ativas serão encerradas e o acesso será bloqueado.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeactivateConfirm(false); mutation.mutate(pendingData ?? { ativo: false }); }}
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
            <button type="button" onClick={() => router.push('/usuarios')} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
