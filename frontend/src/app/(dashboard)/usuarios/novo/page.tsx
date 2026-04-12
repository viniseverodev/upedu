// Cadastro de usuário — S009 (Sprint 3)

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

interface Filial {
  id: string;
  nome: string;
}

// Roles que cada nível hierárquico pode criar
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { filialIds: [] },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateUserInput) => api.post('/users', data),
    onSuccess: (res) => {
      setTempPassword(res.data.tempPassword);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar usuário.');
    },
  });

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  // Modal de senha temporária — redireciona ao fechar
  if (tempPassword) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl bg-white p-8 shadow-sm text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Usuário criado!</h2>
          <p className="text-sm text-gray-500">
            Compartilhe a senha temporária com o usuário. Ele será obrigado a trocá-la no primeiro acesso.
          </p>
          <div className="rounded-lg bg-gray-100 px-6 py-4">
            <p className="text-xs text-gray-500 mb-1">Senha temporária</p>
            <p className="font-mono text-xl font-bold text-gray-900 tracking-widest">{tempPassword}</p>
          </div>
          <p className="text-xs text-yellow-600 bg-yellow-50 rounded p-2">
            Esta senha não será exibida novamente.
          </p>
          <button
            onClick={() => router.push('/usuarios')}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return <div className="text-gray-400 text-center py-12">Sem permissão.</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Usuário</h1>
        <p className="mt-1 text-sm text-gray-500">Uma senha temporária será gerada automaticamente.</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })}
          noValidate
          className="space-y-4"
        >
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} className={inputClass(!!errors.nome)} placeholder="Ex: João da Silva" />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" className={inputClass(!!errors.email)} placeholder="joao@escola.com" />
          </Field>

          <Field label="Role" error={errors.role?.message}>
            <select {...register('role')} className={inputClass(!!errors.role)}>
              <option value="">Selecione...</option>
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Filiais de acesso" error={errors.filialIds?.message}>
            <div className="space-y-2 rounded-md border border-gray-300 p-3 max-h-48 overflow-y-auto">
              {filiais.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma filial disponível.</p>
              ) : (
                filiais.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={f.id}
                      {...register('filialIds')}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{f.nome}</span>
                  </label>
                ))
              )}
            </div>
            {errors.filialIds && (
              <p className="mt-1 text-xs text-red-600">{errors.filialIds.message}</p>
            )}
          </Field>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Criando...' : 'Criar usuário'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/usuarios')}
              className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
