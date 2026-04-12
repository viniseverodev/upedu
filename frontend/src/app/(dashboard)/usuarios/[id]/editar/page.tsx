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

interface UserFilial {
  filialId: string;
}

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  filiais: UserFilial[];
}

interface Filial {
  id: string;
  nome: string;
}

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
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

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  if (loadingUser) {
    return <div className="text-center text-gray-400 py-12">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Usuário</h1>
        <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
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
            <input {...register('nome')} className={inputClass(!!errors.nome)} />
          </Field>

          <Field label="Role" error={errors.role?.message}>
            <select {...register('role')} className={inputClass(!!errors.role)}>
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Filiais de acesso" error={errors.filialIds?.message}>
            <div className="space-y-2 rounded-md border border-gray-300 p-3 max-h-48 overflow-y-auto">
              {filiais.map((f) => (
                <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={f.id}
                    {...register('filialIds')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{f.nome}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* Toggle de ativação */}
          <div className="flex items-center gap-3 rounded-md border p-3">
            <input
              {...register('ativo')}
              type="checkbox"
              id="ativo"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700">
              Usuário ativo
            </label>
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          {/* Confirmação de desativação */}
          {showDeactivateConfirm && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">
                Desativar este usuário imediatamente?
              </p>
              <p className="mt-1 text-xs text-yellow-700">
                Todas as sessões ativas serão encerradas e o acesso será bloqueado.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeactivateConfirm(false); mutation.mutate(pendingData ?? { ativo: false }); }}
                  className="rounded bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
                >
                  Confirmar desativação
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
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
