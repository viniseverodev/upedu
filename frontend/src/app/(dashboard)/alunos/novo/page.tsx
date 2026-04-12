// Cadastro de aluno — S012 (Sprint 4)

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { createAlunoSchema, type CreateAlunoInput } from '@/schemas/index';

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

export default function NovoAlunoPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAlunoInput>({
    resolver: zodResolver(createAlunoSchema),
    defaultValues: { status: 'PRE_MATRICULA' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateAlunoInput) => api.post('/alunos', data),
    onSuccess: () => setCreated(true),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar aluno.');
    },
  });

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl bg-white p-8 shadow-sm text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Aluno cadastrado!</h2>
          <p className="text-sm text-gray-500">
            O aluno foi registrado com status Pré-Matrícula.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/alunos/novo')}
              className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cadastrar outro
            </button>
            <button
              onClick={() => router.push('/alunos')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ver lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Aluno</h1>
        <p className="mt-1 text-sm text-gray-500">Campos obrigatórios incluem consentimento parental (LGPD Art. 14).</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })}
          noValidate
          className="space-y-4"
        >
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} className={inputClass(!!errors.nome)} placeholder="Ex: Maria da Silva" />
          </Field>

          <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
            <input
              {...register('dataNascimento')}
              type="date"
              className={inputClass(!!errors.dataNascimento)}
            />
          </Field>

          <Field label="Turno" error={errors.turno?.message}>
            <select {...register('turno')} className={inputClass(!!errors.turno)}>
              <option value="">Selecione...</option>
              <option value="INTEGRAL">Integral</option>
              <option value="MEIO_TURNO">Meio Turno</option>
            </select>
          </Field>

          <Field label="Situação" error={errors.status?.message}>
            <select {...register('status')} className={inputClass(!!errors.status)}>
              <option value="PRE_MATRICULA">Pré-Matrícula</option>
              <option value="LISTA_ESPERA">Lista de Espera</option>
            </select>
          </Field>

          <Field label="Observações" error={errors.observacoes?.message}>
            <textarea
              {...register('observacoes')}
              rows={3}
              className={inputClass(!!errors.observacoes)}
              placeholder="Informações adicionais (opcional)"
            />
          </Field>

          {/* Consentimento parental LGPD */}
          <div className={`rounded-md border p-3 ${errors.consentimentoResponsavel ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                value="true"
                {...register('consentimentoResponsavel', { setValueAs: (v) => v === true || v === 'true' })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">
                Confirmo que o responsável legal forneceu <strong>consentimento parental</strong> para o cadastro e tratamento de dados desta criança, conforme exigido pela{' '}
                <strong>LGPD Art. 14</strong>.
              </span>
            </label>
            {errors.consentimentoResponsavel && (
              <p className="mt-1 text-xs text-red-600">{errors.consentimentoResponsavel.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Cadastrando...' : 'Cadastrar aluno'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/alunos')}
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
