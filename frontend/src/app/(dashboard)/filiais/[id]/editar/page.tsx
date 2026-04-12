// Edição de filial — S007 (Sprint 2)

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { updateFilialSchema, type UpdateFilialInput } from '@/schemas/index';

interface Filial {
  id: string;
  nome: string;
  cnpj: string;
  diaVencimento: number;
  valorMensalidadeIntegral: string;
  valorMensalidadeMeioTurno: string;
  ativo: boolean;
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
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function EditarFilialPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const { data: filial, isLoading } = useQuery<Filial>({
    queryKey: ['filial', id],
    queryFn: () =>
      api.get('/filiais').then((r) => {
        const list: Filial[] = r.data;
        const found = list.find((f) => f.id === id);
        if (!found) throw new Error('Filial não encontrada');
        return found;
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateFilialInput>({
    resolver: zodResolver(updateFilialSchema),
  });

  useEffect(() => {
    if (filial) {
      reset({
        nome: filial.nome,
        cnpj: filial.cnpj,
        diaVencimento: filial.diaVencimento,
        valorMensalidadeIntegral: Number(filial.valorMensalidadeIntegral),
        valorMensalidadeMeioTurno: Number(filial.valorMensalidadeMeioTurno),
        ativo: filial.ativo,
      });
    }
  }, [filial, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateFilialInput) => api.patch(`/filiais/${id}`, data),
    onSuccess: () => router.push('/filiais'),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao atualizar filial.');
    },
  });

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`;

  if (isLoading) {
    return <div className="text-center text-gray-400 py-12">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Filial</h1>
        <p className="mt-1 text-sm text-gray-500">{filial?.nome}</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit((d) => {
            setServerError(null);
            // Confirmação para desativação
            if (d.ativo === false && filial?.ativo === true) {
              setShowDeactivateConfirm(true);
              return;
            }
            mutation.mutate(d);
          })}
          noValidate
          className="space-y-4"
        >
          <Field label="Nome da filial" error={errors.nome?.message}>
            <input {...register('nome')} className={inputClass(!!errors.nome)} />
          </Field>

          <Field label="CNPJ" error={errors.cnpj?.message}>
            <input {...register('cnpj')} className={inputClass(!!errors.cnpj)} maxLength={18} />
          </Field>

          <Field label="Dia de vencimento" error={errors.diaVencimento?.message}>
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
            />
          </Field>

          <Field label="Mensalidade meio turno (R$)" error={errors.valorMensalidadeMeioTurno?.message}>
            <input
              {...register('valorMensalidadeMeioTurno')}
              type="number"
              step="0.01"
              min="0"
              className={inputClass(!!errors.valorMensalidadeMeioTurno)}
            />
          </Field>

          {/* Toggle de ativação */}
          <div className="flex items-center gap-3 rounded-md border p-3">
            <input
              {...register('ativo')}
              type="checkbox"
              id="ativo"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700">
              Filial ativa
            </label>
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          {/* Modal de confirmação para desativação */}
          {showDeactivateConfirm && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">
                Tem certeza que deseja desativar esta filial?
              </p>
              <p className="mt-1 text-xs text-yellow-700">
                A filial deixará de aparecer para seleção. Alunos ativos impedirão a desativação.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeactivateConfirm(false); mutation.mutate({ ativo: false }); }}
                  className="rounded bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
                >
                  Confirmar desativação
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(false)}
                  className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
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
