// Transações financeiras — S027

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { createTransacaoSchema, createCategoriaSchema, type CreateTransacaoInput, type CreateCategoriaInput } from '@/schemas/index';

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
}

interface Transacao {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  dataTransacao: string;
  categoria: { nome: string; tipo: string };
}

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function TransacoesPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: transacoes = [], isLoading } = useQuery<Transacao[]>({
    queryKey: ['transacoes', mes, ano],
    queryFn: () => api.get(`/transacoes?mes=${mes}&ano=${ano}`).then((r) => r.data),
  });

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTransacaoInput>({
    resolver: zodResolver(createTransacaoSchema),
    defaultValues: { dataTransacao: now.toISOString().split('T')[0] },
  });

  const transacaoMutation = useMutation({
    mutationFn: (data: CreateTransacaoInput) => api.post('/transacoes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      setShowTransacaoModal(false);
      reset();
      setServerError(null);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setServerError(error.response?.data?.message ?? 'Erro ao registrar transação.');
    },
  });

  const {
    register: registerCat,
    handleSubmit: handleCat,
    reset: resetCat,
    formState: { errors: errorsCat },
  } = useForm<CreateCategoriaInput>({ resolver: zodResolver(createCategoriaSchema) });

  const categoriaMutation = useMutation({
    mutationFn: (data: CreateCategoriaInput) => api.post('/categorias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      setShowCategoriaModal(false);
      resetCat();
    },
  });

  const totalEntradas = transacoes.filter((t) => t.tipo === 'ENTRADA').reduce((s, t) => s + t.valor, 0);
  const totalSaidas = transacoes.filter((t) => t.tipo === 'SAIDA').reduce((s, t) => s + t.valor, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <div className="flex items-center gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            min={2020}
            className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => setShowCategoriaModal(true)}
            className="rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Categorias
          </button>
          <button
            onClick={() => { setShowTransacaoModal(true); setServerError(null); }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nova Transação
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-green-50 p-4 text-center">
          <p className="text-xs text-green-600 font-medium">Entradas</p>
          <p className="text-xl font-bold text-green-700">
            {totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-xl bg-red-50 p-4 text-center">
          <p className="text-xs text-red-600 font-medium">Saídas</p>
          <p className="text-xl font-bold text-red-700">
            {totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className={`rounded-xl p-4 text-center ${totalEntradas - totalSaidas >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <p className={`text-xs font-medium ${totalEntradas - totalSaidas >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Saldo</p>
          <p className={`text-xl font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {(totalEntradas - totalSaidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : transacoes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
          Nenhuma transação em {MESES[mes]}/{ano}.
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transacoes.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.dataTransacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.descricao}</td>
                  <td className="px-4 py-3 text-gray-600">{t.categoria.nome}</td>
                  <td className={`px-4 py-3 text-right font-medium ${t.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}`}>
                    {t.tipo === 'ENTRADA' ? '+' : '-'}
                    {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nova Transação */}
      {showTransacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Transação</h2>
            <form
              onSubmit={handleSubmit((d) => { setServerError(null); transacaoMutation.mutate(d); })}
              noValidate
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  {...register('tipo')}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${errors.tipo ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="ENTRADA">Entrada (Receita)</option>
                  <option value="SAIDA">Saída (Despesa)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <select
                  {...register('categoriaId')}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${errors.categoriaId ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>
                  ))}
                </select>
                {errors.categoriaId && (
                  <p className="mt-1 text-xs text-red-600">{errors.categoriaId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  {...register('descricao')}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${errors.descricao ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.descricao && (
                  <p className="mt-1 text-xs text-red-600">{errors.descricao.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('valor', { valueAsNumber: true })}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${errors.valor ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.valor && (
                    <p className="mt-1 text-xs text-red-600">{errors.valor.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data</label>
                  <input
                    type="date"
                    {...register('dataTransacao')}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${errors.dataTransacao ? 'border-red-400' : 'border-gray-300'}`}
                  />
                </div>
              </div>

              {serverError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={transacaoMutation.isPending}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {transacaoMutation.isPending ? 'Salvando...' : 'Registrar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowTransacaoModal(false); reset(); setServerError(null); }}
                  className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {showCategoriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Categoria</h2>
            <form
              onSubmit={handleCat((d) => categoriaMutation.mutate(d))}
              noValidate
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  {...registerCat('nome')}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${errorsCat.nome ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errorsCat.nome && (
                  <p className="mt-1 text-xs text-red-600">{errorsCat.nome.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  {...registerCat('tipo')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="RECEITA">Receita</option>
                  <option value="DESPESA">Despesa</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={categoriaMutation.isPending}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {categoriaMutation.isPending ? 'Salvando...' : 'Criar Categoria'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCategoriaModal(false); resetCat(); }}
                  className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>

            {/* Lista de categorias existentes */}
            {categorias.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Categorias existentes:</p>
                <ul className="space-y-1">
                  {categorias.map((c) => (
                    <li key={c.id} className="text-sm text-gray-700 flex justify-between">
                      <span>{c.nome}</span>
                      <span className={`text-xs ${c.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>{c.tipo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
