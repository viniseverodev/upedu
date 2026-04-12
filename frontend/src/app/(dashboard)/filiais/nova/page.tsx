// Cadastro de filial — S006 (Sprint 2)

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { createFilialSchema, type CreateFilialInput } from '@/schemas/index';

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

export default function NovaFilialPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFilialInput>({
    resolver: zodResolver(createFilialSchema),
    defaultValues: { diaVencimento: 10 },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateFilialInput) => api.post('/filiais', data),
    onSuccess: () => router.push('/filiais'),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar filial.');
    },
  });

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Filial</h1>
        <p className="mt-1 text-sm text-gray-500">Preencha os dados da nova unidade.</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit((d) => { setServerError(null); mutation.mutate(d); })} noValidate className="space-y-4">
          <Field label="Nome da filial" error={errors.nome?.message}>
            <input
              {...register('nome')}
              className={inputClass(!!errors.nome)}
              placeholder="Ex: Filial Centro"
            />
          </Field>

          <Field label="CNPJ" error={errors.cnpj?.message}>
            <input
              {...register('cnpj')}
              className={inputClass(!!errors.cnpj)}
              placeholder="XX.XXX.XXX/XXXX-XX"
              maxLength={18}
            />
          </Field>

          <Field label="Dia de vencimento (1–28)" error={errors.diaVencimento?.message}>
            <select {...register('diaVencimento')} className={inputClass(!!errors.diaVencimento)}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mensalidade integral (R$)" error={errors.valorMensalidadeIntegral?.message}>
            <input
              {...register('valorMensalidadeIntegral')}
              type="number"
              step="0.01"
              min="0"
              className={inputClass(!!errors.valorMensalidadeIntegral)}
              placeholder="1200.00"
            />
          </Field>

          <Field label="Mensalidade meio turno (R$)" error={errors.valorMensalidadeMeioTurno?.message}>
            <input
              {...register('valorMensalidadeMeioTurno')}
              type="number"
              step="0.01"
              min="0"
              className={inputClass(!!errors.valorMensalidadeMeioTurno)}
              placeholder="700.00"
            />
          </Field>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Salvando...' : 'Cadastrar filial'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/filiais')}
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
