// Edição de aluno — S013 (Sprint 4)

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { updateAlunoSchema, type UpdateAlunoInput } from '@/schemas/index';

interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  turno: string;
  status: string;
  observacoes: string | null;
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

export default function EditarAlunoPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showInativarConfirm, setShowInativarConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<UpdateAlunoInput | null>(null);

  const { data: aluno, isLoading } = useQuery<Aluno>({
    queryKey: ['aluno-edit', id],
    queryFn: () => api.get(`/alunos/${id}`).then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateAlunoInput>({
    resolver: zodResolver(updateAlunoSchema),
  });

  useEffect(() => {
    if (aluno) {
      reset({
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento.slice(0, 10),
        turno: aluno.turno as UpdateAlunoInput['turno'],
        status: aluno.status as UpdateAlunoInput['status'],
        observacoes: aluno.observacoes ?? undefined,
      });
    }
  }, [aluno, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateAlunoInput) => api.patch(`/alunos/${id}`, data),
    onSuccess: () => router.push(`/alunos/${id}`),
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao atualizar aluno.');
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
        <h1 className="text-2xl font-bold text-gray-900">Editar Aluno</h1>
        <p className="mt-1 text-sm text-gray-500">{aluno?.nome}</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit((d) => {
            setServerError(null);
            if (d.status === 'INATIVO' && aluno?.status !== 'INATIVO') {
              setPendingData(d);
              setShowInativarConfirm(true);
              return;
            }
            mutation.mutate(d);
          })}
          noValidate
          className="space-y-4"
        >
          <Field label="Nome completo" error={errors.nome?.message}>
            <input {...register('nome')} className={inputClass(!!errors.nome)} />
          </Field>

          <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
            <input {...register('dataNascimento')} type="date" className={inputClass(!!errors.dataNascimento)} />
          </Field>

          <Field label="Turno" error={errors.turno?.message}>
            <select {...register('turno')} className={inputClass(!!errors.turno)}>
              <option value="INTEGRAL">Integral</option>
              <option value="MEIO_TURNO">Meio Turno</option>
            </select>
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')} className={inputClass(!!errors.status)}>
              <option value="PRE_MATRICULA">Pré-Matrícula</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="LISTA_ESPERA">Lista de Espera</option>
            </select>
          </Field>

          <Field label="Observações" error={errors.observacoes?.message}>
            <textarea {...register('observacoes')} rows={3} className={inputClass(!!errors.observacoes)} />
          </Field>

          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          {/* Confirmação de inativação */}
          {showInativarConfirm && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">
                Inativar este aluno?
              </p>
              <p className="mt-1 text-xs text-yellow-700">
                A matrícula ativa será encerrada e mensalidades pendentes serão canceladas.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowInativarConfirm(false); mutation.mutate(pendingData ?? { status: 'INATIVO' }); }}
                  className="rounded bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
                >
                  Confirmar inativação
                </button>
                <button
                  type="button"
                  onClick={() => setShowInativarConfirm(false)}
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
              onClick={() => router.push(`/alunos/${id}`)}
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
