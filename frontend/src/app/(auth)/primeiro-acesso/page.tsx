// Página de primeiro acesso — S004 (Sprint 2)
// Troca de senha obrigatória com validação de força
// Após sucesso: limpa o estado de primeiro acesso e redireciona para /kpis

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { changePasswordSchema } from '@/schemas/index';
import type { z } from 'zod';

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: '1 letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: '1 número', ok: /[0-9]/.test(password) },
  ];
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(({ label, ok }) => (
        <li key={label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
          <span>{ok ? '✓' : '○'}</span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { logout, setAuth, user, isAuthenticated } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [watchPassword, setWatchPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changeMutation = useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      api.post('/auth/change-password', { newPassword: data.newPassword, confirmPassword: data.confirmPassword }),
    onSuccess: () => {
      // Atualizar o store para remover o requiresPasswordChange
      if (user) {
        setAuth(user, useAuthStore.getState().accessToken ?? '', false);
      }
      router.push('/kpis');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao alterar senha. Tente novamente.');
    },
  });

  function onSubmit(data: ChangePasswordInput) {
    setServerError(null);
    changeMutation.mutate(data);
  }

  // Observar senha para o indicador de força
  const newPasswordValue = watch('newPassword', '');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Criar nova senha</h1>
          <p className="mt-1 text-sm text-gray-500">
            Este é seu primeiro acesso. Defina uma senha segura para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nova senha */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register('newPassword', {
                onChange: (e) => setWatchPassword(e.target.value),
              })}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.newPassword ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            <PasswordStrength password={newPasswordValue} />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirmar senha */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <button
            type="submit"
            disabled={changeMutation.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changeMutation.isPending ? 'Salvando…' : 'Definir senha e continuar'}
          </button>

          <button
            type="button"
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
          >
            Cancelar e voltar ao login
          </button>
        </form>
      </div>
    </div>
  );
}
