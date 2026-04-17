// Página de primeiro acesso — S004
// Troca de senha obrigatória com validação de força

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
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { z } from 'zod';

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

function CheckItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-forest-500 dark:text-forest-300' : 'text-gray-400 dark:text-slate-600'}`}>
      {ok ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 opacity-40">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
      )}
      {label}
    </li>
  );
}

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { logout, setAuth, user } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changeMutation = useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      await api.post('/auth/change-password', { newPassword: data.newPassword, confirmPassword: data.confirmPassword });
      const refreshRes = await api.post<{ accessToken: string }>('/auth/refresh');
      return refreshRes.data.accessToken;
    },
    onSuccess: (newAccessToken) => {
      if (user) setAuth(user, newAccessToken, false);
      router.push('/kpis');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao alterar senha. Tente novamente.');
    },
  });

  const newPasswordValue = watch('newPassword', '');
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: newPasswordValue.length >= 8 },
    { label: '1 letra maiúscula (A-Z)', ok: /[A-Z]/.test(newPasswordValue) },
    { label: '1 número (0-9)', ok: /[0-9]/.test(newPasswordValue) },
  ];
  const strength = checks.filter((c) => c.ok).length;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
      {/* Fundo decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-600/8 blur-3xl dark:bg-brand-600/10" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-700/8 blur-3xl dark:bg-brand-700/10" />
      </div>

      <div className="absolute right-5 top-5"><ThemeToggle /></div>

      <div className="relative w-full max-w-[400px] px-4">
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-brand-700 px-8 py-7 dark:bg-brand-800">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="white" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white">Criar nova senha</h1>
            <p className="mt-0.5 text-sm text-white/70">Primeiro acesso — defina uma senha segura</p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit((d) => { setServerError(null); changeMutation.mutate(d); })} noValidate className="space-y-4">
              {/* Nova senha */}
              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Nova senha
                </label>
                <input id="newPassword" type="password" autoComplete="new-password" placeholder="••••••••" {...register('newPassword')} className={`input-base ${errors.newPassword ? 'input-error' : ''}`} />

                {/* Barra de força */}
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? strength === 1 ? 'bg-crimson-500' : strength === 2 ? 'bg-yellow-500' : 'bg-forest-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
                  ))}
                </div>

                <ul className="mt-2 space-y-1">
                  {checks.map((c) => <CheckItem key={c.label} label={c.label} ok={c.ok} />)}
                </ul>

                {errors.newPassword && <p className="mt-1 text-xs text-crimson-500">{errors.newPassword.message}</p>}
              </div>

              {/* Confirmar */}
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Confirmar senha
                </label>
                <input id="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" {...register('confirmPassword')} className={`input-base ${errors.confirmPassword ? 'input-error' : ''}`} />
                {errors.confirmPassword && <p className="mt-1 text-xs text-crimson-500">{errors.confirmPassword.message}</p>}
              </div>

              {serverError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
                  {serverError}
                </div>
              )}

              <button type="submit" disabled={changeMutation.isPending} className="btn-primary w-full">
                {changeMutation.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Salvando…
                  </>
                ) : 'Definir senha e continuar'}
              </button>

              <button type="button" onClick={() => { logout(); router.push('/login'); }} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:text-slate-600 dark:hover:text-slate-400">
                Cancelar e voltar ao login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
