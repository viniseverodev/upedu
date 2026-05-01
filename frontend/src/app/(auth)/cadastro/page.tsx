'use client';

// Página de cadastro — cria nova organização (conta independente) + admin SUPER_ADMIN

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { registerSchema, type RegisterInput } from '@/schemas/index';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// ---------- Helpers ----------

function maskCnpj(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

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
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-slate-500">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-crimson-400">{error}</p>}
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `block w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all duration-150
   bg-stone-50 text-stone-900 placeholder-stone-400
   dark:bg-white/[0.06] dark:text-white dark:placeholder-slate-600
   ${hasError
    ? 'border-crimson-500/60 focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/20'
    : 'border-stone-200 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:focus:bg-white/[0.08]'
  }`;

// ---------- Página ----------

export default function CadastroPage() {
  const router = useRouter();
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const mutation = useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post<{ message: string; organizacao: string }>('/auth/register', data),
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message ?? '';
      if (msg.includes('CNPJ')) setServerError('CNPJ já cadastrado no sistema.');
      else if (msg.includes('Email') || msg.includes('email')) setServerError('Email já cadastrado no sistema.');
      else setServerError('Erro ao criar conta. Tente novamente.');
    },
  });

  function onSubmit(data: RegisterInput) {
    setServerError(null);
    mutation.mutate(data);
  }

  // ---------- Tela de sucesso ----------
  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-100 dark:bg-[#0c0e14]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand-400/10 blur-[96px] dark:bg-brand-600/10" />
          <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-blue-400/8 blur-[96px] dark:bg-brand-800/8" />
        </div>
        <div className="relative w-full max-w-[380px] px-4 animate-slide-up text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 dark:bg-forest-900/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 text-forest-600 dark:text-forest-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Conta criada com sucesso!</h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
            Sua escola foi cadastrada. Agora faça login para acessar o sistema.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-8 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-700 active:scale-[0.98]"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ---------- Formulário ----------
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-100 dark:bg-[#0c0e14]">
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand-400/10 blur-[96px] dark:bg-brand-600/10" />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-blue-400/8 blur-[96px] dark:bg-brand-800/8" />
      </div>

      {/* Grid sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-[420px] px-4 py-10 animate-slide-up">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-sidebar-light.png" alt="UP Contraturno" className="block dark:hidden h-20 w-20 object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-sidebar-dark.png" alt="UP Contraturno" className="hidden dark:block h-20 w-20 object-contain" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Criar nova conta</h1>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-slate-500">Cadastre sua escola e comece a usar.</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-card-lg dark:backdrop-blur-sm">

          {/* Separador de seção */}
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-slate-600">Dados da escola</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label="Nome da escola" error={errors.nomeEscola?.message}>
              <input
                type="text"
                placeholder="Ex: Escola Municipal Silva"
                {...register('nomeEscola')}
                className={inputCls(!!errors.nomeEscola)}
              />
            </Field>

            <Field label="CNPJ" error={errors.cnpjEscola?.message}>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                maxLength={18}
                {...register('cnpjEscola')}
                onChange={(e) => {
                  const masked = maskCnpj(e.target.value);
                  e.target.value = masked;
                  setValue('cnpjEscola', masked, { shouldValidate: false });
                }}
                className={inputCls(!!errors.cnpjEscola)}
              />
            </Field>

            <div className="border-t border-stone-100 pt-4 dark:border-white/[0.06]">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-slate-600">Administrador</p>
            </div>

            <Field label="Seu nome completo" error={errors.nomeAdmin?.message}>
              <input
                type="text"
                placeholder="Ex: João Silva"
                {...register('nomeAdmin')}
                className={inputCls(!!errors.nomeAdmin)}
              />
            </Field>

            <Field label="E-mail" error={errors.email?.message}>
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={inputCls(!!errors.email)}
              />
            </Field>

            <Field label="Senha" error={errors.senha?.message}>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número"
                  {...register('senha')}
                  className={inputCls(!!errors.senha)}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 transition-colors hover:text-stone-600 dark:text-slate-600 dark:hover:text-slate-400"
                >
                  <EyeIcon open={showSenha} />
                </button>
              </div>
            </Field>

            <Field label="Confirmar senha" error={errors.confirmarSenha?.message}>
              <div className="relative">
                <input
                  type={showConfirmar ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('confirmarSenha')}
                  className={inputCls(!!errors.confirmarSenha)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmar((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 transition-colors hover:text-stone-600 dark:text-slate-600 dark:hover:text-slate-400"
                >
                  <EyeIcon open={showConfirmar} />
                </button>
              </div>
            </Field>

            {serverError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-crimson-500/20 bg-crimson-500/10 px-4 py-3 text-sm text-crimson-600 dark:text-crimson-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-crimson-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                </svg>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all duration-150 hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Criando conta…
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-stone-500 dark:text-slate-500">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
            Entrar
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-stone-400 dark:text-slate-700">
          © {new Date().getFullYear()} UP Contraturno. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
