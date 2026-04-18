// Perfil do usuário — alterar nome, e-mail e senha

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ---------- Schemas ----------

const dadosSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
});

const senhaSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter ao menos 1 maiúscula')
      .regex(/[0-9]/, 'Deve conter ao menos 1 número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type DadosInput = z.infer<typeof dadosSchema>;
type SenhaInput = z.infer<typeof senhaSchema>;

// ---------- Helpers ----------

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
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-crimson-600 dark:text-crimson-400">{error}</p>}
    </div>
  );
}

// ---------- Page ----------

export default function PerfilPage() {
  const { user, updateUser, setAccessToken } = useAuthStore();
  const [dadosSaved, setDadosSaved] = useState(false);
  const [senhaSaved, setSenhaSaved] = useState(false);

  // --- Formulário dados pessoais ---
  const dadosForm = useForm<DadosInput>({
    resolver: zodResolver(dadosSchema),
    defaultValues: { nome: user?.nome ?? '', email: user?.email ?? '' },
  });

  const dadosMutation = useMutation({
    mutationFn: (data: DadosInput) => api.patch('/auth/me', data),
    onSuccess: (res) => {
      updateUser({ nome: res.data.nome, email: res.data.email });
      dadosForm.reset({ nome: res.data.nome, email: res.data.email });
      setDadosSaved(true);
      setTimeout(() => setDadosSaved(false), 3000);
    },
  });

  // --- Formulário alterar senha ---
  const senhaForm = useForm<SenhaInput>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const senhaMutation = useMutation({
    mutationFn: (data: SenhaInput) => api.post('/auth/change-password', data),
    onSuccess: (res) => {
      if (res.data.accessToken) setAccessToken(res.data.accessToken);
      senhaForm.reset();
      setSenhaSaved(true);
      setTimeout(() => setSenhaSaved(false), 3000);
    },
  });

  const initials = user?.nome
    ? user.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <div className="p-6">
      <div className="page-header mb-6">
        <h1 className="page-title">Meu Perfil</h1>
      </div>

      {/* Avatar — topo, largura total */}
      <div className="card mb-6 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-sm">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{user?.nome}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
              {user?.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Duas colunas: Dados Pessoais | Alterar Senha */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Dados pessoais */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">Dados Pessoais</h2>
          <form
            onSubmit={dadosForm.handleSubmit((data) => dadosMutation.mutate(data))}
            className="space-y-4"
          >
            <Field label="Nome completo" error={dadosForm.formState.errors.nome?.message}>
              <input
                {...dadosForm.register('nome')}
                className={`input-base${dadosForm.formState.errors.nome ? ' input-error' : ''}`}
                placeholder="Seu nome completo"
              />
            </Field>
            <Field label="E-mail" error={dadosForm.formState.errors.email?.message}>
              <input
                {...dadosForm.register('email')}
                type="email"
                className={`input-base${dadosForm.formState.errors.email ? ' input-error' : ''}`}
                placeholder="seu@email.com"
              />
            </Field>

            {dadosMutation.isError && (
              <p className="text-sm text-crimson-600 dark:text-crimson-400">
                Erro ao salvar. Tente novamente.
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={dadosMutation.isPending || !dadosForm.formState.isDirty}
                className="btn-primary"
              >
                {dadosMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
              {dadosSaved && (
                <span className="text-sm text-forest-600 dark:text-forest-400">Salvo com sucesso</span>
              )}
            </div>
          </form>
        </div>

        {/* Alterar senha */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">Alterar Senha</h2>
          <form
            onSubmit={senhaForm.handleSubmit((data) => senhaMutation.mutate(data))}
            className="space-y-4"
          >
            <Field label="Senha atual" error={senhaForm.formState.errors.currentPassword?.message}>
              <input
                {...senhaForm.register('currentPassword')}
                type="password"
                className={`input-base${senhaForm.formState.errors.currentPassword ? ' input-error' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Field label="Nova senha" error={senhaForm.formState.errors.newPassword?.message}>
              <input
                {...senhaForm.register('newPassword')}
                type="password"
                className={`input-base${senhaForm.formState.errors.newPassword ? ' input-error' : ''}`}
                placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar nova senha" error={senhaForm.formState.errors.confirmPassword?.message}>
              <input
                {...senhaForm.register('confirmPassword')}
                type="password"
                className={`input-base${senhaForm.formState.errors.confirmPassword ? ' input-error' : ''}`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>

            {senhaMutation.isError && (
              <p className="text-sm text-crimson-600 dark:text-crimson-400">
                {(senhaMutation.error as any)?.response?.data?.message ?? 'Erro ao alterar senha'}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={senhaMutation.isPending}
                className="btn-primary"
              >
                {senhaMutation.isPending ? 'Alterando…' : 'Alterar senha'}
              </button>
              {senhaSaved && (
                <span className="text-sm text-forest-600 dark:text-forest-400">Senha alterada com sucesso</span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
