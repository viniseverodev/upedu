// Cadastro de aluno — S012
// Layout em abas: Dados do Aluno + Responsável | Ficha Médica

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

// ---------- Constantes ----------

const ANO_ESCOLAR_OPTIONS = [
  { group: 'Educação Infantil', options: ['Berçário', 'Maternal I', 'Maternal II', 'Pré-Escola I (4 anos)', 'Pré-Escola II (5 anos)'] },
  { group: 'Ensino Fundamental I', options: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'] },
  { group: 'Ensino Fundamental II', options: ['6º Ano', '7º Ano'] },
];

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

// ---------- Schema ----------

const schema = z.object({
  // Aluno
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  dataNascimento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida')
    .refine((d) => new Date(d) <= new Date(), 'Data de nascimento não pode ser no futuro'),
  turno: z.enum(['MANHA', 'TARDE'], { required_error: 'Selecione o turno' }),
  status: z.enum(['PRE_MATRICULA', 'LISTA_ESPERA']).default('PRE_MATRICULA'),
  colegio: z.string().max(150).optional(),
  anoEscolar: z.string().optional(),
  observacoes: z.string().optional(),
  // Responsável
  respNome: z.string().optional(),
  respCpf: cpfSchema.optional().or(z.literal('')),
  respTelefone: z.string().optional(),
  respEmail: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  respParentesco: z.string().optional(),
  respIsFinanceiro: z.boolean().default(false),
  // Ficha médica
  tipoSanguineo: z.enum(TIPOS_SANGUINEOS).optional().or(z.literal('')),
  possuiAlergia: z.boolean().default(false),
  alergias: z.string().max(500).optional(),
  medicamentosUso: z.string().max(500).optional(),
  condicoesEspeciais: z.string().max(500).optional(),
  planoSaude: z.string().max(150).optional(),
  observacoesMedicas: z.string().max(1000).optional(),
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
type Tab = 'dados' | 'medica';

// ---------- Componentes ----------

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
  const [activeTab, setActiveTab] = useState<Tab>('dados');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PRE_MATRICULA', turno: 'MANHA', respIsFinanceiro: false, possuiAlergia: false },
  });

  const possuiAlergia = watch('possuiAlergia');

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setServerError(null);

    try {
      const fichaMedica = {
        tipoSanguineo: data.tipoSanguineo || undefined,
        possuiAlergia: data.possuiAlergia,
        alergias: data.alergias?.trim() || undefined,
        medicamentosUso: data.medicamentosUso?.trim() || undefined,
        condicoesEspeciais: data.condicoesEspeciais?.trim() || undefined,
        planoSaude: data.planoSaude?.trim() || undefined,
        observacoesMedicas: data.observacoesMedicas?.trim() || undefined,
      };

      const hasFicha = Object.values(fichaMedica).some((v) => v !== undefined && v !== false);

      const alunoRes = await api.post<{ id: string; nome: string }>('/alunos', {
        nome: data.nome,
        dataNascimento: data.dataNascimento,
        turno: data.turno,
        status: data.status,
        colegio: data.colegio?.trim() || undefined,
        anoEscolar: data.anoEscolar || undefined,
        observacoes: data.observacoes || undefined,
        consentimentoResponsavel: true,
        fichaMedica: hasFicha ? fichaMedica : undefined,
      });

      const alunoId = alunoRes.data.id;

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
          respFailed = true;
        }
      }

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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dados',
      label: 'Dados do Aluno',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
        </svg>
      ),
    },
    {
      id: 'medica',
      label: 'Ficha Médica',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      ),
    },
  ];

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

      {/* Abas */}
      <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-slate-700 dark:bg-white/[0.04]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-stone-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-stone-500 hover:text-stone-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── Aba: Dados do Aluno + Responsável ── */}
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Card: Dados do Aluno */}
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

              <div className="grid grid-cols-2 gap-4">
                <Field label="Colégio que frequenta" error={errors.colegio?.message}>
                  <input
                    {...register('colegio')}
                    placeholder="Ex: Escola Estadual Silva"
                    className="input-base"
                  />
                </Field>

                <Field label="Ano escolar" error={errors.anoEscolar?.message}>
                  <select {...register('anoEscolar')} className="input-base">
                    <option value="">Selecionar…</option>
                    {ANO_ESCOLAR_OPTIONS.map(({ group, options }) => (
                      <optgroup key={group} label={group}>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Observações" hint="Informações adicionais sobre o aluno (opcional)">
                <textarea
                  {...register('observacoes')}
                  rows={3}
                  placeholder="Ex: necessidades especiais, alergias, observações pedagógicas…"
                  className="input-base resize-none"
                />
              </Field>
            </div>

            {/* Card: Responsável */}
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
                <input {...register('respNome')} placeholder="Ex: João da Silva" className="input-base" />
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
                  <input {...register('respTelefone')} placeholder="(00) 00000-0000" className="input-base" />
                </Field>
                <Field label="Parentesco" hint="Ex: Mãe, Pai, Avó">
                  <input {...register('respParentesco')} placeholder="Ex: Mãe" className="input-base" />
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
                <input type="checkbox" {...register('respIsFinanceiro')} className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-slate-200">Responsável financeiro</p>
                  <p className="text-xs text-stone-400 dark:text-slate-500">Responsável pelo pagamento das mensalidades</p>
                </div>
              </label>

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
        )}

        {/* ── Aba: Ficha Médica ── */}
        {activeTab === 'medica' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Card: Saúde Geral */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4 dark:border-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-500/10 dark:bg-crimson-500/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-crimson-500 dark:text-crimson-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Saúde Geral</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo sanguíneo">
                  <select {...register('tipoSanguineo')} className="input-base">
                    <option value="">Não informado</option>
                    {TIPOS_SANGUINEOS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Plano de saúde">
                  <input
                    {...register('planoSaude')}
                    placeholder="Ex: Unimed"
                    className="input-base"
                  />
                </Field>
              </div>

              {/* Alergias */}
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:hover:bg-white/[0.08]">
                  <input type="checkbox" {...register('possuiAlergia')} className="h-4 w-4 rounded border-stone-300 accent-crimson-500" />
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-slate-200">Possui alergia</p>
                    <p className="text-xs text-stone-400 dark:text-slate-500">Alimentar, medicamentosa, ambiental, etc.</p>
                  </div>
                </label>

                {possuiAlergia && (
                  <Field label="Descreva as alergias" error={errors.alergias?.message}>
                    <textarea
                      {...register('alergias')}
                      rows={3}
                      placeholder="Ex: Amendoim, dipirona, pólen…"
                      className="input-base resize-none"
                    />
                  </Field>
                )}
              </div>

              <Field label="Medicamentos em uso" hint="Liste os medicamentos que o aluno usa regularmente">
                <textarea
                  {...register('medicamentosUso')}
                  rows={3}
                  placeholder="Ex: Ritalina 10mg (1x ao dia), Ventolin (se necessário)…"
                  className="input-base resize-none"
                />
              </Field>

              <Field label="Condições de saúde especiais" hint="Diagnósticos, deficiências, necessidades especiais">
                <textarea
                  {...register('condicoesEspeciais')}
                  rows={3}
                  placeholder="Ex: TDAH, asma, deficiência auditiva leve…"
                  className="input-base resize-none"
                />
              </Field>
            </div>

            {/* Card: Observações */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4 dark:border-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-amber-500 dark:text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-800 dark:text-slate-200">Observações Médicas</h2>
                  <p className="text-xs text-stone-400 dark:text-slate-500">Informações complementares para a escola</p>
                </div>
              </div>

              <Field label="Observações médicas" hint="Informações adicionais relevantes para a escola">
                <textarea
                  {...register('observacoesMedicas')}
                  rows={6}
                  placeholder="Ex: não pode praticar atividades físicas intensas, deve usar protetor solar, restrições alimentares específicas…"
                  className="input-base resize-none"
                />
              </Field>

              {/* Info */}
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-900/10">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  As informações médicas são confidenciais e utilizadas apenas para garantir o bem-estar do aluno.
                </p>
              </div>
            </div>
          </div>
        )}

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
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {activeTab === 'medica' && (
              <button type="button" onClick={() => setActiveTab('dados')} className="btn-secondary">
                ← Dados do Aluno
              </button>
            )}
            {activeTab === 'dados' && (
              <button type="button" onClick={() => setActiveTab('medica')} className="btn-secondary">
                Ficha Médica →
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
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
        </div>
      </form>
    </div>
  );
}
