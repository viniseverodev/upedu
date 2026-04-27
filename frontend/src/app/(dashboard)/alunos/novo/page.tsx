// Cadastro de aluno — S012 (refatorado)
// Layout 2 colunas: dados do aluno + responsável opcional em uma só tela

'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { cpfSchema } from '@/schemas';

// ---------- Schema combinado ----------

const schema = z.object({
  // Aluno
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  dataNascimento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida')
    .refine((d) => new Date(d) <= new Date(), 'Data de nascimento não pode ser no futuro'),
  turno: z.enum(['MANHA', 'TARDE'], { required_error: 'Selecione o turno' }),
  status: z.enum(['PRE_MATRICULA', 'LISTA_ESPERA']).default('PRE_MATRICULA'),
  observacoes: z.string().optional(),
  // Responsável (todos opcionais — pode ser vinculado depois)
  respNome: z.string().optional(),
  respCpf: cpfSchema.optional().or(z.literal('')),
  respTelefone: z.string().optional(),
  respEmail: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  respParentesco: z.string().optional(),
  respIsFinanceiro: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.respIsFinanceiro && !data.respCpf?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CPF obrigatório para responsável financeiro',
      path: ['respCpf'],
    });
  }
});

type FormData = z.infer<typeof schema>;

// ---------- Componentes de campo ----------

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-crimson-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-crimson-500">{error}</p>}
    </div>
  );
}

// ---------- Page ----------

export default function NovoAlunoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PRE_MATRICULA', turno: 'MANHA', respIsFinanceiro: false },
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setServerError(null);

    try {
      // 1. Criar aluno (consentimento implícito ao submeter o formulário)
      const alunoRes = await api.post<{ id: string; nome: string }>('/alunos', {
        nome: data.nome,
        dataNascimento: data.dataNascimento,
        turno: data.turno,
        status: data.status,
        observacoes: data.observacoes || undefined,
        consentimentoResponsavel: true,
      });

      const alunoId = alunoRes.data.id;

      // 2. Criar e vincular responsável se o nome foi informado
      let respFailed = false;
      if (data.respNome?.trim()) {
        try {
          const respRes = await api.post<{ id: string }>('/responsaveis', {
            nome: data.respNome.trim(),
            cpf: data.respCpf?.trim() || undefined,
            telefone: data.respTelefone?.trim() || undefined,
            email: data.respEmail?.trim() || undefined,
          });

          await api.post(`/alunos/${alunoId}/responsaveis`, {
            responsavelId: respRes.data.id,
            parentesco: data.respParentesco?.trim() || 'Responsável',
            isResponsavelFinanceiro: data.respIsFinanceiro,
          });
        } catch {
          // Aluno criado — responsável falhou; informa o usuário via toast de aviso
          respFailed = true;
        }
      }

      // Invalida cache e redireciona com nome na URL para exibir toast na listagem
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      const params = new URLSearchParams({ created: data.nome });
      if (respFailed) params.set('respErr', '1');
      router.push(`/alunos?${params.toString()}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setServerError(axiosErr.response?.data?.message ?? 'Erro ao cadastrar aluno. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Formulário ----------

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Aluno</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            Preencha os dados abaixo para realizar o cadastro
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* ── Card: Dados do Aluno ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/10 dark:bg-brand-600/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-brand-600 dark:text-brand-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Dados do Aluno</h2>
            </div>

            <Field label="Nome completo" required error={errors.nome?.message}>
              <input
                {...register('nome')}
                placeholder="Ex: Maria da Silva"
                autoFocus
                className={`input-base ${errors.nome ? 'input-error' : ''}`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Data de nascimento" required error={errors.dataNascimento?.message}>
                <Controller
                  control={control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      hasError={!!errors.dataNascimento}
                      placeholder="Selecionar data"
                    />
                  )}
                />
              </Field>

              <Field label="Turno" required error={errors.turno?.message}>
                <select {...register('turno')} className={`input-base ${errors.turno ? 'input-error' : ''}`}>
                  <option value="MANHA">Manhã</option>
                  <option value="TARDE">Tarde</option>
                </select>
              </Field>
            </div>

            <Field label="Situação" error={errors.status?.message}>
              <select {...register('status')} className="input-base">
                <option value="PRE_MATRICULA">Pré-Matrícula</option>
                <option value="LISTA_ESPERA">Lista de Espera</option>
              </select>
            </Field>

            <Field label="Observações" hint="Informações adicionais sobre o aluno (opcional)">
              <textarea
                {...register('observacoes')}
                rows={3}
                placeholder="Ex: necessidades especiais, alergias, observações pedagógicas…"
                className="input-base resize-none"
              />
            </Field>
          </div>

          {/* ── Card: Responsável ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/10 dark:bg-brand-600/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-brand-600 dark:text-brand-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Responsável</h2>
                <p className="text-xs text-stone-400 dark:text-slate-500">Opcional — pode ser adicionado depois</p>
              </div>
            </div>

            <Field label="Nome do responsável" error={errors.respNome?.message}>
              <input
                {...register('respNome')}
                placeholder="Ex: João da Silva"
                className="input-base"
              />
            </Field>

            <Field label="CPF do responsável" error={errors.respCpf?.message}>
              <input
                {...register('respCpf')}
                type="text"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                className={`input-base ${errors.respCpf ? 'input-error' : ''}`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefone" error={errors.respTelefone?.message}>
                <input
                  {...register('respTelefone')}
                  placeholder="(00) 00000-0000"
                  className="input-base"
                />
              </Field>

              <Field label="Parentesco" hint="Ex: Mãe, Pai, Avó">
                <input
                  {...register('respParentesco')}
                  placeholder="Ex: Mãe"
                  className="input-base"
                />
              </Field>
            </div>

            <Field label="E-mail" error={errors.respEmail?.message}>
              <input
                {...register('respEmail')}
                type="email"
                placeholder="email@exemplo.com"
                className={`input-base ${errors.respEmail ? 'input-error' : ''}`}
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:hover:bg-white/[0.08]">
              <input
                type="checkbox"
                {...register('respIsFinanceiro')}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-slate-200">Responsável financeiro</p>
                <p className="text-xs text-stone-400 dark:text-slate-500">Responsável pelo pagamento das mensalidades</p>
              </div>
            </label>

            {/* Info LGPD sutil */}
            <div className="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-white/[0.06]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-slate-500">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-stone-400 dark:text-slate-500">
                Ao cadastrar, o responsável legal confirma o consentimento parental conforme <strong className="text-stone-500 dark:text-slate-400">LGPD Art. 14</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Erro do servidor */}
        {serverError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
            {serverError}
          </div>
        )}

        {/* Ações */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.push('/alunos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary min-w-36">
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cadastrando…
              </>
            ) : (
              'Cadastrar aluno'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
