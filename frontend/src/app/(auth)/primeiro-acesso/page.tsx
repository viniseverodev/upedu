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
    <li className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-forest-400' : 'text-slate-600'}`}>
      {ok ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 opacity-30">
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

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<ChangePasswordInput>({
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0c0e14]">
      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand-600/10 blur-[96px]" />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-brand-800/8 blur-[96px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Theme toggle */}
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-[400px] px-4 animate-slide-up">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 ring-1 ring-brand-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="rgb(99 179 237)" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">Criar nova senha</h1>
            <p className="mt-0.5 text-sm text-slate-500">Primeiro acesso — defina uma senha segura</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-card-lg backdrop-blur-sm">
          <form
            onSubmit={handleSubmit((d) => { setServerError(null); changeMutation.mutate(d); })}
            noValidate
            className="space-y-4"
          >
            {/* Nova senha */}
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Nova senha
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('newPassword')}
                className={`block w-full rounded-lg border bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150
                  ${errors.newPassword
                    ? 'border-crimson-500/60 focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/20'
                    : 'border-white/[0.08] focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 focus:bg-white/[0.08]'
                  }`}
              />

              {/* Barra de força */}
              <div className="mt-2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i < strength
                        ? strength === 1 ? 'bg-crimson-500' : strength === 2 ? 'bg-amber-500' : 'bg-forest-400'
                        : 'bg-white/[0.08]'
                    }`}
                  />
                ))}
              </div>

              <ul className="mt-2.5 space-y-1.5">
                {checks.map((c) => <CheckItem key={c.label} label={c.label} ok={c.ok} />)}
              </ul>

              {errors.newPassword && (
                <p className="mt-1.5 text-xs text-crimson-400">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirmar */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={`block w-full rounded-lg border bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150
                  ${errors.confirmPassword
                    ? 'border-crimson-500/60 focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/20'
                    : 'border-white/[0.08] focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 focus:bg-white/[0.08]'
                  }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-crimson-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Erro servidor */}
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-crimson-500/20 bg-crimson-500/10 px-4 py-3 text-sm text-crimson-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-crimson-400">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                </svg>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || changeMutation.isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
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

            <button
              type="button"
              onClick={() => { logout(); router.push('/login'); }}
              className="w-full text-center text-xs text-slate-600 transition-colors hover:text-slate-400"
            >
              Cancelar e voltar ao login
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-700">
          © {new Date().getFullYear()} UpEdu. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
