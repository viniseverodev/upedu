// Cadastro de responsável — S018 (Sprint 5)
// CPF com máscara e validação módulo 11

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import api from '@/lib/api';
import { createResponsavelSchema, type CreateResponsavelInput } from '@/schemas/index';

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Máscara de CPF: 000.000.000-00
function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function NovoResponsavelPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateResponsavelInput>({
    resolver: zodResolver(createResponsavelSchema),
  });

  // Desestrutura o onChange do register para encadear com a máscara
  const { onChange: cpfOnChange, ...cpfRest } = register('cpf');

  const mutation = useMutation({
    mutationFn: (data: CreateResponsavelInput) => api.post('/responsaveis', data),
    onSuccess: (res) => router.push(`/responsaveis/${res.data.id}`),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao cadastrar responsável.');
    },
  });

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Responsável</h1>
        <p className="mt-1 text-sm text-gray-500">
          CPF e RG são criptografados (LGPD Art. 46).
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit((d) => {
            setServerError(null);
            mutation.mutate(d);
          })}
          noValidate
          className="space-y-4"
        >
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} className={inputClass(!!errors.nome)} />
          </Field>

          <Field
            label="CPF"
            error={errors.cpf?.message}
            hint="Formato: 000.000.000-00 (opcional)"
          >
            <input
              {...cpfRest}
              placeholder="000.000.000-00"
              maxLength={14}
              className={inputClass(!!errors.cpf)}
              onChange={(e) => {
                const masked = maskCpf(e.target.value);
                e.target.value = masked;
                setValue('cpf', masked, { shouldValidate: false });
                // Encadeia com o onChange do register para manter o estado interno do RHF
                cpfOnChange(e);
              }}
            />
          </Field>

          <Field label="RG" error={errors.rg?.message} hint="Opcional">
            <input {...register('rg')} className={inputClass(!!errors.rg)} />
          </Field>

          <Field label="Telefone" error={errors.telefone?.message}>
            <input {...register('telefone')} placeholder="(11) 99999-9999" className={inputClass(!!errors.telefone)} />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" className={inputClass(!!errors.email)} />
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
              {mutation.isPending ? 'Salvando...' : 'Cadastrar Responsável'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/responsaveis')}
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
