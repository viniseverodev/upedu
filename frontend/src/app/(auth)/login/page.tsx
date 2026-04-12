// Página de login — S001 (Sprint 1)
// React Hook Form + Zod + TanStack Query mutation
// Trata: 401 (credenciais inválidas), 429 (rate limit), primeiro acesso

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { loginSchema, type LoginInput } from '@/schemas/index';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) =>
      api.post<{
        accessToken: string;
        requiresPasswordChange: boolean;
        user: { id: string; nome: string; role: string; filiais: Array<{ filialId: string }> };
      }>('/auth/login', data),
    onSuccess: (response) => {
      const { accessToken, user, requiresPasswordChange } = response.data;
      setAuth(user, accessToken, requiresPasswordChange);

      if (requiresPasswordChange) {
        router.push('/primeiro-acesso');
      } else {
        router.push('/kpis');
      }
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const status = error.response?.status;
      if (status === 429) {
        setServerError(error.response?.data?.message ?? 'Muitas tentativas. Aguarde 15 minutos.');
      } else if (status === 401) {
        setServerError('Credenciais inválidas.');
      } else {
        setServerError('Erro ao fazer login. Tente novamente.');
      }
    },
  });

  function onSubmit(data: LoginInput) {
    setServerError(null);
    loginMutation.mutate(data);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">UpEdu</h1>
          <p className="mt-1 text-sm text-gray-500">Gestão escolar multi-filial</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className={`block w-full rounded-md border px-3 py-2 pr-10 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Erro do servidor — mensagem genérica (não revela qual campo está errado) */}
          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || loginMutation.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
